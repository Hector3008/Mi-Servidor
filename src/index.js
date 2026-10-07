import express from "express";
import { connectDB } from "./db.js";
import { services } from "./services.js";

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
core.auth.montarRutas(auth); // ← sustituye a los 4 auth.post/get(...)
gateway.use("/auth", auth);



app.use(BASE_PATH || "/", gateway);

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
