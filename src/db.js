import mongoose from "mongoose";
import { createCore } from "core";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Falta la variable de entorno MONGODB_URI");

export async function connectDB() {
  // Una sola conexión para todo el gateway
  const connection = await mongoose
    .createConnection(uri, { dbName: process.env.MONGODB_DB || "mi-servidor" })
    .asPromise();
  console.log("[db] conectado a MongoDB");

  const core = createCore({
    connection,
    auth: { pinPimienta: process.env.AUTH_PIN_PIMIENTA },
  });
  await core.documentos.listo();
  await core.eventos.listo();
  await core.auth.listo(); // crea el índice único del token y el TTL

  // db: el Db del driver nativo, de la MISMA conexión (lo que ya recibe "prueba")
  return { core, db: connection.db };
}
