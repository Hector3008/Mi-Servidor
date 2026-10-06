// Humo de la pieza 4. Va en la raíz de Mi-Servidor (donde está instalado `core`).
// Uso (PowerShell):  $env:MONGODB_URI = "mongodb://localhost:27017"; node humo-eventos.mjs
// Usa su propia base ("humo-eventos") y la borra al terminar: no toca tus datos.
import mongoose from "mongoose";
import { createCore, conEmpresa } from "core";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Define MONGODB_URI");

const conn = await mongoose
  .createConnection(uri, { dbName: "humo-eventos" })
  .asPromise();
const core = createCore({ connection: conn });
await core.documentos.listo();
await core.eventos.listo();

core.documentos.registrarTipo({
  tipo: "proforma",
  prefijo: "DP",
  estadoInicial: "borrador",
  transiciones: { borrador: ["cotizacion", "descartado"], cotizacion: ["orden_salida"] },
  motivos: { descartado: ["error", "otro"] },
});

const sufijo = Date.now();
const empresa = await core.empresas.crearEmpresa({
  nombre: "Humo SA",
  slug: `humo-${sufijo}`,
  servicios: ["siscore"],
});
const usuario = await core.empresas.crearUsuario({
  correo: `humo-${sufijo}@ejemplo.com`,
  password: "clave-de-prueba",
  nombre: "Humo",
});

const sesionId = "sesion-humo-0001";
const code = await conEmpresa(empresa._id, async () =>
  core.eventos.conContexto(
    { estacion: "creacion", sesionId, usuarioId: usuario._id },
    async () => {
      const d = await core.documentos.crear({ tipo: "proforma", doc: { n: 1 }, usuarioId: usuario._id });
      await core.documentos.transicionar({ code: d.code, a: "cotizacion", usuarioId: usuario._id });
      return d.code;
    },
  ),
);

const lote = await conEmpresa(empresa._id, async () =>
  core.eventos.registrarLote({
    estacion: "revision",
    sesionId,
    usuarioId: usuario._id,
    eventos: [{ tipo: "opcion_elegida", documentoCode: code, version: 1, datos: { linea: 2, elegida: "ZM-9600025" } }],
  }),
);

await core.eventos.vaciar();
const eventos = await conEmpresa(empresa._id, async () => core.eventos.listar({ documentoCode: code }));

console.log("Documento:", code, "| lote:", lote);
console.table(
  eventos.map((e) => ({ tipo: e.tipo, origen: e.origen, estacion: e.estacion, sesionId: e.sesionId, usuario: e.usuarioId ? "sí" : "no" })),
);

const ok =
  eventos.length === 3 &&
  eventos.slice(0, 2).every((e) => e.estacion === "creacion" && e.sesionId === sesionId) &&
  eventos[2].estacion === "revision";
console.log(ok ? "HUMO OK" : "HUMO FALLÓ");

await conn.db.dropDatabase();
await conn.close();
process.exit(ok ? 0 : 1);
