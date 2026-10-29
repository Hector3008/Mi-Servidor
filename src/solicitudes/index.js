import express from "express";
import { leerConfigLegal, VERSION_PRIVACIDAD, VERSION_TERMINOS } from "../legal/config.js";
import { codigosSolicitables } from "./servicios.js";
import { crearLimite } from "./limite.js";
import { correoAlOperador } from "./correos.js";
import { crearAcciones } from "./acciones.js";
import {
  paginaAcceso, paginaAccesoListo, paginaAprobada, paginaEnviada, paginaFormulario, paginaMensaje, paginaNoDisponible, paginaRechazada, paginaRevision,
} from "./paginas.js";

// Crear una empresa con aprobación del operador (5.65):
//   GET/POST /crear-empresa        formulario público → correo al operador con un enlace
//   GET  /solicitud/:token         el operador revisa (abrir el enlace no cambia nada)
//   POST /solicitud/:token/aprobar | /rechazar
//   GET/POST /acceso/:token        la persona elige su contraseña con el enlace que le llega al aprobar
// Variables: URL_PUBLICA (origen de los enlaces de los correos, p. ej. https://www.ilnapo.com), OPERADOR_CORREO (quién aprueba),
// y las del correo (RESEND_API_KEY, CORREO_REMITENTE). Sin ellas la página dice «por ahora no recibimos solicitudes».

const CORREO = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,200}\.[^\s@<>"',;]{2,}$/;
const ORIGEN = /^https?:\/\/(?:[a-z0-9-]+\.)*[a-z0-9-]+(?::\d{2,5})?$/i;

export function leerConfigSolicitudes(env = process.env) {
  const url = typeof env.URL_PUBLICA === "string" ? env.URL_PUBLICA.trim().replace(/\/+$/, "") : "";
  const operador = typeof env.OPERADOR_CORREO === "string" ? env.OPERADOR_CORREO.trim() : "";
  const cfg = { urlPublica: ORIGEN.test(url) ? url : "", operador: CORREO.test(operador) ? operador : "" };
  cfg.faltantes = [];
  if (!cfg.urlPublica) cfg.faltantes.push("URL_PUBLICA");
  if (!cfg.operador) cfg.faltantes.push("OPERADOR_CORREO");
  return cfg;
}

const esErrorSolicitud = (e) => e?.name === "ErrorSolicitud"; // sin instanceof: no depende de qué copia del núcleo se cargó
const texto = (v, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");
const MENSAJES = {
  ENLACE_INVALIDO: ["Enlace no válido", "Este enlace no existe o ya se usó."],
  ENLACE_VENCIDO: ["Enlace vencido", "Este enlace venció. Pide uno nuevo."],
};

export function crearSolicitudes({ core, correo, env = process.env, avisar = console.warn, limiteEnvios, limiteAcceso } = {}) {
  const cfgLegal = leerConfigLegal(env);
  const cfg = { ...leerConfigSolicitudes(env), correoListo: !!correo?.configurado };
  const habilitado = !!core?.solicitudes && cfg.correoListo && !cfg.faltantes.length;
  if (!habilitado)
    avisar(`[solicitudes] «Crear empresa» desactivado: falta ${[...cfg.faltantes, ...(cfg.correoListo ? [] : ["RESEND_API_KEY y CORREO_REMITENTE"])].join(", ")}.`);

  const acciones = crearAcciones({ core, correo, cfg, cfgLegal, avisar });
  const enviosPorIp = limiteEnvios ?? crearLimite({ max: 5, ventanaMs: 60 * 60 * 1000 }); // solicitudes por IP y hora
  const accesosPorIp = limiteAcceso ?? crearLimite({ max: 30, ventanaMs: 15 * 60 * 1000 });
  const router = express.Router();
  const formulario = express.urlencoded({ extended: false, limit: "16kb", parameterLimit: 30 });

  router.use(["/crear-empresa", "/solicitud", "/acceso"], (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    });
    next();
  });

  const pag = (req) => ({ cfg: cfgLegal, base: req.baseUrl });
  const enviar = (res, status, html) => res.status(status).type("html").send(html);
  const ruta = (req, r) => `${cfg.urlPublica}${req.baseUrl}${r}`;
  const sinPlantilla = (req, res) => enviar(res, 503, paginaNoDisponible(pag(req)));

  // Los errores del núcleo con enlaces: una página clara, sin detalles internos.
  function errorDeEnlace(req, res, e) {
    if (esErrorSolicitud(e)) {
      const m = MENSAJES[e.codigo];
      if (m) return enviar(res, e.status, paginaMensaje({ ...pag(req), titulo: m[0], texto: m[1], malo: true }));
      if (["ESTADO_INVALIDO", "SLUG_OCUPADO", "CUENTA_SUSPENDIDA"].includes(e.codigo))
        return enviar(res, e.status, paginaMensaje({ ...pag(req), titulo: "No se pudo continuar", texto: `Esta solicitud no se puede continuar: ${e.message}.`, malo: true }));
    }
    avisar(`[solicitudes] error inesperado: ${e?.message ?? e}`);
    return enviar(res, 500, paginaMensaje({ ...pag(req), titulo: "Algo salió mal", texto: "Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.", malo: true }));
  }

  // ---------- formulario público ----------
  router.get("/crear-empresa", (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    if (req.query.enviada === "1") return enviar(res, 200, paginaEnviada(pag(req)));
    enviar(res, 200, paginaFormulario({ ...pag(req) }));
  });

  router.post("/crear-empresa", formulario, async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    const b = req.body ?? {};
    const v = {
      nombre: texto(b.nombre, 200), slug: texto(b.slug, 100), pais: texto(b.pais, 10), moneda: texto(b.moneda, 10),
      adminNombre: texto(b.adminNombre, 200), adminCorreo: texto(b.adminCorreo, 300), telefono: texto(b.telefono, 60),
      servicios: [].concat(b.servicios ?? []).filter((x) => typeof x === "string").slice(0, 10), acepto: b.acepto === "1",
    };
    const espera = enviosPorIp.usar(req.ip ?? "?");
    if (espera) {
      res.set("Retry-After", String(espera));
      return enviar(res, 429, paginaFormulario({ ...pag(req), v, general: "Enviaste varias solicitudes seguidas. Espera un rato e inténtalo de nuevo." }));
    }
    if (texto(b.sitio, 5)) return res.redirect(303, `${req.baseUrl}/crear-empresa?enviada=1`); // el campo trampa lo llenó un robot: se finge éxito
    let creada;
    try {
      creada = await core.solicitudes.crear({
        ...v,
        servicios: v.servicios,
        aceptoTerminos: v.acepto ? { terminos: VERSION_TERMINOS, privacidad: VERSION_PRIVACIDAD } : null,
        serviciosPermitidos: codigosSolicitables(),
      });
    } catch (e) {
      if (esErrorSolicitud(e) && e.status < 500) {
        const general = e.detalle?.campos ? "" : e.message;
        return enviar(res, e.status, paginaFormulario({ ...pag(req), v, campos: e.detalle?.campos ?? {}, general }));
      }
      avisar(`[solicitudes] no se pudo registrar una solicitud: ${e?.message ?? e}`);
      return enviar(res, 500, paginaFormulario({ ...pag(req), v, general: "No pudimos registrar tu solicitud. Inténtalo de nuevo en unos minutos." }));
    }
    try {
      const c = correoAlOperador({ plataforma: cfgLegal.plataforma, s: creada.solicitud, url: ruta(req, `/solicitud/${creada.token}`) });
      await correo.enviar({ para: cfg.operador, ...c, claveUnica: `solicitud-${creada.solicitud.id}` });
    } catch (e) {
      // Si el operador no se entera, la solicitud no sirve de nada y bloquearía el nombre y el correo: se cancela y se avisa.
      avisar(`[solicitudes] no se pudo avisar al operador (${e?.message ?? e}); se cancela la solicitud ${creada.solicitud.id}`);
      await core.solicitudes.rechazar(creada.token).catch(() => {});
      return enviar(res, 503, paginaFormulario({ ...pag(req), v, general: "No pudimos enviar tu solicitud en este momento. Inténtalo de nuevo en unos minutos." }));
    }
    res.redirect(303, `${req.baseUrl}/crear-empresa?enviada=1`);
  });

  // ---------- el operador ----------
  router.get("/solicitud/:token", async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    try {
      const s = await core.solicitudes.ver(req.params.token);
      enviar(res, 200, paginaRevision({ ...pag(req), token: req.params.token, s }));
    } catch (e) {
      errorDeEnlace(req, res, e);
    }
  });

  router.post("/solicitud/:token/aprobar", async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    let r;
    try {
      r = await core.solicitudes.aprobar(req.params.token);
    } catch (e) {
      return errorDeEnlace(req, res, e);
    }
    const hecho = await acciones.aprobar(r, req.baseUrl);
    enviar(res, 200, paginaAprobada({ ...pag(req), urls: hecho.urls, r: hecho.r, correo: hecho.estado }));
  });

  router.post("/solicitud/:token/rechazar", async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    let s;
    try {
      s = await core.solicitudes.ver(req.params.token);
      await core.solicitudes.rechazar(req.params.token);
    } catch (e) {
      return errorDeEnlace(req, res, e);
    }
    const hecho = await acciones.rechazar(s);
    enviar(res, 200, paginaRechazada({ ...pag(req), r: { nombre: s.nombre }, correo: hecho.estado }));
  });

  // ---------- elegir la contraseña ----------
  router.get("/acceso/:token", async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    try {
      enviar(res, 200, paginaAcceso({ ...pag(req), token: req.params.token, quien: await core.solicitudes.verAcceso(req.params.token) }));
    } catch (e) {
      errorDeEnlace(req, res, e);
    }
  });

  router.post("/acceso/:token", formulario, async (req, res) => {
    if (!habilitado) return sinPlantilla(req, res);
    const espera = accesosPorIp.usar(req.ip ?? "?");
    if (espera) {
      res.set("Retry-After", String(espera));
      return enviar(res, 429, paginaMensaje({ ...pag(req), titulo: "Demasiados intentos", texto: "Espera unos minutos e inténtalo de nuevo.", malo: true }));
    }
    try {
      const quien = await core.solicitudes.verAcceso(req.params.token);
      const { password, password2 } = req.body ?? {};
      const vuelve = (error) => enviar(res, 400, paginaAcceso({ ...pag(req), token: req.params.token, quien, error }));
      if (typeof password !== "string" || typeof password2 !== "string") return vuelve("Escribe tu contraseña dos veces.");
      if (password !== password2) return vuelve("Las dos contraseñas no coinciden.");
      try {
        await core.solicitudes.establecerPassword({ token: req.params.token, password });
      } catch (e) {
        if (esErrorSolicitud(e) && e.codigo === "DATOS_INVALIDOS") return vuelve(e.message);
        throw e;
      }
      enviar(res, 200, paginaAccesoListo({ ...pag(req), tipo: quien.tipo }));
    } catch (e) {
      errorDeEnlace(req, res, e);
    }
  });

  return router;
}
