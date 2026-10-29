import express from "express";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { leerConfigLegal } from "../legal/config.js";
import { esc } from "../legal/plantilla.js";
import { crearLimite } from "../solicitudes/limite.js";
import { crearAcciones } from "../solicitudes/acciones.js";
import { leerConfigSolicitudes } from "../solicitudes/index.js";
import { correoDeAccesoReenviado, correoDeEntradaOperador } from "../solicitudes/correos.js";
import { paginaAprobada, paginaNoDisponible, paginaRechazada } from "../solicitudes/paginas.js";
import { paginaConfirmarEntrada, paginaEmpresas, paginaEntrar, paginaMensajeOperador, paginaResultado, paginaSolicitudes } from "./paginas.js";

// Pantalla de operador (5.66), bajo /operador. Solo la persona que controla OPERADOR_CORREO entra: pide un enlace, le llega
// SOLO a ese correo (la página no recibe ninguna dirección), el enlace sirve una vez y dentro de 15 minutos, y abre una sesión
// de 8 horas. Sesiones y enlaces viven en memoria: si el servidor se reinicia hay que pedir otro enlace (es lo esperado).
//   Solicitudes   pendientes / historial; aprobar o rechazar
//   Empresas      lista con administradores; suspender o reactivar; reenviar el acceso a un administrador
// Defensas: cookie HttpOnly + SameSite=Strict (+ Secure con https), token CSRF por sesión en cada formulario, enlaces y
// sesiones guardados solo como hash, abrir el enlace del correo NO inicia sesión (hay que pulsar un botón: un escáner de
// enlaces no lo gasta), topes por IP y global para pedir enlaces, CSP sin scripts, nada se cachea.

export const VIGENCIA_ENLACE_MS = 15 * 60 * 1000;
export const VIGENCIA_SESION_MS = 8 * 60 * 60 * 1000;
const COOKIE = "operador";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const hash = (t) => createHash("sha256").update(t).digest("hex");
const nuevoToken = () => randomBytes(32).toString("base64url");
const igual = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const esErrorSolicitud = (e) => e?.name === "ErrorSolicitud";

export function crearOperador({ core, correo, env = process.env, avisar = console.warn, ahora = () => Date.now(), limitePorIp, limiteGlobal } = {}) {
  const cfgLegal = leerConfigLegal(env);
  const cfg = { ...leerConfigSolicitudes(env), correoListo: !!correo?.configurado };
  const habilitado = !!core?.solicitudes?.listar && cfg.correoListo && !cfg.faltantes.length;
  if (!habilitado) avisar("[operador] pantalla de operador desactivada: falta URL_PUBLICA, OPERADOR_CORREO, RESEND_API_KEY o CORREO_REMITENTE.");
  const https = cfg.urlPublica.startsWith("https://");
  const acciones = crearAcciones({ core, correo, cfg, cfgLegal, avisar });

  const enlaces = new Map(); // hash(token) → expira
  const sesiones = new Map(); // hash(token) → { expira, csrf }
  const porIp = limitePorIp ?? crearLimite({ max: 3, ventanaMs: 60 * 60 * 1000 });
  const global = limiteGlobal ?? crearLimite({ max: 6, ventanaMs: 60 * 60 * 1000 });
  const barrer = () => {
    const t = ahora();
    for (const [k, e] of enlaces) if (e <= t) enlaces.delete(k);
    for (const [k, s] of sesiones) if (s.expira <= t) sesiones.delete(k);
  };

  const router = express.Router();
  const formulario = express.urlencoded({ extended: false, limit: "4kb", parameterLimit: 10 });
  const pag = (req) => ({ cfg: cfgLegal, base: req.baseUrl });
  const enviar = (res, status, html) => res.status(status).type("html").send(html);

  router.use("/operador", (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    });
    if (!habilitado) return enviar(res, 503, paginaNoDisponible(pag(req)));
    next();
  });

  // ---------- sesión ----------
  function leerCookie(req) {
    const m = /(?:^|;\s*)operador=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie ?? "");
    return m ? m[1] : null;
  }
  function sesionDe(req) {
    const t = leerCookie(req);
    if (!t) return null;
    const s = sesiones.get(hash(t));
    if (!s || s.expira <= ahora()) return null;
    return { ...s, clave: hash(t) };
  }
  const poner = (req, res, valor, maxAge) =>
    res.append("Set-Cookie", `${COOKIE}=${valor}; Path=${req.baseUrl}/operador; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${https ? "; Secure" : ""}`);

  /** Exige sesión; en POST, además el token CSRF. Si falla, manda a la entrada (GET) o responde 403 (POST). */
  function exigir(req, res, next) {
    const s = sesionDe(req);
    if (!s) {
      if (req.method === "GET") return res.redirect(303, `${req.baseUrl}/operador`);
      return enviar(res, 401, paginaMensajeOperador({ ...pag(req), titulo: "Sesión vencida", texto: "Tu sesión venció. Vuelve a entrar.", enlace: { href: `${req.baseUrl}/operador`, texto: "Entrar" } }));
    }
    if (req.method === "POST" && !igual(req.body?._csrf, s.csrf)) {
      return enviar(res, 403, paginaMensajeOperador({ ...pag(req), titulo: "Solicitud no válida", texto: "No se pudo comprobar el formulario. Recarga la página e inténtalo de nuevo." }));
    }
    req.operador = s;
    next();
  }

  // ---------- entrar ----------
  router.get("/operador", (req, res) => {
    if (sesionDe(req)) return res.redirect(303, `${req.baseUrl}/operador/solicitudes`);
    enviar(res, 200, paginaEntrar({ ...pag(req), enviado: req.query.enviado === "1" }));
  });

  router.post("/operador/entrar", formulario, async (req, res) => {
    // Siempre la misma respuesta; el correo va solo al operador configurado (esta página no recibe direcciones).
    const volver = () => res.redirect(303, `${req.baseUrl}/operador?enviado=1`);
    const espera = porIp.usar(req.ip ?? "?");
    if (espera) {
      res.set("Retry-After", String(espera));
      return enviar(res, 429, paginaEntrar({ ...pag(req), error: "Pediste varios enlaces seguidos. Espera un rato e inténtalo de nuevo." }));
    }
    volver();
    if (global.usar("global")) return;
    barrer();
    const token = nuevoToken();
    enlaces.set(hash(token), ahora() + VIGENCIA_ENLACE_MS);
    try {
      await correo.enviar({ para: cfg.operador, ...correoDeEntradaOperador({ plataforma: cfgLegal.plataforma, url: `${cfg.urlPublica}${req.baseUrl}/operador/acceso/${token}`, minutos: VIGENCIA_ENLACE_MS / 60000 }) });
    } catch (e) {
      enlaces.delete(hash(token));
      avisar(`[operador] no se pudo enviar el enlace de entrada: ${e?.message ?? e}`);
    }
  });

  const enlaceVigente = (token) => typeof token === "string" && TOKEN.test(token) && (enlaces.get(hash(token)) ?? 0) > ahora();

  router.get("/operador/acceso/:token", (req, res) => {
    if (!enlaceVigente(req.params.token)) return enviar(res, 404, paginaMensajeOperador({ ...pag(req), titulo: "Enlace no válido", texto: "Este enlace no existe, ya se usó o venció. Pide otro.", enlace: { href: `${req.baseUrl}/operador`, texto: "Pedir otro enlace" } }));
    enviar(res, 200, paginaConfirmarEntrada({ ...pag(req), token: req.params.token }));
  });

  router.post("/operador/acceso/:token", formulario, (req, res) => {
    const t = req.params.token;
    if (!enlaceVigente(t)) return enviar(res, 404, paginaMensajeOperador({ ...pag(req), titulo: "Enlace no válido", texto: "Este enlace no existe, ya se usó o venció. Pide otro.", enlace: { href: `${req.baseUrl}/operador`, texto: "Pedir otro enlace" } }));
    enlaces.delete(hash(t)); // un solo uso
    barrer();
    const sid = nuevoToken();
    sesiones.set(hash(sid), { expira: ahora() + VIGENCIA_SESION_MS, csrf: nuevoToken() });
    poner(req, res, sid, VIGENCIA_SESION_MS / 1000);
    res.redirect(303, `${req.baseUrl}/operador/solicitudes`);
  });

  router.post("/operador/salir", formulario, exigir, (req, res) => {
    sesiones.delete(req.operador.clave);
    poner(req, res, "", 0);
    res.redirect(303, `${req.baseUrl}/operador`);
  });

  // ---------- errores del núcleo ----------
  function fallo(req, res, e, volver) {
    if (esErrorSolicitud(e) && e.status < 500) {
      const texto = e.codigo === "ENLACE_INVALIDO" ? "No se encontró lo que buscabas (¿ya se resolvió?)." : `${e.message}.`;
      return enviar(res, e.status, paginaResultado({ ...pag(req), csrf: req.operador.csrf, titulo: "No se pudo hacer", cuerpo: `<p class="aviso malo" role="alert">${esc(texto)}</p>`, volver }));
    }
    avisar(`[operador] error inesperado: ${e?.message ?? e}`);
    return enviar(res, 500, paginaResultado({ ...pag(req), csrf: req.operador.csrf, titulo: "Algo salió mal", cuerpo: '<p class="aviso malo" role="alert">Ocurrió un error inesperado. Inténtalo de nuevo.</p>', volver }));
  }
  const VOLVER_SOL = { seccion: "solicitudes", nombre: "solicitudes" };
  const VOLVER_EMP = { seccion: "empresas", nombre: "empresas" };

  // ---------- solicitudes ----------
  router.get("/operador/solicitudes", exigir, async (req, res) => {
    const f = ["pendiente", "aprobada", "rechazada", "todas"].includes(req.query.estado) ? req.query.estado : "pendiente";
    try {
      const [filas, pendientes] = await Promise.all([core.solicitudes.listar({ estado: f === "todas" ? undefined : f, limite: 100 }), core.solicitudes.contarPendientes()]);
      enviar(res, 200, paginaSolicitudes({ ...pag(req), csrf: req.operador.csrf, filtro: f, filas, pendientes }));
    } catch (e) {
      fallo(req, res, e, VOLVER_SOL);
    }
  });

  router.post("/operador/solicitudes/:id/aprobar", formulario, exigir, async (req, res) => {
    let r;
    try {
      r = await core.solicitudes.aprobarPorId(req.params.id);
    } catch (e) {
      return fallo(req, res, e, VOLVER_SOL);
    }
    const hecho = await acciones.aprobar(r, req.baseUrl);
    const base = req.baseUrl;
    // La misma tarjeta que ve por correo, dentro del marco del operador.
    const html = paginaAprobada({ ...pag(req), urls: hecho.urls, r: hecho.r, correo: hecho.estado });
    enviar(res, 200, html.replace("</main>", `<p><a href="${esc(base)}/operador/solicitudes">Volver a solicitudes</a></p></main>`));
  });

  router.post("/operador/solicitudes/:id/rechazar", formulario, exigir, async (req, res) => {
    let s;
    try {
      s = await core.solicitudes.rechazarPorId(req.params.id);
    } catch (e) {
      return fallo(req, res, e, VOLVER_SOL);
    }
    const hecho = await acciones.rechazar(s);
    const html = paginaRechazada({ ...pag(req), r: { nombre: s.nombre }, correo: hecho.estado });
    enviar(res, 200, html.replace("</main>", `<p><a href="${esc(req.baseUrl)}/operador/solicitudes">Volver a solicitudes</a></p></main>`));
  });

  // ---------- empresas ----------
  router.get("/operador/empresas", exigir, async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.slice(0, 60) : "";
    try {
      enviar(res, 200, paginaEmpresas({ ...pag(req), csrf: req.operador.csrf, filas: await core.solicitudes.listarEmpresas({ texto: q, limite: 100 }), texto: q }));
    } catch (e) {
      fallo(req, res, e, VOLVER_EMP);
    }
  });

  router.post("/operador/empresas/:id/estado", formulario, exigir, async (req, res) => {
    const activa = req.body?.activa === "1" ? true : req.body?.activa === "0" ? false : null;
    if (activa === null) return fallo(req, res, Object.assign(new Error("valor inválido"), { name: "ErrorSolicitud", codigo: "DATOS_INVALIDOS", status: 400 }), VOLVER_EMP);
    try {
      await core.solicitudes.fijarActiva({ empresaId: req.params.id, activa });
    } catch (e) {
      return fallo(req, res, e, VOLVER_EMP);
    }
    enviar(res, 200, paginaResultado({ ...pag(req), csrf: req.operador.csrf, titulo: activa ? "Empresa reactivada" : "Empresa suspendida", volver: VOLVER_EMP, cuerpo: `<p class="aviso" role="status">${activa ? "La empresa volvió a funcionar como estaba." : "La empresa quedó suspendida: su carta pública deja de verse y sus sesiones se quedan sin permisos. No se borró nada."}</p>` }));
  });

  router.post("/operador/empresas/:id/reenviar", formulario, exigir, async (req, res) => {
    let r;
    try {
      r = await core.solicitudes.reenviarAcceso({ empresaId: req.params.id, usuarioId: String(req.body?.usuarioId ?? "") });
    } catch (e) {
      return fallo(req, res, e, VOLVER_EMP);
    }
    const url = `${cfg.urlPublica}${req.baseUrl}/acceso/${r.token}`;
    const empresa = r.empresa ?? "tu empresa";
    let cuerpo;
    try {
      await correo.enviar({ para: r.correo, ...correoDeAccesoReenviado({ plataforma: cfgLegal.plataforma, nombre: r.nombre, empresa, url, entrar: `${cfg.urlPublica}${req.baseUrl}/cuenta/` }), claveUnica: `reenvio-${hash(r.token).slice(0, 16)}` });
      cuerpo = `<p class="aviso" role="status">Le enviamos a <strong>${esc(r.correo)}</strong> un enlace nuevo para elegir su contraseña (un solo uso, vence en 14 días). Los enlaces anteriores dejaron de servir.</p>`;
    } catch (e) {
      avisar(`[operador] no se pudo reenviar el acceso: ${e?.message ?? e}`);
      cuerpo = `<p class="aviso malo" role="alert"><strong>No se pudo enviar el correo.</strong> Entrégale este enlace por un medio seguro (un solo uso, vence en 14 días):<br><code>${esc(url)}</code></p>`;
    }
    enviar(res, 200, paginaResultado({ ...pag(req), csrf: req.operador.csrf, titulo: "Acceso reenviado", volver: VOLVER_EMP, cuerpo }));
  });

  return router;
}
