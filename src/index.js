import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { services } from "./services.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/servidor", (req, res) => res.json({ status: "ok" }));

for (const { name, path, target } of services) {
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathFilter: path,
      pathRewrite: { [`^${path}`]: "" },
    }),
  );
  console.log(`[gateway] ${path} -> ${target} (${name})`);
}

app.listen(PORT, () => console.log(`Gateway en puerto ${PORT}`));
