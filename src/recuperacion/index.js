import express from "express";
import { createHash } from "node:crypto";
import { leerConfigLegal } from "../legal/config.js";
import { crearLimite } from "../solicitudes/limite.js";
import { leerConfigSolicitudes } from "../solicitudes/index.js";
import { correoDeRecuperacion } from "../solicitudes/correos.js";
import { paginaNoDisponible, paginaRecuperar } from "../solicitudes/paginas.js";

// «¿Olvidaste tu contraseña?» (5.67):  GET/POST /recuperar  →  correo con un enlace de 1 hora a /acceso/:token.
// La respuesta es SIEMPRE la misma (exista o no la cuenta, esté suspendida o no, se haya enviado el correo o no): quien la
// pide no puede averiguar qué correos tienen cuenta. El trabajo (buscar, emitir el enlace, enviar) ocurre DESPUÉS de responder,
// para que ni el tiempo de respuesta delate nada. Variables: URL_PUBLICA y las del correo (RESEND_API_KEY, CORREO_REMITENTE).

const CORREO = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,200}\.[^\s@<>"',;]{2,}$/;
const huella = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

export function crearRecuperacion({ core, correo, env = process.env, avisar = console.warn, limitePorIp, limitePorCorreo } = {}) {
  const cfgLegal = leerConfigLegal(env);
  const { urlPublica } = leerConfigSolicitudes(env);
  const habilitado = !!core?.solicitudes?.solicitarRecuperacion && !!correo?.configurado && !!urlPublica;
  if (!habilitado) avisar("[recuperacion] «Olvidé mi contraseña» desactivado: falta URL_PUBLICA, RESEND_API_KEY o CORREO_REMITENTE.");

  const porIp = limitePorIp ?? crearLimite({ max: 5, ventanaMs: 15 * 60 * 1000 });
  const porCorreo = limitePorCorreo ?? crearLimite({ max: 3, ventanaMs: 60 * 60 * 1000 });
  const router = express.Router();
  const formulario = express.urlencoded({ extended: false, limit: "4kb", parameterLimit: 10 });

  router.use("/recuperar", (req, res, next) => {
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

  router.get("/recuperar", (req, res) => {
    if (!habilitado) return enviar(res, 503, paginaNoDisponible(pag(req)));
    enviar(res, 200, paginaRecuperar({ ...pag(req), enviada: req.query.enviada === "1" }));
  });

  router.post("/recuperar", formulario, async (req, res) => {
    if (!habilitado) return enviar(res, 503, paginaNoDisponible(pag(req)));
    const b = req.body ?? {};
    const c = typeof b.correo === "string" ? b.correo.trim().toLowerCase().slice(0, 300) : "";
    const espera = porIp.usar(req.ip ?? "?");
    if (espera) {
      res.set("Retry-After", String(espera));
      return enviar(res, 429, paginaRecuperar({ ...pag(req), correo: c, error: "Hiciste varios pedidos seguidos. Espera unos minutos e inténtalo de nuevo." }));
    }
    if (!CORREO.test(c) || c.length > 254) return enviar(res, 400, paginaRecuperar({ ...pag(req), correo: c, error: "Escribe un correo válido." }));
    // Misma respuesta siempre (también para el campo trampa y para el tope por correo).
    res.redirect(303, `${req.baseUrl}/recuperar?enviada=1`);
    if (typeof b.sitio === "string" && b.sitio) return;
    if (porCorreo.usar(c)) return; // el tope por correo evita que se use esta página para inundar la bandeja de otra persona
    try {
      const r = await core.solicitudes.solicitarRecuperacion({ correo: c });
      if (!r) return;
      const url = `${urlPublica}${req.baseUrl}/acceso/${r.token}`;
      await correo.enviar({ para: r.correo, ...correoDeRecuperacion({ plataforma: cfgLegal.plataforma, nombre: r.nombre, url }), claveUnica: `recuperacion-${huella(r.token)}` });
    } catch (e) {
      avisar(`[recuperacion] no se pudo procesar un pedido: ${e?.message ?? e}`);
    }
  });

  return router;
}
