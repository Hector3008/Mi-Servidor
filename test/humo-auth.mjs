import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";
const { CORREO, PASSWORD } = process.env;
if (!CORREO || !PASSWORD) throw new Error("define CORREO y PASSWORD");

const H = { "x-requested-with": "fetch", "content-type": "application/json" };
let cookie = "";
const pedir = async (metodo, ruta, cuerpo) => {
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { ...H, ...(cookie ? { cookie } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const set = r.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
  return { status: r.status, set, cuerpo: await r.json().catch(() => null) };
};

let r = await pedir("GET", "/humo/auth");
assert.equal(r.status, 401, "sin cookie debe dar 401");
console.log("1. sin sesión → 401 ✔");

r = await pedir("POST", "/auth/login", {
  correo: CORREO,
  password: "incorrecta-xyz",
});
assert.equal(r.status, 401);
console.log("2. contraseña mala → 401 ✔ (", r.cuerpo.error, ")");

r = await pedir("POST", "/auth/login", { correo: CORREO, password: PASSWORD });
assert.equal(r.status, 200);
assert.match(r.set, /HttpOnly/);
assert.ok(
  !JSON.stringify(r.cuerpo).includes(cookie.slice(4)),
  "el token no debe ir en el cuerpo",
);
console.log(
  "3. login → 200, cookie HttpOnly, empresa activa:",
  r.cuerpo.empresaActivaId,
);

if (!r.cuerpo.empresaActivaId) {
  r = await pedir("POST", "/auth/empresa", {
    empresaId: r.cuerpo.empresas[0].id,
  });
  assert.equal(r.status, 200);
  console.log("   elegida la empresa", r.cuerpo.empresaActivaId);
}

r = await pedir("GET", "/auth/yo");
assert.equal(r.status, 200);
console.log(
  "4. /auth/yo →",
  r.cuerpo.usuario.correo,
  "| permisos:",
  r.cuerpo.permisos.join(", "),
);

r = await pedir("GET", "/humo/auth");
assert.equal(r.status, 200, "con sesión y permiso debe dar 200");
console.log(
  "5. ruta protegida → 200, req.auth =",
  JSON.stringify(r.cuerpo.auth),
);

const viejo = cookie;
r = await pedir("POST", "/auth/logout");
assert.equal(r.status, 200);
cookie = viejo; // reutilizar la cookie ya cerrada
r = await pedir("GET", "/humo/auth");
assert.equal(r.status, 401, "tras logout la cookie vieja no debe servir");
console.log("6. logout → la cookie vieja da 401 ✔ (revocación real)");
console.log("\nHUMO AUTH OK");