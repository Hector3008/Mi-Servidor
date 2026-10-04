import express from "express";
import { services } from "./services.js";

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_PATH = process.env.BASE_PATH || "";

app.get("/servidor", (req, res) => res.json({ status: "ok" }));

const gateway = express.Router();

for (const { name, path, router } of services) {
  gateway.use(path, router);
  console.log(`[gateway] ${BASE_PATH}${path} montado (${name})`);
}

app.use(BASE_PATH || "/", gateway);

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
