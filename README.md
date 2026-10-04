# Mi-Servidor

Gateway Express que abre **una única conexión a MongoDB** (Mongoose), crea el [núcleo](https://github.com/Hector3008/core) y monta cada microservicio como un router en su propia ruta.

## Cómo funciona

```
src/
  index.js      arranca Express, ruta de salud y montaje de servicios
  db.js         abre la conexión y crea el núcleo
  services.js   lista de servicios montados
```

`db.js` devuelve `{ core, db }`: el núcleo y el `Db` del driver nativo de la misma conexión. Cada servicio exporta una función fábrica `createRouter({ db, core })`, y el gateway la llama con lo que necesita. Ningún servicio abre conexiones propias.

## Servicios montados

| Servicio | Ruta | Repo |
|---|---|---|
| prueba | `/prueba` | [microservicio-prueba-](https://github.com/Hector3008/microservicio-prueba-) |

## Ruta de salud

`GET /servidor`

```json
{ "status": "ok", "db": { "ok": true, "estado": "conectado" } }
```

## Variables de entorno

Se leen del archivo `.env` (no se sube al repo).

| Variable | Descripción | Por defecto |
|---|---|---|
| `MONGODB_URI` | URI de MongoDB (obligatoria) | — |
| `MONGODB_DB` | Nombre de la base | `mi-servidor` |
| `PORT` | Puerto | `3000` |
| `BASE_PATH` | Prefijo para las rutas de los servicios | vacío |

`/servidor` no lleva el prefijo de `BASE_PATH`.

## Ejecutar

```bash
npm install
npm run dev     # con --watch y .env
npm start       # sin .env: las variables deben estar en el entorno
```

## Agregar un servicio

1. Instálalo como dependencia: `npm install github:Hector3008/<repo>`.
2. Debe exportar por defecto una fábrica: `export default function createRouter({ db, core }) { ... }`.
3. Regístralo en `src/services.js`:

```js
import prueba from "prueba";
import restaurante from "restaurante";

export const services = [
  { name: "prueba", path: "/prueba", factory: prueba },
  { name: "restaurante", path: "/restaurante", factory: restaurante },
];
```

Dentro de un servicio, los permisos se exigen con el núcleo:

```js
router.post("/pedidos", core.requierePermiso("documento:crear"), crearPedido);
```

## Actualizar el núcleo

`core` y los servicios se instalan desde GitHub. Si npm responde "up to date" pero faltan archivos nuevos, el `package-lock.json` tiene fijado un commit anterior:

```bash
npm uninstall core
npm install github:Hector3008/core
```

## Requisitos

Node 22 o superior y una base MongoDB accesible (por ejemplo, Atlas con tu IP permitida).