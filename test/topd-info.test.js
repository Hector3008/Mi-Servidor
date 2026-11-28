// Página de presentación de topd : /topd/info, estática, sin scripts, con sus capturas y el correo de contacto.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { crearTopdInfo } from "../src/topd-info/index.js";
import { crearLanding } from "../src/landing/index.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const CON_CORREO = { LEGAL_CORREO: "hola@ejemplo.pe" };

function levantar(env, base = "/") {
  const app = express();
  const gateway = express.Router();
  gateway.use(crearLanding());
  gateway.use(crearTopdInfo({ env }));
  // El servicio topd responde 404 a lo que no conoce: la página tiene que ir antes.
  gateway.use("/topd", (req, res) => res.status(404).send("lo respondió el servicio"));
  app.use(base, gateway);
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}
function pedir(server, ruta) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get({ port, path: ruta }, (res) => {
      const trozos = [];
      res.on("data", (d) => trozos.push(d));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(trozos), cuerpo: Buffer.concat(trozos).toString("utf8") }));
    }).on("error", reject);
  });
}
async function con(env, fn, base) {
  const server = await levantar(env, base);
  try {
    await fn(server);
  } finally {
    server.close();
  }
}

test("la página responde antes que el servicio topd, con CSP estricta y sin scripts", async () => {
  await con(CON_CORREO, async (server) => {
    const r = await pedir(server, "/topd/info");
    assert.equal(r.status, 200);
    assert.match(r.headers["content-type"], /text\/html/);
    assert.match(r.headers["content-security-policy"], /default-src 'none'/);
    assert.match(r.headers["content-security-policy"], /img-src 'self'/);
    assert.doesNotMatch(r.headers["content-security-policy"], /script-src/);
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.doesNotMatch(r.cuerpo, /<script|javascript:|onerror=|onclick=/i);
    assert.doesNotMatch(r.cuerpo, /(?:src|href)="https?:/i, "sin recursos ni enlaces externos");
    assert.match(r.cuerpo, /<h1>[^<]*repuesto/);
  });
});

test("con barra final se redirige a la ruta sin barra (los enlaces relativos dependen de eso)", async () => {
  await con(CON_CORREO, async (server) => {
    const r = await pedir(server, "/topd/info/?x=1");
    assert.equal(r.status, 301);
    assert.equal(r.headers.location, "/topd/info?x=1");
  });
});

test("cada captura existe, se sirve como WebP, trae texto alternativo y tamaño", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    const imgs = [...cuerpo.matchAll(/<img ([^>]+)>/g)].map((m) => m[1]);
    assert.ok(imgs.length >= 5, "hay capturas");
    for (const attrs of imgs) {
      const src = /src="([^"]+)"/.exec(attrs)[1];
      assert.match(src, /^info\/img\/[a-z-]+\.webp$/, "ruta relativa a /topd/");
      assert.match(attrs, /alt="[^"]{30,}"/, `${src}: alt descriptivo`);
      assert.match(attrs, /width="\d+" height="\d+"/, `${src}: tamaño para no mover la página`);
      const archivo = path.join(aqui, "..", "src", "topd-info", src.replace("info/", ""));
      assert.ok(existsSync(archivo), `${src}: existe`);
      assert.ok(readFileSync(archivo).length < 120 * 1024, `${src}: liviana`);
      const r = await pedir(server, "/" + src.replace("info/img/", "topd/info/img/"));
      assert.equal(r.status, 200, src);
      assert.equal(r.headers["content-type"], "image/webp");
      assert.equal(r.buf.subarray(8, 12).toString("ascii"), "WEBP");
    }
  });
});

test("las imágenes no permiten salir de su carpeta ni listarla", async () => {
  await con(CON_CORREO, async (server) => {
    for (const ruta of ["/topd/info/img/", "/topd/info/img/../index.js", "/topd/info/img/%2e%2e/index.js", "/topd/info/img/nada.webp"]) {
      const r = await pedir(server, ruta);
      assert.notEqual(r.status, 200, ruta);
      assert.doesNotMatch(r.cuerpo, /crearTopdInfo/, ruta);
    }
  });
});

test("el contacto usa LEGAL_CORREO (escapado) y, sin él, avisa en vez de inventar uno", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    assert.match(cuerpo, /href="mailto:hola@ejemplo\.pe\?subject=/);
  });
  await con({ LEGAL_CORREO: "no es un correo" }, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    assert.doesNotMatch(cuerpo, /mailto:/);
    assert.match(cuerpo, /Correo de contacto próximamente/);
    assert.match(cuerpo, /href="#contacto"/);
  });
  await con({ LEGAL_CORREO: 'a"b@x.pe', NOMBRE_PLATAFORMA: "<b>Hack</b>" }, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    assert.doesNotMatch(cuerpo, /<b>Hack<\/b>/);
  });
});

test("los enlaces son relativos a /topd/ y funcionan con cualquier BASE_PATH", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/prefijo/topd/info");
    assert.equal((await pedir(server, "/prefijo/topd/info")).status, 200);
    for (const href of ["../", "../cuenta/", "../terminos", "../privacidad", "../favicon.ico"]) assert.ok(cuerpo.includes(`href="${href}"`), href);
  }, "/prefijo");
});

test("el landing de la raíz enlaza a la página de topd", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/");
    assert.match(cuerpo, /href="topd\/info"/);
  });
});

test("lo que dice la página no promete lo que no hay (comprobantes electrónicos, precios)", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    assert.match(cuerpo, /no emite comprobantes electrónicos/);
    assert.doesNotMatch(cuerpo, /S\/\s?\d|US\$|\bplan(?:es)?\b/i, "sin precios ni planes");
  });
});

test("la página cuenta lo que topd hace hoy: guía, carga de archivos, relacionales, fotos y supervisión", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/topd/info");
    for (const texto of ["Guía con opciones del catálogo", "Carga desde Excel o PDF", "Relacionales para tu Excel", "Fotos en tu Google Drive", "Supervisión del día"]) assert.ok(cuerpo.includes(texto), texto);
  });
});

test("el landing presenta topd como disponible, y academia y servicios con fotos como a futuro", async () => {
  await con(CON_CORREO, async (server) => {
    const { cuerpo } = await pedir(server, "/");
    assert.match(cuerpo, /<span class="estado activo">disponible<\/span>\s*<h3>Topd<\/h3>/);
    assert.doesNotMatch(cuerpo, /Siscore/);
    assert.match(cuerpo, /<span class="estado">a futuro<\/span>\s*<h3>Academia<\/h3>/);
    assert.match(cuerpo, /<span class="estado">a futuro<\/span>\s*<h3>Clientes, servicios y fotos<\/h3>/);
  });
});
