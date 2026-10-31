import prueba from "prueba";
import stock from "stock";

export const services = [
  { name: "prueba", path: "/prueba", factory: prueba },
  { name: "stock", path: "/stock", factory: stock },
];
