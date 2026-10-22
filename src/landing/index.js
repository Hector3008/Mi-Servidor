import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";

const aqui = path.dirname(fileURLToPath(import.meta.url));

// Landing de la ruta raíz. Página estática y neutra (sin marca de ninguna
// empresa) que presenta la plataforma y enlaza a la cuenta. Los enlaces son
// relativos, así que funciona con cualquier BASE_PATH siempre que la página se
// sirva con barra final: sin ella se redirige.
export function crearLanding({ archivo } = {}) {
  const html = readFileSync(archivo ?? path.join(aqui, "index.html"), "utf8");
  const router = express.Router();

  router.get("/", (req, res) => {
    const [ruta, consulta] = req.originalUrl.split("?");
    if (!ruta.endsWith("/")) {
      return res.redirect(302, ruta + "/" + (consulta ? "?" + consulta : ""));
    }
    res.set("Cache-Control", "no-cache");
    res.type("html").send(html);
  });

  return router;
}
