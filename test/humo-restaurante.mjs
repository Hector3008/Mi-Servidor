// Humo del servicio restaurante contra el gateway en marcha (HTTP real). VA EN test/ DEL GATEWAY, no en la del repo restaurante ni en core (5.9).
// Uso (PowerShell), con el gateway arrancado SIN --watch:
//   $env:BASE="http://localhost:3000"; $env:ADMIN_CORREO="admin@prueba.com"; $env:ADMIN_PASSWORD="clave-prueba-1"; node humo-restaurante.mjs
// Requiere haber corrido crear-datos-humo-pin.mjs (admin en la empresa de prueba, con el servicio restaurante contratado)
// y que el gateway monte /restaurante, /catalogo y /empleados.
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";
const { ADMIN_CORREO, ADMIN_PASSWORD } = process.env;
if (!ADMIN_CORREO || !ADMIN_PASSWORD) throw new Error("define ADMIN_CORREO y ADMIN_PASSWORD");

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
    return { status: r.status, cuerpo: await r.json().catch(() => null) };
  };
};
const admin = navegador();
const mesero = navegador();
const sinSesion = navegador();
const paso = (n, txt) => console.log(`${n}. ${txt}`);
const marca = Date.now().toString(36);
const R = "/restaurante/pedidos";

let r = await admin("POST", "/auth/login", { correo: ADMIN_CORREO, password: ADMIN_PASSWORD });
assert.equal(r.status, 200, "login del admin");
paso(1, "admin entra con contraseña ✔");

for (const [codigo, nombre, precio] of [[`HUMO-${marca}-CAFE`, "Café humo", 6.5], [`HUMO-${marca}-TORTA`, "Torta humo", 9.9]]) {
  r = await admin("POST", "/catalogo", { codigo, nombre, precio });
  assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
}
const CAFE = `HUMO-${marca}-CAFE`;
const TORTA = `HUMO-${marca}-TORTA`;
paso(2, "dos ítems de catálogo creados ✔");

r = await admin("POST", R, { canal: "salon", mesa: "4", notas: "sin azúcar", lineas: [{ codigo: CAFE.toLowerCase(), cantidad: 2 }, { codigo: TORTA }, { libre: { nombre: "Postre del día", precio: 5 } }] });
assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
assert.match(r.cuerpo.code, /^PD-\d{7}$/);
assert.equal(r.cuerpo.estado, "abierta");
assert.equal(r.cuerpo.doc.total, 27.9);
assert.deepEqual(r.cuerpo.snapshot.lineas.map((l) => l.origen), ["catalogo", "catalogo", "libre"]);
assert.equal(r.cuerpo.snapshot.lineas[0].codigo, CAFE);
const code = r.cuerpo.code;
paso(3, `pedido ${code}: total 27.9, línea libre fuera del catálogo, código del catálogo con sus mayúsculas ✔`);

for (const [mal, esperado] of [
  [{ canal: "salon", lineas: [{ codigo: CAFE }] }, 400],
  [{ canal: "salon", mesa: "1", lineas: [{ codigo: CAFE, cantidad: 0 }] }, 400],
  [{ canal: "delivery", lineas: [{ codigo: CAFE }] }, 400],
  [{ canal: "salon", mesa: "1", lineas: [{ codigo: `NO-EXISTE-${marca}` }] }, 409],
]) {
  r = await admin("POST", R, mal);
  assert.equal(r.status, esperado, JSON.stringify(mal));
}
paso(4, "pedidos inválidos → 400 (mesa, cantidad, delivery sin entrega) y 409 ítem inexistente, sin crear nada ✔");

r = await admin("PUT", `${R}/${code}`, { lineas: [{ codigo: CAFE, cantidad: 3 }] });
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.version, 2);
assert.equal(r.cuerpo.doc.total, 19.5);
r = await admin("PUT", `${R}/${code}`, { esperaVersion: 1, notas: "otra" });
assert.equal(r.status, 409);
assert.equal(r.cuerpo.codigo, "CONFLICTO_VERSION");
r = await admin("GET", `${R}/${code}?version=1`);
assert.equal(r.status, 200);
assert.equal(r.cuerpo.doc.total, 27.9);
paso(5, "edición crea la versión 2; una edición con versión vieja → 409; la versión 1 se conserva ✔");

// Un mesero de verdad: la plantilla da estacion:creacion pero no cocina ni administración
const correoMesero = `mesero.${marca}@humo.com`;
r = await admin("POST", "/empleados", { nombre: `Mesero ${marca}`, correo: correoMesero, rol: "mesero", password: "Temporal-123456" });
assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
r = await mesero("POST", "/auth/login", { correo: correoMesero, password: "Temporal-123456" });
assert.equal(r.status, 200);
r = await mesero("POST", "/auth/password", { passwordActual: "Temporal-123456", passwordNueva: "Definitiva-123456" });
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
paso(6, "mesero dado de alta y con su contraseña propia ✔");

r = await mesero("POST", `${R}/${code}/enviar`, {});
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.estado, "en_cocina");
r = await mesero("POST", `${R}/${code}/lista`, {});
assert.equal(r.status, 403);
assert.equal(r.cuerpo.codigo, "PERMISO_INSUFICIENTE");
paso(7, "el mesero envía a cocina, pero marcar lista (estacion:cocina) → 403 ✔");

r = await admin("POST", `${R}/${code}/lista`, {});
assert.equal(r.status, 200);
r = await mesero("POST", `${R}/${code}/entregar`, {});
assert.equal(r.status, 200);
r = await mesero("POST", `${R}/${code}/cobrar`, {});
assert.equal(r.status, 403);
r = await mesero("PUT", `${R}/${code}`, { notas: "tarde" });
assert.equal(r.status, 400);
assert.equal(r.cuerpo.codigo, "ESTADO_NO_EDITABLE");
r = await admin("POST", `${R}/${code}/cobrar`, {});
assert.equal(r.status, 200);
assert.equal(r.cuerpo.estado, "pagada");
assert.deepEqual(r.cuerpo.historial.map((h) => h.a), ["abierta", "en_cocina", "lista", "entregada", "pagada"]);
paso(8, "lista → entregada → pagada (cobrar solo con administración, 403 al mesero); entregado no se edita ✔");

r = await admin("POST", R, { canal: "llevar", referencia: "Ana", lineas: [{ codigo: CAFE }] });
const otro = r.cuerpo.code;
r = await admin("POST", `${R}/${otro}/anular`, {});
assert.equal(r.status, 400);
assert.equal(r.cuerpo.codigo, "MOTIVO_REQUERIDO");
r = await admin("POST", `${R}/${otro}/anular`, { motivo: { codigo: "cliente_se_fue", detalle: "humo" } });
assert.equal(r.status, 200);
assert.equal(r.cuerpo.estado, "anulada");
r = await admin("POST", `${R}/${otro}/enviar`, {});
assert.equal(r.status, 400);
paso(9, "anular pide motivo, queda en estado final y no avanza ✔");

r = await admin("GET", `${R}?estado=pagada,anulada`);
assert.equal(r.status, 200);
assert.ok(r.cuerpo.pedidos.some((p) => p.code === code) && r.cuerpo.pedidos.some((p) => p.code === otro));
r = await admin("GET", `${R}/PD-0999999`);
assert.equal(r.status, 404);
r = await sinSesion("GET", R);
assert.equal(r.status, 401);
r = await fetch(BASE + R, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
assert.ok([401, 403].includes(r.status));
paso(10, "lista por estado, 404 inexistente, 401 sin sesión ✔");

console.log("\nHumo del restaurante: todo bien.");
