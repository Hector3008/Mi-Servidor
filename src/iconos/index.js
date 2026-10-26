import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";

const aqui = path.dirname(fileURLToPath(import.meta.url));

// Ícono de la plataforma (favicon). Un solo juego para todas las páginas del gateway: los navegadores piden
// /favicon.ico en la raíz aunque la página no lo declare, así que las vistas de `cuenta` y `tobt` lo heredan sin
// tocar sus fronts. Los archivos se leen una vez al arrancar.
const ARCHIVOS = {
  "/favicon.ico": ["favicon.ico", "image/x-icon"],
  "/favicon-32.png": ["favicon-32.png", "image/png"],
  "/icon-192.png": ["icon-192.png", "image/png"],
  "/icon-512.png": ["icon-512.png", "image/png"],
  "/apple-touch-icon.png": ["apple-touch-icon.png", "image/png"],
};

export function crearIconos({ carpeta = aqui } = {}) {
  const router = express.Router();
  for (const [ruta, [archivo, tipo]] of Object.entries(ARCHIVOS)) {
    const datos = readFileSync(path.join(carpeta, archivo));
    router.get(ruta, (req, res) => {
      res.set("Cache-Control", "public, max-age=86400");
      res.set("X-Content-Type-Options", "nosniff");
      res.type(tipo).send(datos);
    });
  }
  return router;
}
