// Envío de correo del gateway (5.65). Un solo proveedor por ahora, Resend (API HTTP, sin dependencias: usa `fetch`).
// Variables de entorno:
//   RESEND_API_KEY     clave de la API de Resend (secreta: nunca se escribe en logs ni en errores)
//   CORREO_REMITENTE   «Ilnapo <hola@ilnapo.com>»: debe ser de un dominio verificado en Resend
//   CORREO_MODO        «consola» solo para desarrollo: imprime el correo en vez de enviarlo (incluye los enlaces)
// Todo lo demás del sistema llama a `correo.enviar(...)`; cambiar de proveedor es cambiar este archivo.

export class ErrorCorreo extends Error {
  constructor(mensaje, { causa } = {}) {
    super(mensaje);
    this.name = "ErrorCorreo";
    if (causa) this.causa = causa;
  }
}

const DIRECCION = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,200}\.[^\s@<>"',;]{2,}$/;
const REMITENTE = /^(?:[^<>\r\n"]{1,80} )?<?[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,200}\.[^\s@<>"',;]{2,}>?$/;
const unaLinea = (s, max) => String(s ?? "").replace(/[\r\n\u0000-\u001f]+/g, " ").trim().slice(0, max);

export function leerConfigCorreo(env = process.env) {
  const remitente = unaLinea(env.CORREO_REMITENTE, 200);
  const cfg = {
    apiKey: typeof env.RESEND_API_KEY === "string" ? env.RESEND_API_KEY.trim() : "",
    remitente: REMITENTE.test(remitente) ? remitente : "",
    consola: env.CORREO_MODO === "consola" && env.NODE_ENV !== "production",
  };
  cfg.configurado = cfg.consola || !!(cfg.apiKey && cfg.remitente);
  return cfg;
}

/**
 * `enviar({ para, asunto, texto, html, claveUnica? })`. Lanza `ErrorCorreo` si no está configurado o el proveedor falla.
 * `claveUnica` evita duplicados si se reintenta (cabecera Idempotency-Key de Resend).
 */
export function crearCorreo({ env = process.env, fetchFn = globalThis.fetch, registrar = console.log, esperaMs = 10000 } = {}) {
  const cfg = leerConfigCorreo(env);
  return {
    configurado: cfg.configurado,
    async enviar({ para, asunto, texto, html, claveUnica }) {
      if (typeof para !== "string" || !DIRECCION.test(para)) throw new ErrorCorreo("destinatario inválido");
      const asuntoLimpio = unaLinea(asunto, 200);
      if (!asuntoLimpio || typeof texto !== "string" || !texto) throw new ErrorCorreo("falta el asunto o el texto");
      if (cfg.consola) {
        registrar(`[correo:consola] para=${para} asunto=${asuntoLimpio}\n${texto}`);
        return { id: "consola" };
      }
      if (!cfg.configurado) throw new ErrorCorreo("el envío de correo no está configurado (RESEND_API_KEY y CORREO_REMITENTE)");
      let r;
      try {
        r = await fetchFn("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.apiKey}`,
            "Content-Type": "application/json",
            ...(claveUnica ? { "Idempotency-Key": unaLinea(claveUnica, 256) } : {}),
          },
          body: JSON.stringify({ from: cfg.remitente, to: [para], subject: asuntoLimpio, text: texto, ...(html ? { html } : {}) }),
          signal: AbortSignal.timeout(esperaMs),
        });
      } catch (e) {
        throw new ErrorCorreo("no se pudo contactar al servicio de correo", { causa: e?.name });
      }
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new ErrorCorreo(`el servicio de correo rechazó el envío (${r.status}${d?.message ? `: ${String(d.message).slice(0, 160)}` : ""})`);
      }
      const d = await r.json().catch(() => ({}));
      return { id: d?.id ?? null };
    },
  };
}
