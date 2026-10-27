import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { crearLegal } from "../src/legal/index.js";
import { leerConfigLegal, VERSION_TERMINOS, VERSION_PRIVACIDAD } from "../src/legal/config.js";
import { crearLanding } from "../src/landing/index.js";

const COMPLETO = { LEGAL_RESPONSABLE: "Ana Pérez", LEGAL_DOCUMENTO: "20123456789", LEGAL_CORREO: "contacto@ejemplo.pe" };

function levantar(env, base = "/") {
  const avisos = [];
  const app = express();
  const gateway = express.Router();
  gateway.use(crearLanding());
  gateway.use(crearLegal({ env, avisar: (m) => avisos.push(m) }));
  app.use(base, gateway);
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve({ server, avisos }));
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

async function con(env, fn, base) {
  const { server, avisos } = await levantar(env, base);
  try {
    await fn(server, avisos);
  } finally {
    server.close();
  }
}

test("sirve los términos y la privacidad como HTML en español, con el responsable y su correo", async () => {
  await con(COMPLETO, async (server, avisos) => {
    for (const ruta of ["/terminos", "/privacidad"]) {
      const r = await pedir(server, ruta);
      assert.equal(r.status, 200, ruta);
      assert.match(r.headers["content-type"], /html/);
      assert.match(r.cuerpo, /lang="es"/);
      assert.match(r.cuerpo, /Ana Pérez \(20123456789\)/);
      assert.match(r.cuerpo, /href="mailto:contacto@ejemplo\.pe"/);
      assert.doesNotMatch(r.cuerpo, /Pendiente de configurar/);
      assert.match(r.cuerpo, /Ilnapo/);
    }
    assert.deepEqual(avisos, [], "con todo configurado no avisa");
  });
});

test("cada página enlaza a la otra, al inicio y muestra su fecha de versión", async () => {
  await con(COMPLETO, async (server) => {
    const t = await pedir(server, "/terminos");
    const p = await pedir(server, "/privacidad");
    assert.match(t.cuerpo, /href="privacidad"/);
    assert.match(p.cuerpo, /href="terminos"/);
    for (const r of [t, p]) assert.match(r.cuerpo, /href="\.\/"/);
    assert.match(t.cuerpo, new RegExp(`${Number(VERSION_TERMINOS.slice(8))} de octubre de 2026`));
    assert.match(p.cuerpo, new RegExp(`${Number(VERSION_PRIVACIDAD.slice(8))} de octubre de 2026`));
  });
});

test("la privacidad cubre lo que Google y la ley piden: datos de Google, finalidades, derechos y autoridad", async () => {
  await con(COMPLETO, async (server) => {
    const { cuerpo } = await pedir(server, "/privacidad");
    for (const texto of [/Google/, /29733/, /016-2024-JUS/, /correo/, /nombre/, /Acceso/, /Rectificación/, /Cancelación/, /Oposición/, /Autoridad Nacional de Protección de Datos Personales/, /cookies/i, /no vendemos/i, /Cuánto tiempo/])
      assert.match(cuerpo, texto, String(texto));
  });
});

test("los términos cubren puntos, pedidos, uso aceptable, responsabilidad y ley aplicable", async () => {
  await con({ ...COMPLETO, LEGAL_JURISDICCION: "Arequipa" }, async (server) => {
    const { cuerpo } = await pedir(server, "/terminos");
    for (const texto of [/Puntos, promociones/, /no son dinero/i, /Uso aceptable/, /Limitación de responsabilidad/, /República del Perú/, /tribunales de Arequipa/])
      assert.match(cuerpo, texto, String(texto));
  });
});

test("sin configurar avisa al arrancar y la página lo dice (no inventa un responsable)", async () => {
  await con({}, async (server, avisos) => {
    assert.equal(avisos.length, 1);
    assert.match(avisos[0], /LEGAL_RESPONSABLE, LEGAL_CORREO/);
    const { cuerpo } = await pedir(server, "/terminos");
    assert.match(cuerpo, /Pendiente de configurar/);
    assert.match(cuerpo, /LEGAL_RESPONSABLE, LEGAL_CORREO/);
    assert.doesNotMatch(cuerpo, /mailto:/);
  });
});

test("un correo con forma inválida no se usa", () => {
  assert.equal(leerConfigLegal({ LEGAL_CORREO: "no es correo" }).correo, "");
  assert.equal(leerConfigLegal({ LEGAL_CORREO: 'a@b.pe"><script>' }).correo, "");
  assert.equal(leerConfigLegal({ LEGAL_CORREO: " hola@x.pe " }).correo, "hola@x.pe");
  assert.deepEqual(leerConfigLegal({ ...COMPLETO }).faltantes, []);
});

test("los datos del responsable se escapan: no se puede inyectar HTML desde el entorno", async () => {
  await con(
    { LEGAL_RESPONSABLE: '<script>alert(1)</script> "X"', LEGAL_DOCUMENTO: "<img src=x onerror=1>", NOMBRE_PLATAFORMA: "<b>Mala</b>", LEGAL_JURISDICCION: "<i>Lima</i>", LEGAL_CORREO: COMPLETO.LEGAL_CORREO },
    async (server) => {
      for (const ruta of ["/terminos", "/privacidad"]) {
        const { cuerpo } = await pedir(server, ruta);
        assert.doesNotMatch(cuerpo, /<script>alert/, ruta);
        assert.doesNotMatch(cuerpo, /<img src=x/, ruta);
        assert.doesNotMatch(cuerpo, /<b>Mala/, ruta);
        assert.match(cuerpo, /&lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;X&quot;/, ruta);
      }
    },
  );
});

test("lleva cabeceras de seguridad: sin scripts, sin incrustarse en otros sitios", async () => {
  await con(COMPLETO, async (server) => {
    const r = await pedir(server, "/terminos");
    assert.match(r.headers["content-security-policy"], /default-src 'none'/);
    assert.match(r.headers["content-security-policy"], /frame-ancestors 'none'/);
    assert.match(r.headers["content-security-policy"], /img-src 'self'/); // para el favicon
    assert.match(r.cuerpo, /rel="icon"/);
    assert.equal(r.headers["x-content-type-options"], "nosniff");
    assert.doesNotMatch(r.cuerpo, /<script/i);
  });
});

test("con barra final redirige a la ruta sin barra (para que los enlaces relativos funcionen) y conserva la consulta", async () => {
  await con(COMPLETO, async (server) => {
    const r = await pedir(server, "/privacidad/?x=1");
    assert.equal(r.status, 301);
    assert.equal(r.headers.location, "/privacidad?x=1");
  });
});

test("funciona detrás de un BASE_PATH", async () => {
  await con(COMPLETO, async (server) => {
    const r = await pedir(server, "/api/terminos");
    assert.equal(r.status, 200);
    const red = await pedir(server, "/api/terminos/");
    assert.equal(red.headers.location, "/api/terminos");
    assert.equal((await pedir(server, "/terminos")).status, 404, "fuera del BASE_PATH no existe");
  }, "/api");
});

test("el landing enlaza a las dos páginas legales", async () => {
  await con(COMPLETO, async (server) => {
    const r = await pedir(server, "/");
    assert.match(r.cuerpo, /href="terminos"/);
    assert.match(r.cuerpo, /href="privacidad"/);
    assert.match(r.cuerpo, /href="cuenta\/"/);
  });
});

test("las reseñas de platos (5.62) están en los términos y en la política de privacidad", async () => {
  await con(COMPLETO, async (server) => {
    const t = await pedir(server, "/terminos");
    const p = await pedir(server, "/privacidad");
    assert.match(t.cuerpo, /Reseñas de platos/);
    assert.match(t.cuerpo, /500 caracteres/);
    assert.match(t.cuerpo, /ocultar/);
    assert.match(p.cuerpo, /Tus reseñas/);
    assert.match(p.cuerpo, /públicas/);
    assert.match(p.cuerpo, /Anónimo/);
  });
});

test("las versiones de los textos legales subieron con las reseñas (26 de octubre de 2026)", () => {
  assert.equal(VERSION_TERMINOS, "2026-10-26");
  assert.equal(VERSION_PRIVACIDAD, "2026-10-26");
});
