import express from "express";
import { connectDB } from "./db.js";
import { services } from "./services.js";

const app = express();
const PORT = process.env.PORT || 3000;
console.log("PORT: ", PORT);
const BASE_PATH = process.env.BASE_PATH || "";

const { core, db } = await connectDB();

app.get("/servidor", async (req, res) => {
  res.json({ status: "ok", db: await core.ping() });
});

const gateway = express.Router();

for (const { name, path, factory } of services) {
  gateway.use(path, factory({ db, core }));
  console.log(`[gateway] ${BASE_PATH}${path} montado (${name})`);
}

app.use(BASE_PATH || "/", gateway);

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
