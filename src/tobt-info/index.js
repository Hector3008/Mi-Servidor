import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerConfigLegal } from "../legal/config.js";
import { paginaTobtInfo } from "./pagina.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));

// Página de presentación de tobt: `/tobt/info` (y sus capturas en `/tobt/info/img/…`). Estática y sin scripts. Hay que montarla
// ANTES de `/tobt` (el servicio), que si no responde 404 a esa ruta. Con barra final se redirige a la ruta sin barra para que los
// enlaces relativos resuelvan bien. El correo de contacto sale de LEGAL_CORREO.
export function crearTobtInfo({ env = process.env } = {}) {
  const html = paginaTobtInfo(leerConfigLegal(env));
  const router = express.Router();
  const cabeceras = {
    "X-Content-Type-Options": "nosniff",
    // Solo estilos en línea e imágenes propias: sin scripts, formularios ni recursos externos.
    "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  };

  router.get("/tobt/info", (req, res) => {
    const [ruta, consulta] = req.originalUrl.split("?");
    if (ruta.endsWith("/")) return res.redirect(301, ruta.replace(/\/+$/, "") + (consulta ? "?" + consulta : ""));
    res.set({ ...cabeceras, "Cache-Control": "public, max-age=300" });
    res.type("html").send(html);
  });
  router.use(
    "/tobt/info/img",
    express.static(path.join(aqui, "img"), {
      index: false,
      dotfiles: "ignore",
      maxAge: "7d",
      setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
    }),
  );
  return router;
}
