// Humo de la pieza 3 desde el gateway. Uso (en la carpeta de Mi-Servidor):
//   $env:MONGODB_URI="..."; node humo-documentos.mjs
// Trabaja en la base "mi-servidor-humo" (no toca la de producción) y borra sus colecciones al terminar.
import mongoose from "mongoose";
import { createCore, conEmpresa, ErrorDocumento } from "core";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Define MONGODB_URI");

const COLECCIONES = ["documentos", "documento_versiones", "contadores"];
const conn = await mongoose
  .createConnection(uri, { dbName: "mi-servidor-humo" })
  .asPromise();
for (const c of COLECCIONES) await conn.db.dropCollection(c).catch(() => {});

const core = createCore({ connection: conn });
const docs = core.documentos;
await docs.listo();

docs.registrarTipo({
  tipo: "proforma",
  prefijo: "DP",
  estadoInicial: "borrador",
  transiciones: {
    borrador: ["cotizacion", "orden_salida", "descartado"],
    cotizacion: ["orden_salida", "rechazada"],
    orden_salida: ["en_revision"],
    en_revision: ["cerrada", "orden_salida"],
  },
  permisos: { en_revision: "estacion:revision", cerrada: "estacion:revision" },
  motivos: { rechazada: ["precio", "otro"] },
});

for (const e of ["creado", "estado", "version"])
  docs.on(e, (ev) => console.log(`  evento ${e}:`, ev.documentoCode, JSON.stringify(ev.datos)));

const empresaId = new mongoose.Types.ObjectId();
const usuarioId = new mongoose.Types.ObjectId();

try {
  await conEmpresa(empresaId, async () => {
    const paso = (t) => console.log(`\n${t}`);

    paso("1. crear");
    const d = await docs.crear({ tipo: "proforma", snapshot: { cliente: "Cliente de prueba" }, doc: { lineas: [{ codigo: "ZM-1", cant: 1 }] }, usuarioId });
    console.log(" ", d.code, d.estado, "v" + d.version);

    paso("2. borrador → cotizacion → orden_salida (sin versión nueva)");
    await docs.transicionar({ code: d.code, a: "cotizacion", usuarioId });
    await docs.transicionar({ code: d.code, a: "orden_salida", usuarioId });

    paso("3. entrar a en_revision sin permiso (debe fallar)");
    try {
      await docs.transicionar({ code: d.code, a: "en_revision", usuarioId, permisos: ["documento:*"] });
      console.log("  ERROR: no falló");
    } catch (e) {
      console.log("  ok →", e instanceof ErrorDocumento ? e.codigo : e);
    }

    paso("4. en_revision con permiso, y cerrar editando en la misma operación");
    await docs.transicionar({ code: d.code, a: "en_revision", usuarioId, permisos: ["estacion:revision"] });
    const cerrado = await docs.transicionar({
      code: d.code, a: "cerrada", usuarioId, permisos: ["estacion:revision"],
      doc: { lineas: [{ codigo: "ZM-9600025", cant: 1 }], revisado: true }, esperaVersion: 1,
    });
    console.log(" ", cerrado.code, cerrado.estado, "v" + cerrado.version, "| historial:", cerrado.historial.map((h) => h.a).join(" → "));

    paso("5. versión 1 sigue guardada");
    const v1 = await docs.obtener({ code: d.code, version: 1 });
    console.log("  v1 doc:", JSON.stringify(v1.payload.doc));

    paso("6. rechazo con motivo");
    const e2 = await docs.crear({ tipo: "proforma", usuarioId });
    await docs.transicionar({ code: e2.code, a: "cotizacion", usuarioId });
    const r = await docs.transicionar({ code: e2.code, a: "rechazada", usuarioId, motivo: { codigo: "precio", detalle: "pidió descuento" } });
    console.log(" ", r.code, r.estado, JSON.stringify(r.historial.at(-1).motivo));
  });
  console.log("\nHUMO OK");
} finally {
  for (const c of COLECCIONES) await conn.db.dropCollection(c).catch(() => {});
  await conn.close();
}
