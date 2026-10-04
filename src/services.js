const withProtocol = (url) =>
  /^https?:\/\//.test(url) ? url : `http://${url}`;

export const services = [
  {
    name: "prueba",
    path: "/prueba",
    target: withProtocol(process.env.MICROSERVICIO_URL_PRUEBA || "localhost:4001"),
  },
]
