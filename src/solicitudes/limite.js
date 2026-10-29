/** Limitador de ventana fija en memoria: `max` usos por clave cada `ventanaMs`. Se reinicia con el proceso (un solo gateway). */
export function crearLimite({ max, ventanaMs, ahora = Date.now }) {
  const mapa = new Map();
  return {
    /** Cuenta un uso. Devuelve los segundos de espera si ya se pasó del tope (y en ese caso no cuenta), o 0 si pasa. */
    usar(clave) {
      const t = ahora();
      if (mapa.size > 5000) for (const [k, e] of mapa) if (t - e.desde >= ventanaMs) mapa.delete(k);
      const e = mapa.get(clave);
      if (!e || t - e.desde >= ventanaMs) {
        mapa.set(clave, { n: 1, desde: t });
        return 0;
      }
      if (e.n >= max) return Math.ceil((e.desde + ventanaMs - t) / 1000);
      e.n += 1;
      return 0;
    },
  };
}
