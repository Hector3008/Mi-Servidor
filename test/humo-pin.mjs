// Humo del acceso por PIN contra el gateway en marcha (HTTP real, dos "navegadores": admin y tablet).
// Uso (PowerShell):
//   $env:BASE="http://localhost:3000"; $env:ADMIN_CORREO="admin@prueba.com"; $env:ADMIN_PASSWORD="clave-prueba-1"; node humo-pin.mjs
// Requiere haber corrido crear-datos-humo-pin.mjs (admin y cocina en la empresa de prueba).
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";
const { ADMIN_CORREO, ADMIN_PASSWORD } = process.env;
const COCINA_CORREO = process.env.COCINA_CORREO ?? "cocina@prueba.com";
const PIN = process.env.PIN ?? "4829";
if (!ADMIN_CORREO || !ADMIN_PASSWORD) throw new Error("define ADMIN_CORREO y ADMIN_PASSWORD");

// Cada "navegador" tiene su propio tarro de cookies (varias a la vez: sid y did).
const navegador = () => {
  const cookies = new Map();
  return async (metodo, ruta, cuerpo) => {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        "x-requested-with": "fetch",
        "content-type": "application/json",
        ...(cookies.size ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    for (const c of r.headers.getSetCookie()) {
      const [par, ...attrs] = c.split(";");
      const [nombre, valor] = [par.slice(0, par.indexOf("=")), par.slice(par.indexOf("=") + 1)];
      if (/Max-Age=0/i.test(attrs.join(";"))) cookies.delete(nombre);
      else cookies.set(nombre, valor);
    }
    return { status: r.status, retryAfter: r.headers.get("retry-after"), cuerpo: await r.json().catch(() => null) };
  };
};
const admin = navegador();
const tablet = navegador();
const paso = (n, txt) => console.log(`${n}. ${txt}`);

let r = await admin("POST", "/auth/login", { correo: ADMIN_CORREO, password: ADMIN_PASSWORD });
assert.equal(r.status, 200, "login del admin");
assert.ok(r.cuerpo.empresaActivaId, "el admin debe tener una sola empresa o elegirla");
paso(1, "admin entra con contraseña ✔");

r = await admin("PUT", "/auth/seguridad", { pin: { habilitado: true, maxIntentos: 3, bloqueoMin: 1 } });
assert.equal(r.status, 200);
assert.equal(r.cuerpo.pin.habilitado, true);
paso(2, `PIN habilitado en la empresa (4–6 dígitos, bloqueo tras ${r.cuerpo.pin.maxIntentos} fallos) ✔`);

r = await admin("PUT", "/auth/seguridad", { pin: { maxIntentos: 1 } });
assert.equal(r.status, 400, "fuera de rango debe rechazarse");
paso(3, "opción fuera de rango → 400 ✔ (" + r.cuerpo.error + ")");

r = await admin("GET", "/auth/usuarios");
assert.equal(r.status, 200);
const cocina = r.cuerpo.usuarios.find((u) => u.correo === COCINA_CORREO);
assert.ok(cocina, "no está cocina en la empresa: corre crear-datos-humo-pin.mjs");
r = await admin("PUT", `/auth/usuarios/${cocina.usuarioId}/pin`, { pin: PIN });
assert.equal(r.status, 200);
r = await admin("PUT", `/auth/usuarios/${cocina.usuarioId}/pin`, { pin: "1234" });
assert.equal(r.status, 400, "PIN en secuencia debe rechazarse");
r = await admin("PUT", `/auth/usuarios/${cocina.usuarioId}/pin`, { pin: PIN });
paso(4, "PIN de cocina fijado por el admin; uno fácil (1234) se rechaza ✔");

r = await admin("POST", "/auth/dispositivos/codigo", { nombre: "Tablet cocina (humo)", estacion: "cocina" });
assert.equal(r.status, 201);
const codigo = r.cuerpo.codigo;
paso(5, `código de emparejamiento ${codigo} (vence ${r.cuerpo.expiraTs}) ✔`);

r = await tablet("POST", "/auth/dispositivo/emparejar", { codigo: "ZZZZ-ZZZZ" });
assert.equal(r.status, 401);
r = await tablet("POST", "/auth/dispositivo/emparejar", { codigo });
assert.equal(r.status, 201);
r = await tablet("POST", "/auth/dispositivo/emparejar", { codigo });
assert.equal(r.status, 401, "el código es de un solo uso");
paso(6, "la tablet se empareja una vez; el código no se puede reutilizar ✔");

r = await tablet("GET", "/auth/dispositivo/personas");
assert.equal(r.status, 200);
assert.ok(r.cuerpo.personas.some((p) => p.usuarioId === cocina.usuarioId));
assert.ok(!JSON.stringify(r.cuerpo).includes("@"), "no deben exponerse correos");
paso(7, `la tablet lista a las personas con PIN: ${r.cuerpo.personas.map((p) => p.nombre).join(", ")} ✔`);

r = await tablet("POST", "/auth/dispositivo/entrar", { usuarioId: cocina.usuarioId, pin: "0001" });
assert.equal(r.status, 401);
r = await tablet("POST", "/auth/dispositivo/entrar", { usuarioId: cocina.usuarioId, pin: PIN });
assert.equal(r.status, 200);
paso(8, "PIN malo → 401; PIN correcto → 200 ✔");

r = await tablet("GET", "/auth/yo");
assert.equal(r.status, 200);
assert.equal(r.cuerpo.metodo, "pin");
assert.equal(r.cuerpo.dispositivo.estacion, "cocina");
paso(9, `/auth/yo → método ${r.cuerpo.metodo}, tablet "${r.cuerpo.dispositivo.nombre}", permisos: ${r.cuerpo.permisos.join(", ")} ✔`);

r = await tablet("POST", "/auth/dispositivos/codigo", { nombre: "intruso" });
assert.equal(r.status, 403, "cocina no puede emparejar tablets");
paso(10, "con la sesión de PIN, cocina no puede administrar dispositivos → 403 ✔");

for (let i = 1; i <= 3; i++) r = await tablet("POST", "/auth/dispositivo/entrar", { usuarioId: cocina.usuarioId, pin: "0001" });
assert.equal(r.status, 423);
assert.equal(r.cuerpo.codigo, "PIN_BLOQUEADO");
assert.ok(r.retryAfter);
r = await tablet("POST", "/auth/dispositivo/entrar", { usuarioId: cocina.usuarioId, pin: PIN });
assert.equal(r.status, 423, "bloqueado incluso con el PIN correcto");
paso(11, `3 fallos → 423 PIN_BLOQUEADO (reintentar en ${r.cuerpo.reintentarEnSeg}s), también con el PIN bueno ✔`);

r = await admin("PUT", `/auth/usuarios/${cocina.usuarioId}/pin`, { pin: PIN });
assert.equal(r.status, 200);
r = await tablet("POST", "/auth/dispositivo/entrar", { usuarioId: cocina.usuarioId, pin: PIN });
assert.equal(r.status, 200);
paso(12, "el admin restablece el PIN y eso desbloquea ✔");

r = await admin("GET", "/auth/dispositivos");
const disp = r.cuerpo.dispositivos.find((d) => d.nombre === "Tablet cocina (humo)" && d.activo);
assert.ok(disp);
r = await admin("DELETE", `/auth/dispositivos/${disp.id}`);
assert.equal(r.status, 200);
r = await tablet("GET", "/auth/yo");
assert.equal(r.status, 401, "revocada la tablet, su sesión muere al instante");
r = await tablet("GET", "/auth/dispositivo/personas");
assert.equal(r.status, 401);
assert.equal(r.cuerpo.codigo, "DISPOSITIVO_INVALIDO");
paso(13, "el admin revoca la tablet: su sesión y su emparejamiento dejan de valer al instante ✔");

console.log("\nHUMO PIN OK");
