import { esc } from "../legal/plantilla.js";
import { SERVICIOS_SOLICITABLES } from "./servicios.js";

// Los correos de las solicitudes de empresa (5.65). Cada uno es texto plano + un HTML mínimo con los datos escapados.
// Los datos del formulario son de un desconocido: en el HTML siempre pasan por `esc`, y el asunto no lleva saltos de línea.

const nombreServicio = (c) => SERVICIOS_SOLICITABLES.find((s) => s.codigo === c)?.nombre ?? c;
const boton = (href, texto) => `<p><a href="${esc(href)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background:#1f5f4a;color:#fff;text-decoration:none;font-weight:600">${esc(texto)}</a></p>`;
const envoltorio = (plataforma, cuerpo) => `<div style="font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1f24;max-width:560px">${cuerpo}<p style="color:#5a6270;font-size:13px">${esc(plataforma)}</p></div>`;
const fecha = (d) => new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima" });

/** Al operador: hay una solicitud nueva y aquí está el enlace para revisarla (abrirlo no aprueba nada). */
export function correoAlOperador({ plataforma, s, url }) {
  const servicios = s.servicios.map(nombreServicio).join(", ");
  const texto = `Nueva solicitud de empresa en ${plataforma}

Negocio: ${s.nombre}
Dirección web: ${s.slug}
Servicios: ${servicios}
País y moneda: ${s.pais} · ${s.moneda}
Administrador: ${s.adminNombre} <${s.adminCorreo}>
Teléfono: ${s.telefono}

Para revisarla y aprobarla o rechazarla, abre este enlace (abrirlo no cambia nada; la empresa solo se crea cuando pulses «Aprobar»):
${url}

El enlace vence el ${fecha(s.expira)}. Es personal: no lo reenvíes.`;
  const fila = (k, v) => `<tr><td style="padding:2px 12px 2px 0;color:#5a6270">${esc(k)}</td><td>${esc(v)}</td></tr>`;
  const html = envoltorio(plataforma, `<h2 style="margin:0 0 12px">Nueva solicitud de empresa</h2>
<table style="border-collapse:collapse;margin:0 0 12px">${fila("Negocio", s.nombre)}${fila("Dirección web", s.slug)}${fila("Servicios", servicios)}${fila("País y moneda", `${s.pais} · ${s.moneda}`)}${fila("Administrador", `${s.adminNombre} <${s.adminCorreo}>`)}${fila("Teléfono", s.telefono)}</table>
${boton(url, "Revisar solicitud")}<p style="font-size:14px;color:#5a6270">Abrir el enlace no cambia nada: la empresa solo se crea cuando pulsas «Aprobar». Vence el ${esc(fecha(s.expira))}. Es personal: no lo reenvíes.</p>`);
  return { asunto: `Nueva solicitud de empresa: ${s.nombre}`, texto, html };
}

/** A quien pidió la empresa, ya aprobada. `urls.acceso` solo existe si su cuenta es nueva. */
export function correoDeBienvenida({ plataforma, r, urls }) {
  const nueva = !!urls.acceso;
  const carta = urls.carta ? `\nTu carta pública (la verán tus clientes): ${urls.carta}` : "";
  const texto = nueva
    ? `Hola ${r.admin.nombre}:

Aprobamos tu empresa «${r.empresa.nombre}» en ${plataforma}. Para entrar, elige tu contraseña con este enlace (es de un solo uso y vence en 14 días):
${urls.acceso}

Después podrás entrar con tu correo (${r.admin.correo}) en: ${urls.entrar}${carta}

Si no pediste esto, ignora este correo.`
    : `Hola ${r.admin.nombre}:

Aprobamos tu empresa «${r.empresa.nombre}» en ${plataforma}. Ya la tienes en tu cuenta de siempre (${r.admin.correo}): entra en ${urls.entrar}${carta}

Si no pediste esto, avísanos.`;
  const html = envoltorio(plataforma, `<h2 style="margin:0 0 12px">Tu empresa «${esc(r.empresa.nombre)}» está lista</h2>
<p>Hola ${esc(r.admin.nombre)}:</p>
${nueva ? `<p>Para entrar, elige tu contraseña (el enlace es de un solo uso y vence en 14 días):</p>${boton(urls.acceso, "Crear mi contraseña")}<p style="font-size:14px">Después entrarás con tu correo (${esc(r.admin.correo)}) en <a href="${esc(urls.entrar)}">${esc(urls.entrar)}</a>.</p>` : `<p>Ya la tienes en tu cuenta de siempre (${esc(r.admin.correo)}).</p>${boton(urls.entrar, "Entrar")}`}
${urls.carta ? `<p style="font-size:14px">Tu carta pública, la que verán tus clientes: <a href="${esc(urls.carta)}">${esc(urls.carta)}</a></p>` : ""}
<p style="font-size:14px;color:#5a6270">${nueva ? "Si no pediste esto, ignora este correo." : "Si no pediste esto, avísanos."}</p>`);
  return { asunto: `Tu empresa ${r.empresa.nombre} está lista en ${plataforma}`, texto, html };
}

/** A quien pidió la empresa, cuando se rechaza. */
export function correoDeRechazo({ plataforma, r, contacto }) {
  const texto = `Hola ${r.adminNombre ?? ""}:

Revisamos tu solicitud de «${r.nombre}» en ${plataforma} y por ahora no pudimos aprobarla.${contacto ? `\nSi crees que es un error o quieres darnos más información, escríbenos a ${contacto}.` : ""}`;
  const html = envoltorio(plataforma, `<p>Hola ${esc(r.adminNombre ?? "")}:</p><p>Revisamos tu solicitud de «${esc(r.nombre)}» en ${esc(plataforma)} y por ahora no pudimos aprobarla.</p>${contacto ? `<p>Si crees que es un error o quieres darnos más información, escríbenos a ${esc(contacto)}.</p>` : ""}`);
  return { asunto: `Sobre tu solicitud de ${r.nombre}`, texto, html };
}

/** «Olvidé mi contraseña»: el enlace dura 1 hora y se usa una vez. */
export function correoDeRecuperacion({ plataforma, nombre, url }) {
  const texto = `Hola${nombre ? ` ${nombre}` : ""}:

Pediste elegir una contraseña nueva en ${plataforma}. Abre este enlace (vale por 1 hora y se usa una sola vez):
${url}

Al guardar la contraseña nueva se cerrarán las sesiones abiertas con la anterior. Si no lo pediste tú, ignora este correo: tu contraseña no cambia mientras no abras el enlace.`;
  const html = envoltorio(plataforma, `<h2 style="margin:0 0 12px">Elige una contraseña nueva</h2>
<p>Hola${nombre ? ` ${esc(nombre)}` : ""}:</p><p>Pediste elegir una contraseña nueva en ${esc(plataforma)}. El enlace vale por 1 hora y se usa una sola vez.</p>
${boton(url, "Elegir contraseña nueva")}<p style="font-size:14px;color:#5a6270">Al guardarla se cerrarán las sesiones abiertas con la anterior. Si no lo pediste tú, ignora este correo: tu contraseña no cambia mientras no abras el enlace.</p>`);
  return { asunto: `Elige una contraseña nueva en ${plataforma}`, texto, html };
}

/** El operador reenvía el acceso a un administrador (enlace de 14 días). */
export function correoDeAccesoReenviado({ plataforma, nombre, empresa, url, entrar }) {
  const texto = `Hola${nombre ? ` ${nombre}` : ""}:

Te enviamos de nuevo tu acceso a «${empresa}» en ${plataforma}. Elige tu contraseña con este enlace (de un solo uso, vence en 14 días):
${url}

Después entrarás con tu correo en: ${entrar}
Si no lo esperabas, ignora este correo.`;
  const html = envoltorio(plataforma, `<h2 style="margin:0 0 12px">Tu acceso a «${esc(empresa)}»</h2>
<p>Hola${nombre ? ` ${esc(nombre)}` : ""}:</p><p>Elige tu contraseña con este enlace (de un solo uso, vence en 14 días):</p>${boton(url, "Elegir mi contraseña")}
<p style="font-size:14px">Después entrarás en <a href="${esc(entrar)}">${esc(entrar)}</a>. Si no lo esperabas, ignora este correo.</p>`);
  return { asunto: `Tu acceso a ${empresa} en ${plataforma}`, texto, html };
}

/** Al operador: su enlace para entrar a la pantalla de operador. */
export function correoDeEntradaOperador({ plataforma, url, minutos }) {
  const texto = `Enlace para entrar a la pantalla de operador de ${plataforma}:
${url}

Vale por ${minutos} minutos y se usa una sola vez. Si no lo pediste tú, ignóralo: sin este enlace nadie entra.`;
  const html = envoltorio(plataforma, `<h2 style="margin:0 0 12px">Entrar como operador</h2>${boton(url, "Abrir la pantalla de operador")}<p style="font-size:14px;color:#5a6270">Vale por ${minutos} minutos y se usa una sola vez. Si no lo pediste tú, ignóralo.</p>`);
  return { asunto: `Tu enlace de operador de ${plataforma}`, texto, html };
}
