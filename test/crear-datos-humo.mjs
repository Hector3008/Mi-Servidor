import { connectDB } from "../src/db.js";

const SLUG = "cafe-prueba";
const CORREO = "mesero@prueba.com";
const PASSWORD = "clave-prueba-1";

const { core } = await connectDB();
const { Empresa, Usuario } = core.modelos;

const empresa =
  (await Empresa.findOne({ slug: SLUG })) ??
  (await core.empresas.crearEmpresa({
    nombre: "Café de prueba",
    slug: SLUG,
    servicios: ["restaurante"], // copia a la empresa las plantillas de rol: mesero, cocina, delivery
  }));

const usuario =
  (await Usuario.findOne({ correo: CORREO })) ??
  (await core.empresas.crearUsuario({
    correo: CORREO,
    password: PASSWORD,
    nombre: "Mesero de prueba",
  }));

try {
  await core.empresas.agregarMiembro({
    empresaId: empresa._id,
    usuarioId: usuario._id,
    rol: "mesero",
  });
  console.log("membresía creada");
} catch (e) {
  if (e.code !== 11000) throw e; // índice único: ya era miembro
  console.log("ya era miembro de la empresa");
}

console.log(`Listo. Empresa: ${empresa.slug} | usuario: ${CORREO} | rol: mesero`);
await core.connection.close();