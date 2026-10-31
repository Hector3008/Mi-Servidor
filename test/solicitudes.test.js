// Crear empresa con aprobación del operador (5.65): formulario público, correos, revisión, aprobación y contraseña.
// El núcleo se simula con un almacén en memoria que respeta el contrato de `core.solicitudes` (errores con name/codigo/status/detalle).
import { test, it, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { crearSolicitudes, leerConfigSolicitudes } from "../src/solicitudes/index.js";
import { crearCorreo, leerConfigCorreo, ErrorCorreo } from "../src/correo/index.js";
import { correoAlOperador, correoDeBienvenida } from "../src/solicitudes/correos.js";
import { crearLimite } from "../src/solicitudes/limite.js";
import { crearLanding } from "../src/landing/index.js";

const ENV = { URL_PUBLICA: "https://www.ejemplo.com/", OPERADOR_CORREO: "operador@ejemplo.com", LEGAL_CORREO: "hola@ejemplo.com", LEGAL_RESPONSABLE: "Ana" };
const FORM = { nombre: "Café Aurora", slug: "cafe-aurora", servicios: "tobt", pais: "PE", moneda: "PEN", adminNombre: "Ana Quispe", adminCorreo: "ana@aurora.example", telefono: "987654321", acepto: "1", sitio: "" };

function errorSol(codigo, status, mensaje, detalle) {
  return Object.assign(new Error(mensaje), { name: "ErrorSolicitud", codigo, status, detalle });
}

function nucleoFalso() {
  const sols = new Map();
  const accesos = new Map();
  let n = 0;
  const llamadas = [];
  const core = {
    llamadas,
    sols,
    accesos,
    existeCuenta: false,
    solicitudes: {
      async crear(e) {
        llamadas.push(["crear", e]);
        const campos = {};
        if (!e.nombre) campos.nombre = "Falta el nombre";
        if (!e.aceptoTerminos) campos.aceptoTerminos = "Debes aceptar los términos y la política de privacidad";
        if (e.slug === "ocupado") campos.slug = "Esa dirección web ya está en uso: elige otra";
        if (Object.keys(campos).length) throw errorSol("DATOS_INVALIDOS", 400, "Revisa los datos del formulario", { campos });
        if (e.adminCorreo === "repetido@x.com") throw errorSol("DEMASIADAS_SOLICITUDES", 429, "Ya tienes una solicitud en revisión con ese correo.");
        const token = "T".repeat(42) + String(++n % 10);
        const s = { id: `s${n}`, ...e, estado: "pendiente", creadaTs: new Date("2026-10-27T12:00:00Z"), expira: new Date("2026-11-10T12:00:00Z"), servicios: [].concat(e.servicios) };
        sols.set(token, s);
        return { solicitud: s, token };
      },
      async ver(t) {
        const s = sols.get(t);
        if (!s) throw errorSol("ENLACE_INVALIDO", 404, "enlace inválido o ya usado");
        if (s.vencida) throw errorSol("ENLACE_VENCIDO", 410, "la solicitud venció");
        if (s.estado !== "pendiente") throw errorSol("ESTADO_INVALIDO", 409, `esta solicitud ya fue ${s.estado}`);
        return s;
      },
      async aprobar(t) {
        llamadas.push(["aprobar", t]);
        const s = await core.solicitudes.ver(t);
        s.estado = "aprobada";
        const nuevo = !core.existeCuenta;
        if (nuevo) accesos.set("A".repeat(42) + "1", { correo: s.adminCorreo, nombre: s.adminNombre });
        return { empresa: { id: "e1", nombre: s.nombre, slug: s.slug, servicios: s.servicios }, admin: { correo: s.adminCorreo, nombre: s.adminNombre, nuevo }, tokenAcceso: nuevo ? "A".repeat(42) + "1" : null };
      },
      async rechazar(t) {
        llamadas.push(["rechazar", t]);
        const s = await core.solicitudes.ver(t);
        s.estado = "rechazada";
        return { id: s.id, nombre: s.nombre, adminNombre: s.adminNombre, adminCorreo: s.adminCorreo };
      },
      async verAcceso(t) {
        const a = accesos.get(t);
        if (!a) throw errorSol("ENLACE_INVALIDO", 404, "enlace inválido o ya usado");
        return a;
      },
      async establecerPassword({ token, password }) {
        llamadas.push(["password", token]);
        const a = await core.solicitudes.verAcceso(token);
        if (password.length < 10) throw errorSol("DATOS_INVALIDOS", 400, "la contraseña debe tener al menos 10 caracteres", { campos: { password: "x" } });
        accesos.delete(token);
        return { correo: a.correo };
      },
    },
  };
  return core;
}

function correoFalso({ falla = false, configurado = true } = {}) {
  const enviados = [];
  return {
    configurado,
    enviados,
    falla,
    async enviar(m) {
      if (this.falla) throw new ErrorCorreo("el servicio de correo rechazó el envío (500)");
      enviados.push(m);
      return { id: "x" };
    },
  };
}

async function levantar({ env = ENV, core = nucleoFalso(), correo = correoFalso(), base = "", limites = {} } = {}) {
  const avisos = [];
  const app = express();
  const gateway = express.Router();
  gateway.use(crearLanding());
  gateway.use(crearSolicitudes({ core, correo, env, avisar: (m) => avisos.push(m), ...limites }));
  app.use(base || "/", gateway);
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const origen = `http://127.0.0.1:${server.address().port}`;
  const pedir = (ruta, init = {}) => fetch(origen + base + ruta, { redirect: "manual", ...init });
  const post = (ruta, datos = {}) =>
    pedir(ruta, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(datos).toString() });
  return { server, core, correo, avisos, pedir, post, cerrar: () => new Promise((r) => server.close(r)) };
}

describe("desactivado si falta configuración", () => {
  it("sin variables: avisa en el log y la página dice que no se reciben solicitudes", async () => {
    const t = await levantar({ env: {}, correo: correoFalso({ configurado: false }) });
    assert.match(t.avisos[0], /desactivado: falta URL_PUBLICA, OPERADOR_CORREO, RESEND_API_KEY y CORREO_REMITENTE/);
    const r = await t.pedir("/crear-empresa");
    assert.equal(r.status, 503);
    assert.match(await r.text(), /no estamos recibiendo solicitudes/);
    assert.equal((await t.post("/crear-empresa", FORM)).status, 503);
    assert.equal((await t.pedir("/solicitud/" + "T".repeat(43))).status, 503);
    assert.equal(t.core.llamadas.length, 0);
    await t.cerrar();
  });

  it("URL_PUBLICA debe ser un origen (sin ruta) y el operador un correo", () => {
    assert.deepEqual(leerConfigSolicitudes({ URL_PUBLICA: "https://www.ilnapo.com/", OPERADOR_CORREO: "a@b.com" }), { urlPublica: "https://www.ilnapo.com", operador: "a@b.com", faltantes: [] });
    assert.deepEqual(leerConfigSolicitudes({ URL_PUBLICA: "javascript:alert(1)", OPERADOR_CORREO: "no" }).faltantes, ["URL_PUBLICA", "OPERADOR_CORREO"]);
    assert.deepEqual(leerConfigSolicitudes({ URL_PUBLICA: "https://x.com/ruta", OPERADOR_CORREO: "a@b.com" }).faltantes, ["URL_PUBLICA"]);
  });
});

describe("formulario público", () => {
  let t;
  beforeEach(async () => { t = await levantar(); });
  afterEach(() => t.cerrar());

  it("GET: formulario sin scripts, con CSP estricta, honeypot, servicios, términos y sin caché", async () => {
    const r = await t.pedir("/crear-empresa");
    assert.equal(r.status, 200);
    const h = await r.text();
    const csp = r.headers.get("content-security-policy");
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /form-action 'self'/);
    assert.ok(!/script-src/.test(csp));
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.ok(!/<script/i.test(h));
    assert.match(h, /name="servicios" value="tobt"[^>]* checked/);
    assert.match(h, /name="sitio"/);
    assert.match(h, /href="\/terminos"/);
    assert.match(h, /action="\/crear-empresa"/);
    assert.match(h, /name="acepto"/);
  });

  it("POST válido: 303 a «enviada», UN correo al operador con el enlace y los datos, y nada a la persona", async () => {
    const r = await t.post("/crear-empresa", FORM);
    assert.equal(r.status, 303);
    assert.equal(r.headers.get("location"), "/crear-empresa?enviada=1");
    assert.equal(t.correo.enviados.length, 1);
    const m = t.correo.enviados[0];
    assert.equal(m.para, "operador@ejemplo.com");
    assert.match(m.texto, /https:\/\/www\.ejemplo\.com\/solicitud\/T{42}1/);
    assert.match(m.texto, /Café Aurora/);
    assert.match(m.asunto, /Café Aurora/);
    const llamada = t.core.llamadas[0][1];
    assert.deepEqual(llamada.servicios, ["tobt"]);
    assert.deepEqual(llamada.serviciosPermitidos, ["tobt"]);
    assert.deepEqual(llamada.aceptoTerminos, { terminos: "2026-10-26", privacidad: "2026-10-29" });
    const ok = await t.pedir("/crear-empresa?enviada=1");
    assert.match(await ok.text(), /Recibimos tu solicitud/);
  });

  it("POST inválido: 400, conserva lo escrito (escapado), muestra el error por campo y no envía correo", async () => {
    const r = await t.post("/crear-empresa", { ...FORM, nombre: "", slug: 'x"><script>alert(1)</script>', acepto: "" });
    assert.equal(r.status, 400);
    const h = await r.text();
    assert.match(h, /Falta el nombre/);
    assert.match(h, /Debes aceptar los términos/);
    assert.ok(!h.includes("<script>alert(1)"));
    assert.match(h, /value="x&quot;&gt;&lt;script&gt;/);
    assert.equal(t.correo.enviados.length, 0);
  });

  it("lo escrito en cualquier campo vuelve escapado al re-mostrar el formulario", async () => {
    const raro = '"><img src=x onerror=alert(1)>';
    const r = await t.post("/crear-empresa", { ...FORM, nombre: raro, adminNombre: raro, adminCorreo: raro, telefono: raro, acepto: "" });
    const h = await r.text();
    assert.equal(r.status, 400);
    assert.ok(!h.includes("<img src=x"));
    assert.equal(h.split("&quot;&gt;&lt;img src=x").length - 1, 4);
  });

  it("dirección web ocupada: 400 con el mensaje en su campo", async () => {
    const r = await t.post("/crear-empresa", { ...FORM, slug: "ocupado" });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /ya está en uso/);
  });

  it("un correo con solicitud vigente: 429 con el mensaje arriba", async () => {
    const r = await t.post("/crear-empresa", { ...FORM, adminCorreo: "repetido@x.com" });
    assert.equal(r.status, 429);
    assert.match(await r.text(), /Ya tienes una solicitud en revisión/);
    assert.equal(t.correo.enviados.length, 0);
  });

  it("campo trampa lleno: se finge éxito pero no se crea ni se envía nada", async () => {
    const r = await t.post("/crear-empresa", { ...FORM, sitio: "http://spam.example" });
    assert.equal(r.status, 303);
    assert.equal(t.core.llamadas.length, 0);
    assert.equal(t.correo.enviados.length, 0);
  });

  it("valores repetidos o raros en el cuerpo no rompen nada", async () => {
    const r = await t.pedir("/crear-empresa", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "nombre=a&nombre=b&servicios=tobt&servicios=otro&slug[x]=1&acepto=1" });
    assert.ok([303, 400].includes(r.status));
  });

  it("cuerpo enorme: se rechaza", async () => {
    const r = await t.post("/crear-empresa", { ...FORM, nombre: "x".repeat(40000) });
    assert.ok(r.status >= 400);
    assert.equal(t.correo.enviados.length, 0);
  });
});

test("tope por IP: la sexta solicitud seguida recibe 429 con Retry-After", async () => {
  const t = await levantar({ limites: { limiteEnvios: crearLimite({ max: 5, ventanaMs: 3600000 }) } });
  for (let i = 0; i < 5; i++) assert.equal((await t.post("/crear-empresa", { ...FORM, slug: `n-${i}`, adminCorreo: `p${i}@x.com` })).status, 303);
  const r = await t.post("/crear-empresa", FORM);
  assert.equal(r.status, 429);
  assert.ok(Number(r.headers.get("retry-after")) > 0);
  await t.cerrar();
});

test("si el operador no puede recibir el correo: la persona ve un error, la solicitud se cancela y se avisa en el log", async () => {
  const t = await levantar({ correo: correoFalso({ falla: true }) });
  const r = await t.post("/crear-empresa", FORM);
  assert.equal(r.status, 503);
  assert.match(await r.text(), /No pudimos enviar tu solicitud/);
  assert.deepEqual(t.core.llamadas.map((l) => l[0]), ["crear", "rechazar"]);
  assert.ok(t.avisos.some((a) => /no se pudo avisar al operador/.test(a)));
  assert.ok(!t.avisos.some((a) => /T{42}/.test(a)), "el enlace no va al log");
  await t.cerrar();
});

describe("el operador", () => {
  let t, token;
  beforeEach(async () => {
    t = await levantar();
    await t.post("/crear-empresa", FORM);
    token = [...t.core.sols.keys()][0];
  });
  afterEach(() => t.cerrar());

  it("abrir el enlace (GET) muestra los datos y NO aprueba nada", async () => {
    const r = await t.pedir(`/solicitud/${token}`);
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /Café Aurora/);
    assert.match(h, /ana@aurora\.example/);
    assert.match(h, new RegExp(`method="post" action="/solicitud/${token}/aprobar"`));
    assert.match(h, new RegExp(`action="/solicitud/${token}/rechazar"`));
    assert.equal(r.headers.get("referrer-policy"), "no-referrer");
    assert.ok(!t.core.llamadas.some((l) => l[0] === "aprobar"));
    assert.equal(t.core.sols.get(token).estado, "pendiente");
  });

  it("datos de un desconocido van escapados en la página del operador", async () => {
    const t2 = await levantar();
    await t2.post("/crear-empresa", { ...FORM, nombre: "<img src=x onerror=alert(1)>" });
    const tk = [...t2.core.sols.keys()][0];
    const h = await (await t2.pedir(`/solicitud/${tk}`)).text();
    assert.ok(!h.includes("<img src=x"));
    assert.match(h, /&lt;img src=x/);
    await t2.cerrar();
  });

  it("enlace inventado: 404; vencido: 410; ya resuelto: 409", async () => {
    assert.equal((await t.pedir("/solicitud/" + "x".repeat(43))).status, 404);
    t.core.sols.get(token).vencida = true;
    const r = await t.pedir(`/solicitud/${token}`);
    assert.equal(r.status, 410);
    assert.match(await r.text(), /venció/);
    t.core.sols.get(token).vencida = false;
    await t.post(`/solicitud/${token}/aprobar`);
    assert.equal((await t.pedir(`/solicitud/${token}`)).status, 409);
  });

  it("aprobar: crea, escribe a la persona con su enlace de contraseña y le muestra al operador el resultado", async () => {
    const r = await t.post(`/solicitud/${token}/aprobar`);
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /Empresa creada/);
    assert.match(h, /https:\/\/www\.ejemplo\.com\/tobt\/catalogo\/cafe-aurora/);
    const m = t.correo.enviados.at(-1);
    assert.equal(m.para, "ana@aurora.example");
    assert.match(m.texto, /https:\/\/www\.ejemplo\.com\/acceso\/A{42}1/);
    assert.match(m.texto, /https:\/\/www\.ejemplo\.com\/cuenta\//);
    assert.match(m.texto, /\/tobt\/catalogo\/cafe-aurora/);
    assert.ok(!/A{42}1/.test(h), "con el correo enviado, el enlace de contraseña no se muestra al operador");
  });

  it("si el correo a la persona falla: la empresa queda creada y el operador ve el enlace para entregarlo", async () => {
    t.correo.falla = true;
    const r = await t.post(`/solicitud/${token}/aprobar`);
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /No se pudo enviar el correo/);
    assert.match(h, /https:\/\/www\.ejemplo\.com\/acceso\/A{42}1/);
    assert.ok(t.avisos.some((a) => /creada, pero no se pudo enviar el correo/.test(a)));
    assert.ok(!t.avisos.some((a) => /A{42}1/.test(a)));
  });

  it("si la persona ya tenía cuenta: correo sin enlace de contraseña", async () => {
    t.core.existeCuenta = true;
    await t.post(`/solicitud/${token}/aprobar`);
    const m = t.correo.enviados.at(-1);
    assert.ok(!/\/acceso\//.test(m.texto));
    assert.match(m.texto, /cuenta de siempre/);
  });

  it("aprobar dos veces: la segunda da 409 y no crea nada más", async () => {
    await t.post(`/solicitud/${token}/aprobar`);
    const r = await t.post(`/solicitud/${token}/aprobar`);
    assert.equal(r.status, 409);
    assert.equal(t.core.llamadas.filter((l) => l[0] === "aprobar").length, 2); // la 2.ª llega al núcleo, que la rechaza
  });

  it("rechazar: avisa a la persona y cierra la solicitud", async () => {
    const r = await t.post(`/solicitud/${token}/rechazar`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /rechazada/);
    const m = t.correo.enviados.at(-1);
    assert.equal(m.para, "ana@aurora.example");
    assert.match(m.texto, /no pudimos aprobarla/);
    assert.match(m.texto, /hola@ejemplo\.com/);
    assert.equal(t.core.sols.get(token).estado, "rechazada");
  });

  it("un GET a /aprobar no hace nada (solo POST)", async () => {
    const r = await t.pedir(`/solicitud/${token}/aprobar`);
    assert.equal(r.status, 404);
    assert.ok(!t.core.llamadas.some((l) => l[0] === "aprobar"));
  });
});

describe("elegir la contraseña", () => {
  const T = "A".repeat(42) + "1";
  let t;
  beforeEach(async () => {
    t = await levantar();
    t.core.accesos.set(T, { correo: "ana@aurora.example", nombre: "Ana Quispe" });
  });
  afterEach(() => t.cerrar());

  it("GET: formulario con la cuenta; con un enlace inventado, 404", async () => {
    const r = await t.pedir(`/acceso/${T}`);
    assert.equal(r.status, 200);
    const h = await r.text();
    assert.match(h, /ana@aurora\.example/);
    assert.match(h, /autocomplete="new-password"/);
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal((await t.pedir("/acceso/" + "z".repeat(43))).status, 404);
  });

  it("contraseñas distintas o cortas: 400 con el motivo y sin gastar el enlace", async () => {
    let r = await t.post(`/acceso/${T}`, { password: "una-clave-larga", password2: "otra-clave-larga" });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /no coinciden/);
    r = await t.post(`/acceso/${T}`, { password: "corta", password2: "corta" });
    assert.equal(r.status, 400);
    assert.match(await r.text(), /al menos 10 caracteres/);
    assert.equal((await t.pedir(`/acceso/${T}`)).status, 200);
  });

  it("éxito: confirma, enlaza a /cuenta/ y el enlace no se puede repetir", async () => {
    const r = await t.post(`/acceso/${T}`, { password: "una-clave-larga", password2: "una-clave-larga" });
    assert.equal(r.status, 200);
    assert.match(await r.text(), /href="\/cuenta\/"/);
    assert.equal((await t.post(`/acceso/${T}`, { password: "una-clave-larga", password2: "una-clave-larga" })).status, 404);
  });

  it("tope de intentos por IP", async () => {
    const t2 = await levantar({ limites: { limiteAcceso: crearLimite({ max: 2, ventanaMs: 60000 }) } });
    t2.core.accesos.set(T, { correo: "a@b.com" });
    await t2.post(`/acceso/${T}`, { password: "x", password2: "y" });
    await t2.post(`/acceso/${T}`, { password: "x", password2: "y" });
    assert.equal((await t2.post(`/acceso/${T}`, { password: "x", password2: "y" })).status, 429);
    await t2.cerrar();
  });
});

test("con BASE_PATH los enlaces, el redirect y las URLs de los correos llevan el prefijo", async () => {
  const t = await levantar({ base: "/prefijo" });
  const r = await t.post("/crear-empresa", FORM);
  assert.equal(r.headers.get("location"), "/prefijo/crear-empresa?enviada=1");
  assert.match(t.correo.enviados[0].texto, /https:\/\/www\.ejemplo\.com\/prefijo\/solicitud\/T{42}1/);
  const h = await (await t.pedir("/crear-empresa")).text();
  assert.match(h, /action="\/prefijo\/crear-empresa"/);
  assert.match(h, /href="\/prefijo\/terminos"/);
  await t.cerrar();
});

test("el landing enlaza a /crear-empresa", async () => {
  const t = await levantar();
  assert.match(await (await t.pedir("/")).text(), /href="crear-empresa"/);
  await t.cerrar();
});

describe("correos", () => {
  it("el correo al operador escapa en el HTML los datos de un desconocido", () => {
    const s = { nombre: "<b>x</b>", slug: "a", servicios: ["tobt"], pais: "PE", moneda: "PEN", adminNombre: 'A "B"', adminCorreo: "a@b.com", telefono: "+51987654321", expira: "2026-11-10T12:00:00Z" };
    const c = correoAlOperador({ plataforma: "Ilnapo", s, url: "https://x.com/solicitud/abc" });
    assert.ok(!c.html.includes("<b>x</b>"));
    assert.match(c.html, /&lt;b&gt;x&lt;\/b&gt;/);
    assert.match(c.texto, /abrirlo no cambia nada/);
  });

  it("bienvenida: con cuenta nueva trae el enlace de contraseña; sin él, no", () => {
    const r = { empresa: { nombre: "Aurora", slug: "a" }, admin: { correo: "a@b.com", nombre: "Ana", nuevo: true } };
    assert.match(correoDeBienvenida({ plataforma: "Ilnapo", r, urls: { acceso: "https://x/acceso/T", entrar: "https://x/cuenta/", carta: null } }).texto, /https:\/\/x\/acceso\/T/);
    assert.ok(!/acceso/.test(correoDeBienvenida({ plataforma: "Ilnapo", r, urls: { acceso: null, entrar: "https://x/cuenta/", carta: null } }).texto));
  });
});

describe("módulo de correo (Resend)", () => {
  const cfg = { RESEND_API_KEY: "re_secreta_123", CORREO_REMITENTE: "Ilnapo <hola@ilnapo.com>" };
  const respuesta = (status, cuerpo) => ({ ok: status < 300, status, json: async () => cuerpo });

  it("envía a la API con la clave, el remitente y la clave de idempotencia", async () => {
    const llamadas = [];
    const c = crearCorreo({ env: cfg, fetchFn: async (u, i) => (llamadas.push([u, i]), respuesta(200, { id: "abc" })) });
    assert.equal(c.configurado, true);
    const r = await c.enviar({ para: "ana@x.com", asunto: "Hola\r\nBcc: x@y.z", texto: "cuerpo", html: "<p>cuerpo</p>", claveUnica: "k1" });
    assert.equal(r.id, "abc");
    const [url, init] = llamadas[0];
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.headers.Authorization, "Bearer re_secreta_123");
    assert.equal(init.headers["Idempotency-Key"], "k1");
    const cuerpo = JSON.parse(init.body);
    assert.deepEqual([cuerpo.from, cuerpo.to, cuerpo.subject], ["Ilnapo <hola@ilnapo.com>", ["ana@x.com"], "Hola Bcc: x@y.z"]);
  });

  it("sin configurar: no llama a nadie y lanza un error claro", async () => {
    let llamado = false;
    const c = crearCorreo({ env: {}, fetchFn: async () => { llamado = true; } });
    assert.equal(c.configurado, false);
    await assert.rejects(c.enviar({ para: "a@b.com", asunto: "x", texto: "y" }), (e) => e instanceof ErrorCorreo && /no está configurado/.test(e.message));
    assert.equal(llamado, false);
    assert.equal(crearCorreo({ env: { RESEND_API_KEY: "k", CORREO_REMITENTE: "no es un correo" } }).configurado, false);
  });

  it("errores del proveedor y de red: mensaje útil y la clave nunca aparece", async () => {
    const c1 = crearCorreo({ env: cfg, fetchFn: async () => respuesta(403, { message: "domain not verified" }) });
    await assert.rejects(c1.enviar({ para: "a@b.com", asunto: "x", texto: "y" }), (e) => /403: domain not verified/.test(e.message) && !e.message.includes("re_secreta"));
    const c2 = crearCorreo({ env: cfg, fetchFn: async () => { throw Object.assign(new Error("boom re_secreta_123"), { name: "TypeError" }); } });
    await assert.rejects(c2.enviar({ para: "a@b.com", asunto: "x", texto: "y" }), (e) => e instanceof ErrorCorreo && !JSON.stringify([e.message, e.causa]).includes("re_secreta"));
  });

  it("destinatario inválido o con saltos de línea: no se envía", async () => {
    const c = crearCorreo({ env: cfg, fetchFn: async () => assert.fail("no debía llamar") });
    for (const para of ["", "no", "a@b.com\nBcc: x@y.z", "a@b.com, c@d.com", null])
      await assert.rejects(c.enviar({ para, asunto: "x", texto: "y" }), ErrorCorreo, String(para));
  });

  it("modo consola: imprime en vez de enviar, salvo en producción", async () => {
    const logs = [];
    const c = crearCorreo({ env: { CORREO_MODO: "consola" }, registrar: (m) => logs.push(m), fetchFn: async () => assert.fail("no debía llamar") });
    assert.equal(c.configurado, true);
    await c.enviar({ para: "a@b.com", asunto: "x", texto: "enlace" });
    assert.match(logs[0], /enlace/);
    assert.equal(leerConfigCorreo({ CORREO_MODO: "consola", NODE_ENV: "production" }).configurado, false);
  });
});

test("limitador: cuenta por clave y se renueva con la ventana", () => {
  let t = 0;
  const l = crearLimite({ max: 2, ventanaMs: 1000, ahora: () => t });
  assert.deepEqual([l.usar("a"), l.usar("a"), l.usar("a") > 0, l.usar("b")], [0, 0, true, 0]);
  t = 1001;
  assert.equal(l.usar("a"), 0);
});
