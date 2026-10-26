import express from "express";
import { leerConfigLegal } from "./config.js";
import { paginaTerminos } from "./terminos.js";
import { paginaPrivacidad } from "./privacidad.js";

// Páginas legales del gateway: /terminos y /privacidad. Son estáticas (sin scripts) y sus enlaces son relativos, así
// que funcionan con cualquier BASE_PATH. Con barra final se redirige a la ruta sin barra, para que los enlaces
// relativos ("privacidad", "./") resuelvan bien.
export function crearLegal({ env = process.env, avisar = console.warn } = {}) {
  const cfg = leerConfigLegal(env);
  if (cfg.faltantes.length)
    avisar(`[legal] faltan variables para los textos legales: ${cfg.faltantes.join(", ")}. Las páginas muestran un aviso de «pendiente de configurar».`);

  const paginas = { terminos: paginaTerminos(cfg), privacidad: paginaPrivacidad(cfg) };
  const router = express.Router();

  for (const [ruta, html] of Object.entries(paginas)) {
    router.get(`/${ruta}`, (req, res) => {
      const [path, consulta] = req.originalUrl.split("?");
      if (path.endsWith("/")) return res.redirect(301, path.replace(/\/+$/, "") + (consulta ? "?" + consulta : ""));
      res.set({
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
        // Solo estilos en línea: la página no tiene scripts, imágenes ni formularios.
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      });
      res.type("html").send(html);
    });
  }
  return router;
}
