import { SERVICIOS_SOLICITABLES } from "./servicios.js";
import { correoDeBienvenida, correoDeRechazo } from "./correos.js";

// Lo que pasa DESPUÉS de aprobar o rechazar una solicitud (crear en el núcleo + avisar a la persona), compartido por el
// enlace del correo (5.65) y la pantalla de operador (5.66). `base` es el prefijo del gateway (BASE_PATH).
export function crearAcciones({ core, correo, cfg, cfgLegal, avisar }) {
  const ruta = (base, r) => `${cfg.urlPublica}${base}${r}`;

  /** `crear` es la llamada al núcleo ya resuelta (por token o por id). Devuelve `{ r, urls, estado }`; el correo que falla NO deshace la aprobación. */
  async function aprobar(resultado, base) {
    const r = resultado;
    const servicio = SERVICIOS_SOLICITABLES.find((s) => r.empresa.servicios.includes(s.codigo) && s.carta);
    const urls = {
      entrar: ruta(base, "/cuenta/"),
      carta: servicio ? ruta(base, `/${servicio.carta(r.empresa.slug)}`) : null,
      acceso: r.tokenAcceso ? ruta(base, `/acceso/${r.tokenAcceso}`) : null,
    };
    let estado = { ok: true };
    try {
      await correo.enviar({ para: r.admin.correo, ...correoDeBienvenida({ plataforma: cfgLegal.plataforma, r, urls }), claveUnica: `bienvenida-${r.empresa.id}` });
    } catch (e) {
      avisar(`[solicitudes] empresa ${r.empresa.id} creada, pero no se pudo enviar el correo al administrador: ${e?.message ?? e}`);
      estado = { ok: false, motivo: e?.message ?? "error desconocido" };
    }
    return { r, urls, estado };
  }

  async function rechazar(resultado) {
    const s = resultado;
    let estado = { ok: true };
    try {
      await correo.enviar({ para: s.adminCorreo, ...correoDeRechazo({ plataforma: cfgLegal.plataforma, r: { nombre: s.nombre, adminNombre: s.adminNombre }, contacto: cfgLegal.correo }), claveUnica: `rechazo-${s.id}` });
    } catch (e) {
      avisar(`[solicitudes] no se pudo avisar del rechazo a la persona: ${e?.message ?? e}`);
      estado = { ok: false, motivo: e?.message ?? "error desconocido" };
    }
    return { s, estado };
  }

  return { aprobar, rechazar, ruta };
}
