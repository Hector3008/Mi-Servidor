// Humo del catálogo contra el gateway en marcha (HTTP real).
// Uso (PowerShell), con el gateway arrancado SIN --watch:
//   $env:BASE="http://localhost:3000"; $env:ADMIN_CORREO="admin@prueba.com"; $env:ADMIN_PASSWORD="clave-prueba-1"; node humo-catalogo.mjs
// Requiere haber corrido crear-datos-humo-pin.mjs (admin y rol mesero en la empresa de prueba) y que el gateway
// monte /catalogo y /empleados. `instantanea` (las líneas libres) no tiene ruta HTTP: la cubren las pruebas del núcleo.
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3000";
const { ADMIN_CORREO, ADMIN_PASSWORD } = process.env;
if (!ADMIN_CORREO || !ADMIN_PASSWORD)
  throw new Error("define ADMIN_CORREO y ADMIN_PASSWORD");

const navegador = () => {
  const cookies = new Map();
  return async (metodo, ruta, cuerpo) => {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: {
        "x-requested-with": "fetch",
        "content-type": "application/json",
        ...(cookies.size
          ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") }
          : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    for (const c of r.headers.getSetCookie()) {
      const [par, ...attrs] = c.split(";");
      const [nombre, valor] = [
        par.slice(0, par.indexOf("=")),
        par.slice(par.indexOf("=") + 1),
      ];
      if (/Max-Age=0/i.test(attrs.join(";"))) cookies.delete(nombre);
      else cookies.set(nombre, valor);
    }
    return { status: r.status, cuerpo: await r.json().catch(() => null) };
  };
};
const admin = navegador();
const mesero = navegador();
const paso = (n, txt) => console.log(`${n}. ${txt}`);

// Códigos distintos en cada corrida: el humo se puede repetir.
const marca = Date.now().toString(36).toUpperCase();
const COD = (n) => `HUMO-${marca}-${n}`;
const CATEGORIA = `Humo ${marca}`;

let r = await admin("POST", "/auth/login", {
  correo: ADMIN_CORREO,
  password: ADMIN_PASSWORD,
});
assert.equal(r.status, 200, "login del admin");
paso(1, "admin entra con contraseña ✔");

// --- alta ---
r = await admin("POST", "/catalogo", {
  codigo: COD("01"),
  nombre: "Café americano",
  categoria: CATEGORIA,
  precio: 12.5,
  atributos: { TAMANO: "grande", CALORIAS: 5 },
});
assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.codigo, COD("01"));
assert.equal(r.cuerpo.precio, 12.5);
assert.equal(r.cuerpo.activo, true);
assert.deepEqual(r.cuerpo.atributos, { TAMANO: "grande", CALORIAS: 5 });
const cafe = r.cuerpo.id;

r = await admin("POST", "/catalogo", { codigo: COD("02"), nombre: "Solo nombre" });
assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.categoria, null);
assert.equal(r.cuerpo.precio, null);
assert.deepEqual(r.cuerpo.atributos, {});
const simple = r.cuerpo.id;
paso(2, "alta completa y alta solo con código y nombre (categoría y precio quedan en null) ✔");

// --- duplicado y validación ---
r = await admin("POST", "/catalogo", {
  codigo: COD("01").toLowerCase(),
  nombre: "Otro café",
});
assert.equal(r.status, 409);
assert.equal(r.cuerpo.codigo, "ITEM_DUPLICADO");
assert.equal(r.cuerpo.itemId, cafe);
paso(3, "mismo código en minúsculas → 409 ITEM_DUPLICADO con el id del existente ✔");

for (const [cuerpo, que] of [
  [{ codigo: COD("03"), nombre: "Tres decimales", precio: 1.234 }, "precio con 3 decimales"],
  [{ codigo: COD("03"), nombre: "Negativo", precio: -1 }, "precio negativo"],
  [{ codigo: COD("03"), nombre: "Texto", precio: "12.5" }, "precio como texto"],
  [{ codigo: COD("03") }, "sin nombre"],
  [{ nombre: "Sin código" }, "sin código"],
  [{ codigo: "con espacio", nombre: "x" }, "código con espacio"],
  [{ codigo: COD("03"), nombre: "x", atributos: { $raro: 1 } }, "atributo con $"],
]) {
  r = await admin("POST", "/catalogo", cuerpo);
  assert.equal(r.status, 400, `${que}: ${JSON.stringify(r.cuerpo)}`);
}
r = await admin("GET", `/catalogo/codigo/${COD("03")}`);
assert.equal(r.status, 404, "ninguno de los inválidos se guardó");
paso(4, "inválidos (3 decimales, negativo, texto, sin nombre o código, atributo con $) → 400 y no se guarda nada ✔");

// --- búsqueda ---
r = await admin("GET", `/catalogo/codigo/${COD("01").toLowerCase()}`);
assert.equal(r.status, 200);
assert.equal(r.cuerpo.id, cafe);
r = await admin("GET", `/catalogo/${cafe}`);
assert.equal(r.status, 200);
r = await admin("GET", `/catalogo?q=${encodeURIComponent(`humo-${marca.toLowerCase()}`)}`);
assert.equal(r.status, 200);
assert.ok(r.cuerpo.items.some((i) => i.id === cafe) && r.cuerpo.items.some((i) => i.id === simple));
r = await admin("GET", `/catalogo?q=${encodeURIComponent("solo nom")}`);
assert.ok(r.cuerpo.items.some((i) => i.id === simple));
r = await admin("GET", `/catalogo?categoria=${encodeURIComponent(CATEGORIA)}`);
assert.deepEqual(r.cuerpo.items.map((i) => i.id), [cafe]);
r = await admin("GET", "/catalogo/categorias");
assert.equal(r.status, 200);
assert.deepEqual(r.cuerpo.categorias.find((c) => c.categoria === CATEGORIA), {
  categoria: CATEGORIA,
  cantidad: 1,
});
paso(5, "búsqueda por código (sin distinguir mayúsculas), por nombre, por categoría y lista de categorías ✔");

// --- corrección ---
r = await admin("PUT", `/catalogo/${cafe}`, { precio: 15, atributos: { MARCA: "Casa" } });
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.precio, 15);
assert.deepEqual(r.cuerpo.atributos, { TAMANO: "grande", CALORIAS: 5, MARCA: "Casa" });
r = await admin("PUT", `/catalogo/${cafe}`, { atributos: { CALORIAS: null }, categoria: null });
assert.deepEqual(r.cuerpo.atributos, { TAMANO: "grande", MARCA: "Casa" });
assert.equal(r.cuerpo.categoria, null);
assert.equal(r.cuerpo.precio, 15, "lo que no viene no se toca");
r = await admin("PUT", `/catalogo/${cafe}`, { precio: null });
assert.equal(r.cuerpo.precio, null);
r = await admin("PUT", `/catalogo/${cafe}`, { codigo: COD("99") });
assert.equal(r.status, 400, "el código no se puede cambiar");
r = await admin("PUT", `/catalogo/${cafe}`, { nombre: null });
assert.equal(r.status, 400, "el nombre no se puede quitar");
paso(6, "corregir: precio, atributos clave por clave, quitar categoría y precio; código y nombre protegidos ✔");

// --- importar ---
const A = COD("10");
const B = COD("11");
const filasBuenas = [
  { codigo: A, nombre: "Importado A", categoria: CATEGORIA, precio: 5 },
  { codigo: B.toLowerCase(), nombre: "Importado B", precio: 7.9, atributos: { MARCA: "X" } },
  { codigo: COD("02"), precio: 3 }, // existente: solo cambia el precio
];
r = await admin("POST", "/catalogo/importar", { filas: filasBuenas, simular: true });
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.simulado, true);
assert.equal(r.cuerpo.creados, 2);
assert.equal(r.cuerpo.actualizados, 1);
r = await admin("GET", `/catalogo/codigo/${A}`);
assert.equal(r.status, 404, "simular no escribe");

r = await admin("POST", "/catalogo/importar", { filas: filasBuenas });
assert.equal(r.status, 200, JSON.stringify(r.cuerpo));
assert.equal(r.cuerpo.creados, 2);
assert.equal(r.cuerpo.actualizados, 1);
r = await admin("GET", `/catalogo/codigo/${COD("02")}`);
assert.equal(r.cuerpo.precio, 3);
assert.equal(r.cuerpo.nombre, "Solo nombre", "lo que no viene no se pisa");
r = await admin("POST", "/catalogo/importar", { filas: filasBuenas });
assert.equal(r.cuerpo.creados, 0, "repetir la importación es seguro");
assert.equal(r.cuerpo.actualizados, 3);

const D = COD("12");
r = await admin("POST", "/catalogo/importar", {
  filas: [
    { codigo: D, nombre: "Válida" },
    { codigo: COD("13"), nombre: "Mala", precio: 1.234 },
  ],
});
assert.equal(r.status, 400);
assert.equal(r.cuerpo.codigo, "IMPORTACION_INVALIDA");
assert.equal(r.cuerpo.errores[0].fila, 2);
r = await admin("GET", `/catalogo/codigo/${D}`);
assert.equal(r.status, 404, "una fila inválida no deja guardar ninguna");
paso(7, "importar: simular no escribe, crea y actualiza por código, repetir es seguro, una fila mala frena todo ✔");

// --- mesero: lee, no cambia nada ---
// (la plantilla de mesero trae catalogo:leer; si la empresa de prueba lo perdió, este paso falla con 403)
const correoMesero = `mesero.${marca.toLowerCase()}@humo.com`;
r = await admin("POST", "/empleados", {
  nombre: "Mesero Humo",
  correo: correoMesero,
  rol: "mesero",
  password: "temporal-12345",
});
assert.equal(r.status, 201, JSON.stringify(r.cuerpo));
r = await mesero("POST", "/auth/login", { correo: correoMesero, password: "temporal-12345" });
assert.equal(r.status, 200);
r = await mesero("POST", "/auth/password", {
  passwordActual: "temporal-12345",
  passwordNueva: "nueva-clave-larga-1",
});
assert.equal(r.status, 200);
r = await mesero("GET", `/catalogo?q=${encodeURIComponent(COD("01"))}`);
assert.equal(r.status, 200, "el mesero lee");
r = await mesero("POST", "/catalogo", { codigo: COD("20"), nombre: "No debería" });
assert.equal(r.status, 403, "el mesero no crea");
r = await mesero("PUT", `/catalogo/${simple}`, { nombre: "Cambiado" });
assert.equal(r.status, 403, "el mesero no edita");
r = await mesero("POST", "/catalogo/importar", { filas: [{ codigo: COD("21"), nombre: "No" }] });
assert.equal(r.status, 403, "el mesero no importa");
r = await mesero("POST", `/catalogo/${simple}/desactivar`);
assert.equal(r.status, 403, "el mesero no da de baja");
paso(8, "mesero: lee (200); crear, editar, importar y desactivar → 403 ✔");

const sinSesion = navegador();
r = await sinSesion("GET", "/catalogo");
assert.equal(r.status, 401);
paso(9, "sin sesión → 401 ✔");

// --- baja ---
r = await admin("POST", `/catalogo/${simple}/desactivar`);
assert.equal(r.status, 200);
assert.equal(r.cuerpo.activo, false);
r = await admin("POST", `/catalogo/${simple}/desactivar`);
assert.equal(r.status, 409, "ya estaba desactivado");
r = await admin("GET", `/catalogo?q=${encodeURIComponent(COD("02"))}`);
assert.equal(r.cuerpo.items.length, 0, "desactivado no se lista");
r = await admin("GET", `/catalogo?q=${encodeURIComponent(COD("02"))}&inactivos=1`);
assert.equal(r.cuerpo.items.length, 1);
r = await admin("GET", `/catalogo/${simple}`);
assert.equal(r.status, 200, "sigue consultable");
r = await admin("POST", `/catalogo/${simple}/reactivar`);
assert.equal(r.cuerpo.activo, true);
paso(10, "baja y reactivación (no se lista desactivado, sigue consultable) ✔");

console.log(
  `\nHumo del catálogo: todo bien. (Ítems de prueba HUMO-${marca}-* y un empleado mesero quedan en la base del gateway.)`,
);
