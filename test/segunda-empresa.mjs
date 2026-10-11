// Le da una segunda empresa a un usuario existente, para probar el selector de empresa.
// Uso (desde la carpeta del gateway):
//   node --env-file=.env test/segunda-empresa.mjs admin@prueba.com
// Crea una empresa nueva (nombre "Segunda empresa", slug único) con los mismos servicios
// que la primera empresa del usuario, y lo agrega como admin.
import mongoose from "mongoose";
import { createCore } from "core";

const correo = (process.argv[2] || "").trim().toLowerCase();
if (!correo) {
  console.error("Falta el correo del usuario (primer argumento).");
  process.exit(1);
}

const connection = await mongoose
  .createConnection(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "mi-servidor" })
  .asPromise();
try {
  const core = createCore({ connection });
  const { Usuario, Membresia, Empresa } = core.modelos;

  const usuario = await Usuario.findOne({ correo });
  if (!usuario) throw new Error(`No existe un usuario con el correo ${correo}.`);

  // Membresia lleva empresaId (tenancy): consulta de plataforma, sin empresa activa.
  const membresias = await Membresia.find({ usuarioId: usuario._id, activa: true }).setOptions({ sinEmpresa: true });
  if (membresias.length >= 2) {
    console.log(`${correo} ya tiene ${membresias.length} empresas activas. No hago nada.`);
  } else {
    // Servicios de la empresa actual, para que el rol "admin" exista en la nueva.
    let servicios = [];
    if (membresias[0]) {
      const origen = await Empresa.findById(membresias[0].empresaId);
      servicios = (origen?.servicios ?? []).filter((s) => s.activa !== false).map((s) => s.codigo);
    }

    const slug = `segunda-${Date.now().toString(36)}`;
    const empresa = await core.empresas.crearEmpresa({ nombre: "Segunda empresa", slug, servicios });
    const empresaId = empresa._id ?? empresa.id;
    await core.empresas.agregarMiembro({ empresaId, usuarioId: usuario._id, rol: "admin" });
    console.log(`Listo: ${correo} ahora también es admin de "Segunda empresa" (${slug}).`);
  }
} finally {
  await connection.close();
}
