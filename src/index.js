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

// ===== TEMPORAL: humo de la pieza 2 (borrar al terminar) =====
app.get("/humo/crear", async (req, res, next) => {
  try {
    const n = Date.now(); // permite repetir la prueba sin chocar con índices únicos
    const empresa = await core.empresas.crearEmpresa({
      nombre: "Cafetería",
      slug: `cafeteria-${n}`,
      servicios: ["restaurante"],
    });
    const usuario = await core.empresas.crearUsuario({
      correo: `ana${n}@x.com`,
      password: "secreto123",
      nombre: "Ana",
    });
    await core.empresas.agregarMiembro({
      empresaId: empresa._id,
      usuarioId: usuario._id,
      rol: "mesero",
    });
    res.json({ empresaId: empresa._id, usuarioId: usuario._id });
  } catch (e) {
    next(e);
  }
});

// Simula al que autentica: deja req.auth con los ids que le pasas por la URL
const authFalso = (req, _res, next) => {
  req.auth = { usuarioId: req.query.u, empresaId: req.query.e };
  next();
};

app.get(
  "/humo/cocina",
  authFalso,
  core.requierePermiso("estacion:cocina"),
  (req, res) => res.json({ ok: true }),
);

app.get(
  "/humo/pedido",
  authFalso,
  core.requierePermiso("documento:crear"),
  (req, res) => res.json({ ok: true, rol: req.rol.nombre }),
);
// ===== fin del humo =====

const gateway = express.Router();

for (const { name, path, factory } of services) {
  gateway.use(path, factory({ db, core }));
  console.log(`[gateway] ${BASE_PATH}${path} montado (${name})`);
}

app.use(BASE_PATH || "/", gateway);

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
