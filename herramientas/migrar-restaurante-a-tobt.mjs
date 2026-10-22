// Herramienta del operador de la plataforma (Arquitectura.md, 5.36).
// Migra los datos tras renombrar el servicio «restaurante» a «tobt»:
//   1. Empresa.servicios: el código «restaurante» pasa a «tobt» (conserva `activa`).
//   2. Usuario.paginaPrincipal: «restaurante.<destino>» pasa a «tobt.<destino>».
//
// No toca permisos (`estacion:*`, `documento:*`...), prefijos de documentos (PD, RC, DOC_ITEM),
// nombres de rol ni documentos: ninguno lleva el nombre del servicio.
//
// Uso (desde la raíz del gateway, con el .env que tiene MONGODB_URI y MONGODB_DB):
//   node --env-file=.env herramientas/migrar-restaurante-a-tobt.mjs --dry-run   (ensayo: no escribe)
//   node --env-file=.env herramientas/migrar-restaurante-a-tobt.mjs             (migra)
//
// Es idempotente: se puede repetir sin efecto. Antes de la corrida real, haz una copia de la base
// (mongodump o un snapshot de Atlas). Vive fuera de test/ a propósito (5.9).

import { parseArgs } from "node:util";
import mongoose from "mongoose";
import { createCore } from "core";

import { VIEJO, NUEVO, migrarServicios, migrarPaginaPrincipal } from "./migracion-tobt.mjs";

let simular;
try {
  ({
    values: { "dry-run": simular },
  } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } }, strict: true }));
} catch (e) {
  console.error(`\nError: ${e.message}\n\nUso: node --env-file=.env herramientas/migrar-restaurante-a-tobt.mjs [--dry-run]`);
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("\nError: falta MONGODB_URI. Ejecuta con --env-file=.env desde la raíz del gateway.");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "mi-servidor";
const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
let codigoSalida = 0;

try {
  const core = createCore({ connection });
  const { Empresa, Usuario } = core.modelos;

  console.log(`\nBase: ${dbName}${simular ? "  (--dry-run: no se escribe nada)" : ""}`);

  // 1. Empresas
  const empresas = await Empresa.find({ "servicios.codigo": VIEJO }).lean();
  console.log(`\nEmpresas con el servicio «${VIEJO}»: ${empresas.length}`);
  for (const e of empresas) {
    const nuevos = migrarServicios(e.servicios);
    console.log(`  ${e.slug}: ${JSON.stringify(e.servicios.map((s) => s.codigo))} → ${JSON.stringify(nuevos.map((s) => s.codigo))}`);
    if (!simular) await Empresa.updateOne({ _id: e._id }, { $set: { servicios: nuevos } });
  }

  // 2. Páginas principales
  const usuarios = await Usuario.find({ paginaPrincipal: { $regex: `^${VIEJO}\\.` } })
    .select("correo paginaPrincipal")
    .lean();
  console.log(`\nUsuarios con paginaPrincipal «${VIEJO}.*»: ${usuarios.length}`);
  for (const u of usuarios) {
    const nueva = migrarPaginaPrincipal(u.paginaPrincipal);
    console.log(`  ${u.correo}: ${u.paginaPrincipal} → ${nueva}`);
    if (!simular) await Usuario.updateOne({ _id: u._id }, { $set: { paginaPrincipal: nueva } });
  }

  // 3. Comprobación de lo escrito
  if (!simular) {
    const quedanE = await Empresa.countDocuments({ "servicios.codigo": VIEJO });
    const quedanU = await Usuario.countDocuments({ paginaPrincipal: { $regex: `^${VIEJO}\\.` } });
    if (quedanE || quedanU) {
      console.error(`\nERROR: quedaron ${quedanE} empresa(s) y ${quedanU} usuario(s) sin migrar.`);
      codigoSalida = 1;
    } else {
      console.log(`\nMigración completa: no queda ningún «${VIEJO}» en servicios ni en páginas principales.`);
    }
  } else {
    console.log("\n--dry-run: no se escribió nada.");
  }
} catch (e) {
  console.error("\nError:", e.message);
  codigoSalida = 1;
} finally {
  await connection.close();
}
process.exit(codigoSalida);
