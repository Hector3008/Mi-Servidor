// Restablece la contraseña de un usuario existente (para pruebas locales).
// Uso (desde la carpeta del gateway, con el gateway detenido o no, da igual):
//   NUEVA_PASSWORD='la-que-quieras-10+' node --env-file=.env test/restablecer-password.mjs admin@prueba.com
// La contraseña va en una variable de entorno: no queda escrita en ningún archivo.
import mongoose from "mongoose";
import { createCore, hashPassword } from "core";

const correo = (process.argv[2] || "").trim().toLowerCase();
const nueva = process.env.NUEVA_PASSWORD;
if (!correo || !nueva) {
  console.error("Falta el correo (argumento) o NUEVA_PASSWORD (variable de entorno).");
  process.exit(1);
}
if (nueva.length < 10) {
  console.error("Usa al menos 10 caracteres (la política de contraseñas nuevas).");
  process.exit(1);
}

const connection = await mongoose
  .createConnection(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || "mi-servidor" })
  .asPromise();
try {
  const core = createCore({ connection });
  const { Usuario } = core.modelos; // global: no lleva empresaId
  const r = await Usuario.updateOne(
    { correo },
    { $set: { passwordHash: await hashPassword(nueva), debeCambiarPassword: false } }
  );
  console.log(r.matchedCount ? `Contraseña de ${correo} actualizada.` : `No existe un usuario con el correo ${correo}.`);
} finally {
  await connection.close();
}
