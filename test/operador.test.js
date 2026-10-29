// Pantalla de operador (5.66) y recuperación de contraseña (5.67) en el gateway. El núcleo se simula con un contrato mínimo.
import { test, it, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { crearOperador, VIGENCIA_ENLACE_MS, VIGENCIA_SESION_MS } from "../src/operador/index.js";
import { crearRecuperacion } from "../src/recuperacion/index.js";
import { ErrorCorreo } from "../src/correo/index.js";
import { crearLimite } from "../src/solicitudes/limite.js";

const ENV = { URL_PUBLICA: "https://www.ejemplo.com", OPERADOR_CORREO: "operador@ejemplo.com", LEGAL_CORREO: "hola@ejemplo.com" };
const err = (codigo, status, mensaje) => Object.assign(new Error(mensaje), { name: "ErrorSolicitud", codigo, status });

function correoFalso({ falla = false, configurado = true } = {}) {
  const enviados = [];
  return { configurado, enviados, falla, async enviar(m) { if (this.falla) throw new ErrorCorreo("falló (500)"); enviados.push(m); return { id: "x" }; } };
}

function nucleoFalso() {
  const sol = (o) => ({ id: "s1", nombre: "Café Aurora", slug: "cafe-aurora", servicios: ["tobt"], pais: "PE", moneda: "PEN", adminNombre: "Ana", adminCorreo: "ana@aurora.example", telefono: "+51987654321", estado: "pendiente", vencida: false, creadaTs: new Date("2026-10-27T12:00:00Z"), expira: new Date("2026-11-10T12:00:00Z"), empresaId: null, resueltaTs: null, error: null, ...o });
  const core = {
    llamadas: [],
    filas: [sol({}), sol({ id: "s2", nombre: "<script>alert(1)</script>", slug: "xss", estado: "aprobada" })],
    empresas: [{ id: "e1", nombre: "Café Aurora", slug: "cafe-aurora", servicios: ["tobt"], pais: "PE", moneda: "PEN", activa: true, creadaTs: new Date("2026-10-27T12:00:00Z"), admins: [{ id: "u1", correo: "ana@aurora.example", nombre: "Ana", suspendido: false }] }],
    recuperaciones: [],
    solicitudes: {
      async listar({ estado }) { core.llamadas.push(["listar", estado]); return core.filas.filter((f) => !estado || (estado === "pendiente" ? f.estado === "pendiente" : f.estado === estado)); },
      async contarPendientes() { return core.filas.filter((f) => f.estado === "pendiente").length; },
      async aprobarPorId(id) {
        core.llamadas.push(["aprobarPorId", id]);
        const s = core.filas.find((f) => f.id === id);
        if (!s) throw err("ENLACE_INVALIDO", 404, "solicitud no encontrada");
        if (s.estado !== "pendiente") throw err("ESTADO_INVALIDO", 409, "esta solicitud ya no está pendiente");
        s.estado = "aprobada";
        return { empresa: { id: "e2", nombre: s.nombre, slug: s.slug, servicios: s.servicios }, admin: { correo: s.adminCorreo, nombre: s.adminNombre, nuevo: true }, tokenAcceso: "A".repeat(43) };
      },
      async rechazarPorId(id) {
        core.llamadas.push(["rechazarPorId", id]);
        const s = core.filas.find((f) => f.id === id);
        if (!s || s.estado !== "pendiente") throw err("ESTADO_INVALIDO", 409, "esta solicitud ya no está pendiente");
        s.estado = "rechazada";
        return { id: s.id, nombre: s.nombre, adminNombre: s.adminNombre, adminCorreo: s.adminCorreo };
      },
      async listarEmpresas({ texto }) { core.llamadas.push(["listarEmpresas", texto]); return core.empresas.filter((e) => !texto || e.slug.includes(texto)); },
      async fijarActiva({ empresaId, activa }) {
        core.llamadas.push(["fijarActiva", empresaId, activa]);
        const e = core.empresas.find((x) => x.id === empresaId);
        if (!e) throw err("ENLACE_INVALIDO", 404, "empresa no encontrada");
        e.activa = activa;
        return { ok: true, activa };
      },
      async reenviarAcceso({ empresaId, usuarioId }) {
        core.llamadas.push(["reenviarAcceso", empresaId, usuarioId]);
        if (usuarioId !== "u1") throw err("ENLACE_INVALIDO", 404, "esa persona no es administradora de la empresa");
        return { correo: "ana@aurora.example", nombre: "Ana", empresa: "Café Aurora", token: "R".repeat(43), vence: new Date() };
      },
      async solicitarRecuperacion({ correo }) {
        core.recuperaciones.push(correo);
        if (core.lanza) throw new Error("base caída");
        return correo === "ana@aurora.example" ? { correo, nombre: "Ana", token: "Q".repeat(43), vence: new Date() } : null;
      },
    },
  };
  return core;
}

async function levantar({ env = ENV, core = nucleoFalso(), correo = correoFalso(), base = "", reloj = { t: Date.now() }, limites = {} } = {}) {
  const avisos = [];
  const app = express();
  const gateway = express.Router();
  gateway.use(crearOperador({ core, correo, env, avisar: (m) => avisos.push(m), ahora: () => reloj.t, ...limites.operador }));
  gateway.use(crearRecuperacion({ core, correo, env, avisar: (m) => avisos.push(m), ...limites.recuperacion }));
  app.use(base || "/", gateway);
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const origen = `http://127.0.0.1:${server.address().port}`;
  let cookie = "";
  const pedir = (ruta, init = {}) => fetch(origen + base + ruta, { redirect: "manual", ...init, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(init.headers ?? {}) } });
  const post = (ruta, datos = {}) => pedir(ruta, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(datos).toString() });
  const esperar = async (fn) => { for (let i = 0; i < 100; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 5)); } };
  /** Pide el enlace, lo abre, lo confirma y deja la cookie puesta. Devuelve el token CSRF. */
  async function entrar() {
    await post("/operador/entrar");
    await esperar(() => correo.enviados.length);
    const token = /\/operador\/acceso\/([A-Za-z0-9_-]{43})/.exec(correo.enviados.at(-1).texto)[1];
    const r = await post(`/operador/acceso/${token}`);
    cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
    const h = await (await pedir("/operador/solicitudes")).text();
    return { token, csrf: /name="_csrf" value="([^"]+)"/.exec(h)?.[1], html: h, respuesta: r };
  }
  return { server, core, correo, avisos, reloj, pedir, post, entrar, esperar, quitarCookie: () => (cookie = ""), cerrar: () => new Promise((r) => server.close(r)) };
}

describe("desactivado", () => {
  it("sin variables: el log lo dice y las dos pantallas responden 503 sin tocar el núcleo", async () => {
    const t = await levantar({ env: {}, correo: correoFalso({ configurado: false }) });
    assert.ok(t.avisos.some((a) => /operador\] pantalla de operador desactivada/.test(a)));
    assert.ok(t.avisos.some((a) => /recuperacion\] .*desactivado/.test(a)));
    for (const r of ["/operador", "/operador/solicitudes", "/recuperar"]) assert.equal((await t.pedir(r)).status, 503, r);
    assert.equal((await t.post("/operador/entrar")).status, 503);
    assert.equal((await t.post("/recuperar", { correo: "ana@aurora.example" })).status, 503);
    assert.equal(t.core.recuperaciones.length, 0);
    await t.cerrar();
  });
});

describe("entrada del operador", () => {
  let t;
  beforeEach(async () => { t = await levantar(); });
  afterEach(() => t.cerrar());

  it("la página de entrada no pide ningún dato y lleva cabeceras seguras", async () => {
    const r = await t.pedir("/operador");
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-security-policy"), /default-src 'none'/);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.match(r.headers.get("x-robots-tag"), /noindex/);
    const h = await r.text();
    assert.ok(!/<input[^>]*type="(email|text)"/.test(h));
    assert.ok(!/<script/i.test(h));
  });

  it("pedir el enlace: respuesta fija y el correo va SOLO al operador configurado (ignora cualquier dirección enviada)", async () => {
    const r = await t.post("/operador/entrar", { correo: "intruso@malo.example", para: "intruso@malo.example" });
    assert.equal(r.status, 303);
    assert.match(r.headers.get("location"), /\/operador\?enviado=1$/);
    await t.esperar(() => t.correo.enviados.length);
    assert.equal(t.correo.enviados.length, 1);
    assert.equal(t.correo.enviados[0].para, "operador@ejemplo.com");
    assert.match(t.correo.enviados[0].texto, /^.*operador.*\n?https:\/\/www\.ejemplo\.com\/operador\/acceso\/[A-Za-z0-9_-]{43}/ms);
    assert.ok(!JSON.stringify(t.correo.enviados).includes("intruso"));
  });

  it("abrir el enlace NO inicia sesión; el botón sí, una sola vez, con cookie HttpOnly + SameSite=Strict", async () => {
    await t.post("/operador/entrar");
    await t.esperar(() => t.correo.enviados.length);
    const token = /acceso\/([A-Za-z0-9_-]{43})/.exec(t.correo.enviados[0].texto)[1];
    const g = await t.pedir(`/operador/acceso/${token}`);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get("set-cookie"), null);
    assert.equal((await t.pedir("/operador/solicitudes")).status, 303); // seguimos sin sesión
    const p = await t.post(`/operador/acceso/${token}`);
    assert.equal(p.status, 303);
    const c = p.headers.get("set-cookie");
    assert.match(c, /^operador=[A-Za-z0-9_-]{43}; Path=\/operador; HttpOnly; SameSite=Strict; Max-Age=28800/);
    assert.ok(!/Secure/.test(c) === false); // URL_PUBLICA es https → Secure
    t.quitarCookie();
    assert.equal((await t.post(`/operador/acceso/${token}`)).status, 404); // un solo uso
    assert.equal((await t.pedir(`/operador/acceso/${token}`)).status, 404);
  });

  it("el enlace vence a los 15 minutos; los de basura dan 404", async () => {
    await t.post("/operador/entrar");
    await t.esperar(() => t.correo.enviados.length);
    const token = /acceso\/([A-Za-z0-9_-]{43})/.exec(t.correo.enviados[0].texto)[1];
    t.reloj.t += VIGENCIA_ENLACE_MS + 1;
    assert.equal((await t.post(`/operador/acceso/${token}`)).status, 404);
    for (const x of ["x", "A".repeat(43), "../".repeat(20)]) assert.equal((await t.pedir(`/operador/acceso/${x}`)).status, 404);
  });

  it("tope por IP al pedir enlaces; tope global; si el correo falla no queda un enlace válido", async () => {
    for (let i = 0; i < 3; i++) assert.equal((await t.post("/operador/entrar")).status, 303);
    const r = await t.post("/operador/entrar");
    assert.equal(r.status, 429);
    assert.ok(r.headers.get("retry-after"));
    const t2 = await levantar({ correo: correoFalso({ falla: true }) });
    await t2.post("/operador/entrar");
    await t2.esperar(() => t2.avisos.length > 1);
    assert.ok(t2.avisos.some((a) => /no se pudo enviar el enlace de entrada/.test(a)));
    await t2.cerrar();
    const t3 = await levantar({ limites: { operador: { limitePorIp: crearLimite({ max: 100, ventanaMs: 1000 }), limiteGlobal: crearLimite({ max: 1, ventanaMs: 60000 }) } } });
    await t3.post("/operador/entrar"); await t3.post("/operador/entrar");
    await t3.esperar(() => t3.correo.enviados.length);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(t3.correo.enviados.length, 1);
    await t3.cerrar();
  });
});

describe("sesión y protección de formularios", () => {
  let t;
  beforeEach(async () => { t = await levantar(); });
  afterEach(() => t.cerrar());

  it("sin sesión: GET redirige a la entrada y POST da 401, sin llamar al núcleo", async () => {
    for (const r of ["/operador/solicitudes", "/operador/empresas"]) { const x = await t.pedir(r); assert.equal(x.status, 303); assert.match(x.headers.get("location"), /\/operador$/); }
    for (const r of ["/operador/solicitudes/s1/aprobar", "/operador/solicitudes/s1/rechazar", "/operador/empresas/e1/estado", "/operador/empresas/e1/reenviar", "/operador/salir"])
      assert.equal((await t.post(r, { _csrf: "x" })).status, 401, r);
    assert.equal(t.core.llamadas.length, 0);
  });

  it("con sesión pero sin token CSRF o con uno ajeno: 403 y no pasa nada", async () => {
    await t.entrar();
    for (const datos of [{}, { _csrf: "mal" }, { _csrf: "" }]) assert.equal((await t.post("/operador/solicitudes/s1/aprobar", datos)).status, 403);
    assert.equal((await t.post("/operador/empresas/e1/estado", { activa: "0" })).status, 403);
    assert.ok(!t.core.llamadas.some((l) => ["aprobarPorId", "fijarActiva"].includes(l[0])));
    assert.equal(t.core.filas[0].estado, "pendiente");
  });

  it("la sesión vence a las 8 horas y salir la cierra", async () => {
    const { csrf } = await t.entrar();
    assert.equal((await t.pedir("/operador/solicitudes")).status, 200);
    const s = await t.post("/operador/salir", { _csrf: csrf });
    assert.equal(s.status, 303);
    assert.match(s.headers.get("set-cookie"), /Max-Age=0/);
    assert.equal((await t.pedir("/operador/solicitudes")).status, 303); // la cookie vieja ya no sirve aunque el navegador la conserve
    const t2 = await levantar();
    await t2.entrar();
    t2.reloj.t += VIGENCIA_SESION_MS + 1;
    assert.equal((await t2.pedir("/operador/solicitudes")).status, 303);
    await t2.cerrar();
  });

  it("una cookie inventada no abre nada", async () => {
    const r = await t.pedir("/operador/solicitudes", { headers: { Cookie: `operador=${"Z".repeat(43)}` } });
    assert.equal(r.status, 303);
  });
});

describe("solicitudes", () => {
  let t, csrf;
  beforeEach(async () => { t = await levantar(); ({ csrf } = await t.entrar()); });
  afterEach(() => t.cerrar());

  it("lista las pendientes por defecto con filtros; los datos de terceros van escapados", async () => {
    const h = await (await t.pedir("/operador/solicitudes")).text();
    assert.match(h, /Café Aurora/);
    assert.match(h, /1 por resolver/);
    assert.ok(!h.includes("<script>alert(1)"));
    const todas = await (await t.pedir("/operador/solicitudes?estado=todas")).text();
    assert.match(todas, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.ok(!/<script/i.test(todas));
    assert.deepEqual(t.core.llamadas.filter((l) => l[0] === "listar").map((l) => l[1]), ["pendiente", "pendiente", undefined]);
    await t.pedir("/operador/solicitudes?estado=%27;drop");
    assert.equal(t.core.llamadas.filter((l) => l[0] === "listar").at(-1)[1], "pendiente"); // un estado desconocido cae al valor por defecto
  });

  it("aprobar: llama al núcleo por id, envía el correo de bienvenida con el enlace y muestra el resultado", async () => {
    const r = await t.post("/operador/solicitudes/s1/aprobar", { _csrf: csrf });
    assert.equal(r.status, 200);
    assert.deepEqual(t.core.llamadas.at(-1), ["aprobarPorId", "s1"]);
    const m = t.correo.enviados.at(-1);
    assert.equal(m.para, "ana@aurora.example");
    assert.match(m.texto, /https:\/\/www\.ejemplo\.com\/acceso\/A{43}/);
    const h = await r.text();
    assert.match(h, /Empresa creada/);
    assert.match(h, /Volver a solicitudes/);
    // ya no está pendiente: aprobar otra vez da el error claro, sin segundo correo
    const n = t.correo.enviados.length;
    const otra = await t.post("/operador/solicitudes/s1/aprobar", { _csrf: csrf });
    assert.equal(otra.status, 409);
    assert.equal(t.correo.enviados.length, n);
  });

  it("aprobar con el correo caído: la empresa queda creada y se muestra el enlace para entregarlo a mano", async () => {
    t.correo.falla = true;
    const r = await t.post("/operador/solicitudes/s1/aprobar", { _csrf: csrf });
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /No se pudo enviar el correo/);
    assert.match(h, /acceso\/A{43}/);
  });

  it("rechazar avisa a la persona; un id inexistente da error claro y no 500", async () => {
    const r = await t.post("/operador/solicitudes/s1/rechazar", { _csrf: csrf });
    assert.equal(r.status, 200);
    assert.deepEqual(t.core.llamadas.at(-1), ["rechazarPorId", "s1"]);
    assert.match(t.correo.enviados.at(-1).asunto, /Sobre tu solicitud de/);
    assert.equal((await t.post("/operador/solicitudes/nada/aprobar", { _csrf: csrf })).status, 404);
  });

  it("un error inesperado del núcleo da 500 sin detalles internos", async () => {
    t.core.solicitudes.aprobarPorId = async () => { throw new Error("mongo://usuario:clave@host"); };
    const r = await t.post("/operador/solicitudes/s1/aprobar", { _csrf: csrf });
    assert.equal(r.status, 500);
    assert.ok(!(await r.text()).includes("mongo://"));
  });
});

describe("empresas", () => {
  let t, csrf;
  beforeEach(async () => { t = await levantar(); ({ csrf } = await t.entrar()); });
  afterEach(() => t.cerrar());

  it("lista con administradores y busca", async () => {
    const h = await (await t.pedir("/operador/empresas")).text();
    assert.match(h, /Café Aurora/);
    assert.match(h, /ana@aurora\.example/);
    assert.match(h, /Suspender empresa/);
    await t.pedir("/operador/empresas?q=aurora");
    assert.deepEqual(t.core.llamadas.at(-1), ["listarEmpresas", "aurora"]);
  });

  it("suspender y reactivar", async () => {
    assert.equal((await t.post("/operador/empresas/e1/estado", { _csrf: csrf, activa: "0" })).status, 200);
    assert.deepEqual(t.core.llamadas.at(-1), ["fijarActiva", "e1", false]);
    assert.match(await (await t.pedir("/operador/empresas")).text(), /Reactivar empresa/);
    await t.post("/operador/empresas/e1/estado", { _csrf: csrf, activa: "1" });
    assert.deepEqual(t.core.llamadas.at(-1), ["fijarActiva", "e1", true]);
    assert.equal((await t.post("/operador/empresas/e1/estado", { _csrf: csrf, activa: "quizá" })).status, 400);
    assert.equal((await t.post("/operador/empresas/zzz/estado", { _csrf: csrf, activa: "0" })).status, 404);
  });

  it("reenviar acceso: correo a ese administrador con enlace nuevo; otra persona no vale", async () => {
    const r = await t.post("/operador/empresas/e1/reenviar", { _csrf: csrf, usuarioId: "u1" });
    assert.equal(r.status, 200);
    const m = t.correo.enviados.at(-1);
    assert.equal(m.para, "ana@aurora.example");
    assert.match(m.texto, /https:\/\/www\.ejemplo\.com\/acceso\/R{43}/);
    assert.match(m.asunto, /Café Aurora/);
    assert.equal((await t.post("/operador/empresas/e1/reenviar", { _csrf: csrf, usuarioId: "otro" })).status, 404);
    t.correo.falla = true;
    const h = await (await t.post("/operador/empresas/e1/reenviar", { _csrf: csrf, usuarioId: "u1" })).text();
    assert.match(h, /No se pudo enviar el correo/);
    assert.match(h, /acceso\/R{43}/);
  });
});

describe("BASE_PATH", () => {
  it("con prefijo: cookie, enlaces del correo y redirecciones lo respetan", async () => {
    const t = await levantar({ base: "/ilnapo" });
    await t.post("/operador/entrar");
    await t.esperar(() => t.correo.enviados.length);
    assert.match(t.correo.enviados[0].texto, /https:\/\/www\.ejemplo\.com\/ilnapo\/operador\/acceso\//);
    const token = /acceso\/([A-Za-z0-9_-]{43})/.exec(t.correo.enviados[0].texto)[1];
    const r = await t.post(`/operador/acceso/${token}`);
    assert.match(r.headers.get("set-cookie"), /Path=\/ilnapo\/operador;/);
    assert.match(r.headers.get("location"), /^\/ilnapo\/operador\/solicitudes$/);
    await t.cerrar();
  });
});

describe("recuperar la contraseña", () => {
  let t;
  beforeEach(async () => { t = await levantar(); });
  afterEach(() => t.cerrar());
  const total = (r) => r.status;

  it("formulario: un campo de correo, honeypot, sin scripts ni caché", async () => {
    const r = await t.pedir("/recuperar");
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /name="correo"/);
    assert.match(h, /name="sitio"/);
    assert.ok(!/<script/i.test(h));
    assert.equal(r.headers.get("cache-control"), "no-store");
  });

  it("cuenta existente: correo con enlace a /acceso/ (de URL_PUBLICA); cuenta inexistente: respuesta IDÉNTICA y sin correo", async () => {
    const a = await t.post("/recuperar", { correo: "Ana@Aurora.example " });
    const b = await t.post("/recuperar", { correo: "nadie@x.example" });
    assert.equal(total(a), 303);
    assert.equal(a.headers.get("location"), b.headers.get("location"));
    assert.match(a.headers.get("location"), /\/recuperar\?enviada=1$/);
    await t.esperar(() => t.correo.enviados.length);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(t.correo.enviados.length, 1);
    assert.equal(t.correo.enviados[0].para, "ana@aurora.example");
    assert.match(t.correo.enviados[0].texto, /https:\/\/www\.ejemplo\.com\/acceso\/Q{43}/);
    assert.match(t.correo.enviados[0].texto, /1 hora/);
    assert.deepEqual(t.core.recuperaciones, ["ana@aurora.example", "nadie@x.example"]);
    const h = await (await t.pedir("/recuperar?enviada=1")).text();
    assert.match(h, /Si ese correo tiene una cuenta/);
  });

  it("correo mal formado: se rechaza sin tocar el núcleo; el campo trampa finge éxito sin tocarlo", async () => {
    for (const c of ["", "sin-arroba", "a@b", "x".repeat(300) + "@a.example"]) assert.equal((await t.post("/recuperar", { correo: c })).status, 400, c);
    const r = await t.post("/recuperar", { correo: "ana@aurora.example", sitio: "http://spam" });
    assert.equal(r.status, 303);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(t.core.recuperaciones.length, 0);
  });

  it("si el correo o el núcleo fallan, la respuesta sigue siendo la misma y queda en el log", async () => {
    t.correo.falla = true;
    assert.equal((await t.post("/recuperar", { correo: "ana@aurora.example" })).status, 303);
    await t.esperar(() => t.avisos.length > 0);
    assert.ok(t.avisos.some((a) => /no se pudo procesar/.test(a)));
    t.core.lanza = true;
    assert.equal((await t.post("/recuperar", { correo: "ana@aurora.example" })).status, 303);
  });

  it("topes: por IP (429) y por correo (la respuesta sigue igual pero no se envía más)", async () => {
    const t2 = await levantar({ limites: { recuperacion: { limitePorIp: crearLimite({ max: 100, ventanaMs: 1000 }), limitePorCorreo: crearLimite({ max: 2, ventanaMs: 60000 }) } } });
    for (let i = 0; i < 4; i++) assert.equal((await t2.post("/recuperar", { correo: "ana@aurora.example" })).status, 303);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(t2.core.recuperaciones.length, 2);
    await t2.cerrar();
    const t3 = await levantar({ limites: { recuperacion: { limitePorIp: crearLimite({ max: 2, ventanaMs: 60000 }) } } });
    await t3.post("/recuperar", { correo: "a@b.example" }); await t3.post("/recuperar", { correo: "a@b.example" });
    const r = await t3.post("/recuperar", { correo: "a@b.example" });
    assert.equal(r.status, 429);
    assert.ok(r.headers.get("retry-after"));
    await t3.cerrar();
  });
});
