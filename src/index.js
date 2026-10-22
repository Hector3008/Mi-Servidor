import express from "express";
import { connectDB } from "./db.js";
import { services } from "./services.js";
import { createRouter as crearTobt } from "tobt";
import { createRouter as cuenta } from "cuenta";

const app = express();
const PORT = process.env.PORT || 3000;
console.log("PORT: ", PORT);
const BASE_PATH = process.env.BASE_PATH || "";

// Solo si despliegas detrás de un proxy (Railway, Render, nginx): TRUST_PROXY=1
if (process.env.TRUST_PROXY)
  app.set("trust proxy", Number(process.env.TRUST_PROXY));

const { core, db } = await connectDB();

app.get("/servidor", async (req, res) => {
  res.json({ status: "ok", db: await core.ping() });
});

const gateway = express.Router();

// --- Autenticación ---
const auth = express.Router();
auth.use(express.json());
core.auth.montarRutas(auth);
gateway.use("/auth", auth);

// --- Empleados ---
const empleados = express.Router();
empleados.use(express.json());
core.empleados.montarRutas(empleados);
gateway.use("/empleados", empleados);

// --- Clientes ---
 const clientes = express.Router();
 clientes.use(express.json());
 core.clientes.montarRutas(clientes);
 gateway.use("/clientes", clientes);

// --- Microservicios ---
for (const { name, path, factory } of services) {
  gateway.use(path, factory({ db, core }));
  console.log(`[gateway] ${BASE_PATH}${path} montado (${name})`);
}
//-- Catalogo -- 
   const catalogo = express.Router();
   catalogo.use(express.json({ limit: "1mb" })); // una importación admite hasta 500 filas
   core.catalogo.montarRutas(catalogo);
   gateway.use("/catalogo", catalogo);

   // --- Tobt ---
gateway.use("/tobt", crearTobt({ core }));
//-- login / cuenta --
gateway.use("/cuenta", cuenta());
app.use(BASE_PATH || "/", gateway);

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
