import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Falta la variable de entorno MONGODB_URI");

const client = new MongoClient(uri);

export async function connectDB() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "mi-servidor");
  console.log("[db] conectado a MongoDB");
  return db;
}
