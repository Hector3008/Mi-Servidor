// Lógica pura de la migración restaurante → tobt (5.36). La usa migrar-restaurante-a-tobt.mjs.

export const VIEJO = "restaurante";
export const NUEVO = "tobt";

/** Servicios de una empresa con VIEJO → NUEVO, sin duplicar NUEVO (si ya había, queda activo si alguno lo estaba). */
export function migrarServicios(servicios) {
  const salida = [];
  for (const s of servicios ?? []) {
    const codigo = s.codigo === VIEJO ? NUEVO : s.codigo;
    const activa = s.activa !== false;
    const previo = salida.find((x) => x.codigo === codigo);
    if (previo) previo.activa = previo.activa || activa;
    else salida.push({ codigo, activa });
  }
  return salida;
}

/** `restaurante.pedidos` → `tobt.pedidos`; cualquier otro valor queda igual. */
export function migrarPaginaPrincipal(valor) {
  return typeof valor === "string" && valor.startsWith(`${VIEJO}.`) ? `${NUEVO}.${valor.slice(VIEJO.length + 1)}` : valor;
}
