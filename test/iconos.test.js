import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync } from "node:fs";
import express from "express";
import { crearIconos } from "../src/iconos/index.js";
import { crearLanding } from "../src/landing/index.js";

function levantar() {
  const app = express();
  app.use(crearIconos());
  app.use("/", crearLanding());
  return new Promise((ok) => { const s = app.listen(0, () => ok(s)); });
}
function pedir(server, ruta) {
  return new Promise((resolve, reject) => {
    http.get({ port: server.address().port, path: ruta }, (res) => {
      const trozos = [];
      res.on("data", (d) => trozos.push(d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, cuerpo: Buffer.concat(trozos) }));
    }).on("error", reject);
  });
}

test("sirve el favicon y los íconos con su tipo y caché", async () => {
  const server = await levantar();
  try {
    for (const [ruta, tipo] of [["/favicon.ico", /image\/(x-icon|vnd\.microsoft\.icon)/], ["/favicon-32.png", /image\/png/], ["/icon-192.png", /image\/png/], ["/icon-512.png", /image\/png/], ["/apple-touch-icon.png", /image\/png/]]) {
      const r = await pedir(server, ruta);
      assert.equal(r.status, 200, ruta);
      assert.match(r.headers["content-type"], tipo, ruta);
      assert.match(r.headers["cache-control"], /max-age=\d+/, ruta);
      assert.ok(r.cuerpo.length > 500, ruta);
    }
    const png = (await pedir(server, "/favicon-32.png")).cuerpo;
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 32); // ancho
    const ico = (await pedir(server, "/favicon.ico")).cuerpo;
    assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]); // cabecera .ico
    assert.equal((await pedir(server, "/favicon.svg")).status, 404);
  } finally { server.close(); }
});

test("el landing declara el ícono con rutas que existen", async () => {
  const server = await levantar();
  try {
    const html = (await pedir(server, "/")).cuerpo.toString();
    for (const m of html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)) {
      assert.equal((await pedir(server, "/" + m[1])).status, 200, m[1]);
    }
    assert.match(html, /rel="icon"/);
  } finally { server.close(); }
});

test("los archivos del ícono no se pasaron de tamaño", () => {
  for (const f of ["favicon.ico", "favicon-32.png", "icon-192.png", "icon-512.png", "apple-touch-icon.png"]) {
    assert.ok(readFileSync(new URL(`../src/iconos/${f}`, import.meta.url)).length < 200_000, f);
  }
});
