// Humo de empleados contra el gateway real (HTTP). Necesita el gateway arrancado SIN --watch.
//   node --env-file=.env test/humo-empleados.mjs
// Variables: MONGODB_URI, MONGODB_DB (las del gateway; se usan solo para crear la empresa de prueba),
// GATEWAY_URL (por defecto http://localhost:3000) y BASE_PATH (si el gateway lo usa).
import mongoose from "mongoose";
import { createCore } from "core";

const BASE = (process.env.GATEWAY_URL ?? "http://localhost:3000") + (process.env.BASE_PATH ?? "");
const T = Date.now();
const PASS_ADMIN = "clave-admin-humo-1";
let fallos = 0;
const ok = (cond, msg, extra) => {
  if (!cond) fallos++;
  console.log(`${cond ? "  ok " : "  FALLA"} ${msg}${!cond && extra !== undefined ? " -> " + JSON.stringify(extra) : ""}`);
};

function cliente() {
  const jar = new Map();
  return async (method, path, body, { csrf = true } = {}) => {
    const headers = { "content-type": "application/json" };
    if (csrf) headers["x-requested-with"] = "humo";
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    const r = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    for (const c of r.headers.getSetCookie()) {
      const [kv] = c.split(";");
      const i = kv.indexOf("=");
      const v = kv.slice(i + 1);
      if (v) jar.set(kv.slice(0, i), v);
      else jar.delete(kv.slice(0, i));
    }
    let json = null;
    try { json = await r.json(); } catch {}
    return { status: r.status, body: json, headers: r.headers };
  };
}

// --- datos de prueba: una empresa nueva por corrida ---
const conn = await mongoose
  .createConnection(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "mi-servidor" })
  .asPromise();
const core = createCore({ connection: conn });
await core.auth.listo();
const empresa = await core.empresas.crearEmpresa({ nombre: `Humo ${T}`, slug: `humo-${T}`, servicios: ["restaurante"] });
const admin = await core.empresas.crearUsuario({ correo: `admin-${T}@humo.test`, password: PASS_ADMIN, nombre: "Admin Humo" });
await core.empresas.agregarMiembro({ empresaId: empresa._id, usuarioId: admin._id, rol: "admin" });
await core.auth.guardarSeguridad({ empresaId: empresa._id, pin: { habilitado: true } });
const adminId = String(admin._id);
console.log(`Empresa de prueba: humo-${T}`);

const A = cliente();
console.log("1. admin entra");
let r = await A("POST", "/auth/login", { correo: `admin-${T}@humo.test`, password: PASS_ADMIN });
ok(r.status === 200, "login del admin", r);

console.log("2. alta con contraseña temporal: cambio obligatorio");
r = await A("POST", "/empleados", { nombre: "Beto", correo: `beto-${T}@humo.test`, rol: "mesero", password: "temporal-beto-123" });
ok(r.status === 201 && r.body.passwordTemporal === null, "alta 201 sin devolver la contraseña dada", r);
const B = cliente();
r = await B("POST", "/auth/login", { correo: `beto-${T}@humo.test`, password: "temporal-beto-123" });
ok(r.status === 200 && r.body.debeCambiarPassword === true, "login avisa debeCambiarPassword", r);
r = await B("PUT", "/auth/pin", {});
ok(r.status === 403 && r.body.codigo === "CAMBIO_PASSWORD_REQUERIDO", "ruta normal bloqueada hasta cambiarla", r);
r = await B("GET", "/auth/yo");
ok(r.status === 200, "/auth/yo sí responde", r);
r = await B("POST", "/auth/password", { passwordActual: "temporal-beto-123", passwordNueva: "clave-nueva-beto-1" });
ok(r.status === 200, "cambia su contraseña", r);
r = await B("PUT", "/auth/pin", {});
ok(r.body?.codigo !== "CAMBIO_PASSWORD_REQUERIDO", "ya no está bloqueado", r);
r = await B("POST", "/auth/password", { passwordActual: "clave-nueva-beto-1", passwordNueva: "clave-nueva-beto-1" }, { csrf: false });
ok(r.status === 403 && r.body.codigo === "CSRF", "sin x-requested-with: 403 CSRF", r);

console.log("3. alta solo con PIN: entra en la tablet");
r = await A("POST", "/empleados", { nombre: "Pedro Pin", correo: `pedro-${T}@humo.test`, rol: "cocina", pin: "2580" });
ok(r.status === 201 && r.body.tienePin === true && r.body.passwordTemporal === null, "alta solo con PIN", r);
const pedroId = r.body.usuarioId;
r = await A("POST", "/auth/dispositivos/codigo", { nombre: "Tablet humo" });
ok(r.status === 201 && r.body.codigo, "código de emparejamiento", r);
const TAB = cliente();
r = await TAB("POST", "/auth/dispositivo/emparejar", { codigo: r.body.codigo });
ok(r.status === 201, "tablet emparejada", r);
r = await TAB("GET", "/auth/dispositivo/personas");
ok(r.status === 200 && JSON.stringify(r.body).includes(pedroId), "la tablet lista a Pedro", r);
r = await TAB("POST", "/auth/dispositivo/entrar", { usuarioId: pedroId, pin: "2580" });
ok(r.status === 200, "Pedro entra con su PIN", r);
r = await TAB("GET", "/auth/yo");
ok(r.status === 200 && r.body.metodo === "pin", "sesión de PIN activa", r);

console.log("4. alta con las dos formas, contraseña generada");
r = await A("POST", "/empleados", { nombre: "Dos Vías", correo: `dos-${T}@humo.test`, rol: "mesero", generarPassword: true, pin: "1357" });
ok(r.status === 201 && r.body.passwordTemporal?.length === 12 && r.headers.get("cache-control") === "no-store", "alta 201, contraseña generada y sin caché", r.body);
r = await cliente()("POST", "/auth/login", { correo: `dos-${T}@humo.test`, password: r.body.passwordTemporal });
ok(r.status === 200 && r.body.debeCambiarPassword === true, "entra con la generada", r);

console.log("5. un encargado no puede tocar a un admin");
r = await A("POST", "/empleados/roles", { nombre: "encargado", permisos: ["usuario:gestionar", "rol:gestionar", "documento:*", "estacion:cocina"] });
ok(r.status === 201, "admin crea el rol encargado", r);
r = await A("POST", "/empleados", { nombre: "Enc", correo: `enc-${T}@humo.test`, rol: "encargado", password: "temporal-enc-1234" });
ok(r.status === 201, "alta del encargado", r);
const E = cliente();
await E("POST", "/auth/login", { correo: `enc-${T}@humo.test`, password: "temporal-enc-1234" });
r = await E("POST", "/auth/password", { passwordActual: "temporal-enc-1234", passwordNueva: "clave-nueva-enc-1" });
ok(r.status === 200, "el encargado cambia su contraseña", r);
r = await E("GET", "/empleados");
ok(r.status === 200 && r.body.empleados.length >= 5, "el encargado lista el equipo", r.status);
r = await E("POST", "/empleados", { nombre: "N", correo: `n-${T}@humo.test`, rol: "admin", password: "temporal-n-123456" });
ok(r.status === 403 && r.body.codigo === "SIN_ALCANCE", "no puede dar el rol admin", r);
for (const [m, p, b, que] of [
  ["PUT", `/empleados/${adminId}/pin`, { pin: "2580" }, "PIN del admin (/empleados)"],
  ["PUT", `/auth/usuarios/${adminId}/pin`, { pin: "2580" }, "PIN del admin (ruta vieja de /auth)"],
  ["POST", `/empleados/${adminId}/password`, { generarPassword: true }, "restablecer contraseña del admin"],
  ["POST", `/empleados/${adminId}/desactivar`, undefined, "dar de baja al admin"],
  ["PUT", `/empleados/${adminId}/rol`, { rol: "mesero" }, "cambiar el rol del admin"],
]) {
  r = await E(m, p, b);
  ok(r.status === 403 && r.body.codigo === "SIN_ALCANCE", `rechazado: ${que}`, r);
}
r = await E("POST", "/empleados/roles", { nombre: "ayudante", permisos: ["estacion:cocina"] });
ok(r.status === 201, "sí puede crear un rol con permisos que tiene", r);
r = await E("POST", "/empleados/roles", { nombre: "poderoso", permisos: ["*"] });
ok(r.status === 403, "no puede crear un rol con *", r);
r = await E("GET", "/empleados/roles");
ok(r.status === 200, "lista los roles (tiene rol:gestionar)", r.status);

console.log("6. baja y reactivación");
r = await A("POST", `/empleados/${pedroId}/desactivar`);
ok(r.status === 200 && r.body.sesionesCerradas >= 1, "baja de Pedro cierra su sesión de tablet", r);
r = await TAB("GET", "/auth/yo");
ok(r.status === 401, "su sesión de PIN ya no vale", r);
r = await TAB("POST", "/auth/dispositivo/entrar", { usuarioId: pedroId, pin: "2580" });
ok(r.status >= 400, "no puede volver a entrar", r);
r = await A("GET", "/empleados?inactivos=1");
ok(r.body.empleados.some((f) => f.usuarioId === pedroId && f.activa === false && f.tienePin === false), "sale como inactivo y sin PIN", r.status);
r = await A("POST", `/empleados/${pedroId}/reactivar`);
ok(r.status === 200 && r.body.activa === true && r.body.tienePin === false, "reactivado, sin PIN", r);
r = await A("PUT", `/empleados/${pedroId}/pin`, { pin: "2580" });
ok(r.status === 200, "el admin le vuelve a poner PIN", r);

await conn.close();
console.log(fallos ? `\nFALLARON ${fallos} comprobaciones` : "\nTODO OK");
process.exit(fallos ? 1 : 0);
