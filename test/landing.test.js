import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { crearLanding } from "../src/landing/index.js";

function levantar(base) {
  const app = express();
  const gateway = express.Router();
  gateway.use(crearLanding());
  gateway.get("/servidor", (req, res) => res.json({ status: "ok" }));
  app.use(base, gateway);
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function pedir(server, ruta) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ port, path: ruta }, (res) => {
      let cuerpo = "";
      res.on("data", (d) => (cuerpo += d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, cuerpo }));
    }).on("error", reject);
  });
}

test("sirve el landing en la raíz con enlace a la cuenta", async () => {
  const server = await levantar("/");
  try {
    const r = await pedir(server, "/");
    assert.equal(r.status, 200);
    assert.match(r.headers["content-type"], /html/);
    assert.match(r.cuerpo, /href="cuenta\/"/);
    assert.match(r.cuerpo, /lang="es"/);
  } finally {
    server.close();
  }
});

test("no tapa otras rutas del gateway", async () => {
  const server = await levantar("/");
  try {
    const r = await pedir(server, "/servidor");
    assert.equal(r.status, 200);
    assert.match(r.cuerpo, /ok/);
  } finally {
    server.close();
  }
});

test("con BASE_PATH sin barra final redirige para que los enlaces relativos funcionen", async () => {
  const server = await levantar("/mi");
  try {
    const r = await pedir(server, "/mi?x=1");
    assert.equal(r.status, 302);
    assert.equal(r.headers.location, "/mi/?x=1");
    const ok = await pedir(server, "/mi/");
    assert.equal(ok.status, 200);
  } finally {
    server.close();
  }
});

test("la página no usa recursos externos", async () => {
  const server = await levantar("/");
  try {
    const r = await pedir(server, "/");
    assert.doesNotMatch(r.cuerpo, /https?:\/\//);
  } finally {
    server.close();
  }
});
