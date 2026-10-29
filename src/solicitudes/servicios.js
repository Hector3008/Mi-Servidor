// Servicios que una empresa puede pedir al registrarse. Agregar uno = agregar una línea (y que el núcleo tenga sus
// plantillas de rol: core/src/modelos/plantillas.js). Solo van los que están funcionando en la plataforma.
export const SERVICIOS_SOLICITABLES = [
  {
    codigo: "tobt",
    nombre: "tobt",
    descripcion: "Pedidos, cocina, caja, carta pública, puntos, reseñas y reportes para cafeterías y restaurantes.",
    info: "tobt/info",
    carta: (slug) => `tobt/catalogo/${slug}`, // la página pública que tendrá la empresa con este servicio
  },
];

export const codigosSolicitables = () => SERVICIOS_SOLICITABLES.map((s) => s.codigo);

// Países y monedas que ofrece el formulario (el núcleo acepta cualquier código ISO válido; esto es solo la lista del selector).
export const PAISES = [
  ["PE", "Perú"], ["AR", "Argentina"], ["BO", "Bolivia"], ["CL", "Chile"], ["CO", "Colombia"], ["EC", "Ecuador"],
  ["MX", "México"], ["PY", "Paraguay"], ["UY", "Uruguay"], ["VE", "Venezuela"], ["ES", "España"], ["US", "Estados Unidos"],
];
export const MONEDAS = [
  ["PEN", "Sol peruano (PEN)"], ["ARS", "Peso argentino (ARS)"], ["BOB", "Boliviano (BOB)"], ["CLP", "Peso chileno (CLP)"],
  ["COP", "Peso colombiano (COP)"], ["USD", "Dólar estadounidense (USD)"], ["MXN", "Peso mexicano (MXN)"],
  ["PYG", "Guaraní (PYG)"], ["UYU", "Peso uruguayo (UYU)"], ["EUR", "Euro (EUR)"],
];
export const MONEDA_DEL_PAIS = { PE: "PEN", AR: "ARS", BO: "BOB", CL: "CLP", CO: "COP", EC: "USD", MX: "MXN", PY: "PYG", UY: "UYU", VE: "USD", ES: "EUR", US: "USD" };
