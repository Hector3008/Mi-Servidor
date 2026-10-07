// Crea (si no existen) un administrador y un usuario de cocina en la empresa de prueba.
// Va junto al otro script de datos de humo. Ajusta la ruta del import según la carpeta donde lo pongas.
import { connectDB } from "../src/db.js";

const SLUG = "cafe-prueba";
const PASSWORD = "clave-prueba-1";
const USUARIOS = [
  { correo: "admin@prueba.com", nombre: "Admin de prueba", rol: "admin" },
  { correo: "cocina@prueba.com", nombre: "Carla Cocina", rol: "cocina" },
];

const { core } = await connectDB();
const { Empresa, Usuario } = core.modelos;

const empresa =
  (await Empresa.findOne({ slug: SLUG })) ??
  (await core.empresas.crearEmpresa({ nombre: "Café de prueba", slug: SLUG, servicios: ["restaurante"] }));

for (const { correo, nombre, rol } of USUARIOS) {
  const usuario =
    (await Usuario.findOne({ correo })) ?? (await core.empresas.crearUsuario({ correo, password: PASSWORD, nombre }));
  try {
    await core.empresas.agregarMiembro({ empresaId: empresa._id, usuarioId: usuario._id, rol });
    console.log(`${correo}: membresía creada (${rol})`);
  } catch (e) {
    if (e.code !== 11000) throw e; // índice único: ya era miembro
    console.log(`${correo}: ya era miembro`);
  }
}
console.log(`Listo. Empresa ${empresa.slug}. Contraseña de ambos: ${PASSWORD}`);
await core.connection.close();
