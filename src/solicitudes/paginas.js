import { ESTILOS, esc } from "../legal/plantilla.js";
import { MONEDAS, MONEDA_DEL_PAIS, PAISES, SERVICIOS_SOLICITABLES } from "./servicios.js";

// Páginas de «Crear tu empresa» (5.65): formulario público, confirmación, la vista del operador para aprobar, y la
// de elegir la contraseña. HTML estático generado en el servidor, sin scripts (la CSP no los permite). `base` es el
// prefijo del gateway (BASE_PATH, "" si no hay): los enlaces son absolutos desde él porque estas páginas viven a distintas profundidades.

export const EXTRA = `
  .contenedor { max-width: 640px; }
  .tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: 14px; padding: 20px; margin: 0 0 18px; }
  .campo { margin: 0 0 16px; }
  .campo label, .campo legend { display: block; font-weight: 600; margin: 0 0 4px; padding: 0; }
  .campo small { display: block; color: var(--texto-suave); margin-top: 4px; }
  .campo input[type=text], .campo input[type=email], .campo input[type=tel], .campo input[type=password], .campo select {
    width: 100%; font: inherit; padding: 10px 12px; border: 1px solid var(--borde); border-radius: 10px; background: var(--fondo); color: var(--texto);
  }
  .campo input:focus-visible, .campo select:focus-visible { outline: 3px solid var(--acento); outline-offset: 1px; }
  .campo.malo input, .campo.malo select { border-color: #b3261e; }
  .error { color: #b3261e; margin: 4px 0 0; font-size: .92rem; }
  @media (prefers-color-scheme: dark) { .error { color: #ff8a80; } .campo.malo input, .campo.malo select { border-color: #ff8a80; } }
  .fila { display: grid; gap: 0 14px; grid-template-columns: 1fr 1fr; }
  @media (max-width: 560px) { .fila { grid-template-columns: 1fr; } }
  .opcion { display: flex; gap: 10px; align-items: flex-start; font-weight: 400 !important; margin: 0 0 8px !important; }
  .opcion input { margin-top: 5px; }
  .opcion small { display: block; color: var(--texto-suave); }
  .boton { font: inherit; font-weight: 600; cursor: pointer; padding: 11px 20px; border-radius: 999px; border: 1px solid var(--principal); background: var(--principal); color: #fff; }
  @media (prefers-color-scheme: dark) { .boton { color: #0c1713; } }
  .boton.secundario { background: transparent; color: var(--texto); border-color: var(--borde); }
  .boton.peligro { background: transparent; color: #b3261e; border-color: #b3261e; }
  .boton:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
  .acciones { display: flex; flex-wrap: wrap; gap: 10px; }
  .miel { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
  .aviso.malo { background: #fdecea; border-color: #f0b3ae; } @media (prefers-color-scheme: dark) { .aviso.malo { background: #2d1816; border-color: #7a3b36; } }
  dl.datos { display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; margin: 0 0 16px; }
  dl.datos dt { color: var(--texto-suave); } dl.datos dd { margin: 0; overflow-wrap: anywhere; }
  nav.operador { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin: 0 0 18px; }
  nav.operador a[aria-current=page] { font-weight: 700; text-decoration: none; color: var(--texto); }
  nav.operador form { margin: 0 0 0 auto; }
  .contenedor.ancho { max-width: 920px; }
  .etiqueta { display: inline-block; font-size: .82rem; padding: 1px 9px; border-radius: 999px; border: 1px solid var(--borde); color: var(--texto-suave); }
  .etiqueta.ok { color: var(--principal); border-color: var(--principal); } .etiqueta.malo { color: #b3261e; border-color: #b3261e; }
  @media (prefers-color-scheme: dark) { .etiqueta.malo { color: #ff8a80; border-color: #ff8a80; } }
  .boton.chico { padding: 5px 13px; font-size: .9rem; }
  form.en-linea { display: inline; margin: 0; }
  code { background: var(--fondo); padding: 1px 5px; border-radius: 5px; overflow-wrap: anywhere; }
`;

export function pagina({ cfg, base, titulo, cuerpo, indexable = false, ancho = false }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${indexable ? "" : '<meta name="robots" content="noindex, nofollow">\n'}<title>${esc(titulo)} · ${esc(cfg.plataforma)}</title>
<link rel="icon" href="${esc(base)}/favicon.ico" sizes="any">
<style>${ESTILOS}${EXTRA}</style>
</head>
<body>
  <header class="barra"><div class="contenedor"><a class="marca" href="${esc(base)}/">${esc(cfg.plataforma)}</a></div></header>
  <main><div class="contenedor${ancho ? " ancho" : ""}">
${cuerpo}
  </div></main>
  <footer><div class="contenedor"><a href="${esc(base)}/">${esc(cfg.plataforma)}</a><nav><a href="${esc(base)}/terminos">Términos y condiciones</a> · <a href="${esc(base)}/privacidad">Política de privacidad</a></nav></div></footer>
</body>
</html>
`;
}

const mensaje = (campos, k) => (campos?.[k] ? `<p class="error" id="e-${k}">${esc(campos[k])}</p>` : "");
const clase = (campos, k) => (campos?.[k] ? "campo malo" : "campo");
const desc = (campos, k) => (campos?.[k] ? ` aria-invalid="true" aria-describedby="e-${k}"` : "");

/** Formulario público. `v` son los valores a conservar si hubo error; `campos` los mensajes por campo; `general` un aviso arriba. */
export function paginaFormulario({ cfg, base, v = {}, campos = {}, general = "", versiones }) {
  const sel = (lista, actual, vacio) => lista.map(([c, n]) => `<option value="${esc(c)}"${c === actual ? " selected" : ""}>${esc(n)}</option>`).join("");
  const pais = v.pais || "PE";
  const moneda = v.moneda || MONEDA_DEL_PAIS[pais] || "PEN";
  const elegidos = new Set(Array.isArray(v.servicios) ? v.servicios : v.servicios ? [v.servicios] : SERVICIOS_SOLICITABLES.length === 1 ? [SERVICIOS_SOLICITABLES[0].codigo] : []);
  const servicios = SERVICIOS_SOLICITABLES.map(
    (s) => `<label class="opcion"><input type="checkbox" name="servicios" value="${esc(s.codigo)}"${elegidos.has(s.codigo) ? " checked" : ""}><span><strong>${esc(s.nombre)}</strong><small>${esc(s.descripcion)} <a href="${esc(base)}/${esc(s.info)}">Conocer más</a></small></span></label>`,
  ).join("");
  const cuerpo = `
    <h1>Crea tu empresa en ${esc(cfg.plataforma)}</h1>
    <p>Cuéntanos de tu negocio. Revisamos cada solicitud a mano y, cuando la aprobemos, te escribiremos al correo que indiques con un enlace para que elijas tu contraseña y entres.</p>
    ${general ? `<p class="aviso malo" role="alert">${esc(general)}</p>` : ""}
    <form method="post" action="${esc(base)}/crear-empresa" class="tarjeta" novalidate>
      <div class="${clase(campos, "nombre")}"><label for="nombre">Nombre del negocio</label>
        <input type="text" id="nombre" name="nombre" maxlength="80" required autocomplete="organization" value="${esc(v.nombre)}"${desc(campos, "nombre")}>${mensaje(campos, "nombre")}</div>
      <div class="${clase(campos, "slug")}"><label for="slug">Dirección web</label>
        <input type="text" id="slug" name="slug" maxlength="60" required autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(v.slug)}"${desc(campos, "slug")}>
        <small>Solo minúsculas, números y guiones: por ejemplo <code>cafe-aurora</code>. Será parte del enlace público de tu carta.</small>${mensaje(campos, "slug")}</div>
      <fieldset class="${clase(campos, "servicios")}" style="border:0;padding:0;margin:0 0 16px"><legend>¿Qué servicio quieres?</legend>${servicios}${mensaje(campos, "servicios")}</fieldset>
      <div class="fila">
        <div class="${clase(campos, "pais")}"><label for="pais">País</label><select id="pais" name="pais"${desc(campos, "pais")}>${sel(PAISES, pais)}</select>${mensaje(campos, "pais")}</div>
        <div class="${clase(campos, "moneda")}"><label for="moneda">Moneda de tus precios</label><select id="moneda" name="moneda"${desc(campos, "moneda")}>${sel(MONEDAS, moneda)}</select>${mensaje(campos, "moneda")}</div>
      </div>
      <div class="fila">
        <div class="${clase(campos, "adminNombre")}"><label for="adminNombre">Tu nombre</label>
          <input type="text" id="adminNombre" name="adminNombre" maxlength="80" required autocomplete="name" value="${esc(v.adminNombre)}"${desc(campos, "adminNombre")}>${mensaje(campos, "adminNombre")}</div>
        <div class="${clase(campos, "telefono")}"><label for="telefono">Teléfono</label>
          <input type="tel" id="telefono" name="telefono" maxlength="30" required autocomplete="tel" value="${esc(v.telefono)}"${desc(campos, "telefono")}>${mensaje(campos, "telefono")}</div>
      </div>
      <div class="${clase(campos, "adminCorreo")}"><label for="adminCorreo">Tu correo</label>
        <input type="email" id="adminCorreo" name="adminCorreo" maxlength="254" required autocomplete="email" value="${esc(v.adminCorreo)}"${desc(campos, "adminCorreo")}>
        <small>Aquí te llegará el enlace para crear tu contraseña. Serás el administrador de la empresa.</small>${mensaje(campos, "adminCorreo")}</div>
      <div class="miel" aria-hidden="true"><label>No llenes este campo <input type="text" name="sitio" tabindex="-1" autocomplete="off"></label></div>
      <div class="${clase(campos, "aceptoTerminos")}"><label class="opcion"><input type="checkbox" name="acepto" value="1"${v.acepto ? " checked" : ""}${desc(campos, "aceptoTerminos")}><span>Acepto los <a href="${esc(base)}/terminos">términos y condiciones</a> y la <a href="${esc(base)}/privacidad">política de privacidad</a>.</span></label>${mensaje(campos, "aceptoTerminos")}</div>
      <div class="acciones"><button class="boton" type="submit">Enviar solicitud</button></div>
    </form>
    <p class="vigencia">Usaremos estos datos solo para evaluar tu solicitud y, si la aprobamos, crear tu cuenta.</p>`;
  return pagina({ cfg, base, titulo: "Crea tu empresa", cuerpo, indexable: true });
}

export function paginaEnviada({ cfg, base }) {
  return pagina({ cfg, base, titulo: "Solicitud enviada", indexable: false, cuerpo: `
    <h1>¡Recibimos tu solicitud!</h1>
    <p class="tarjeta">La revisaremos a mano. Cuando la aprobemos te escribiremos al correo que indicaste con un enlace para elegir tu contraseña. Si no ves el correo, revisa la carpeta de spam.</p>
    <p><a href="${esc(base)}/">Volver al inicio</a></p>` });
}

export function paginaNoDisponible({ cfg, base }) {
  return pagina({ cfg, base, titulo: "Crear empresa", cuerpo: `
    <h1>Crear una empresa</h1>
    <p class="aviso" role="note">Por ahora no estamos recibiendo solicitudes por este medio. ${cfg.correo ? `Escríbenos a <a href="mailto:${esc(cfg.correo)}">${esc(cfg.correo)}</a>.` : "Vuelve a intentarlo más tarde."}</p>
    <p><a href="${esc(base)}/">Volver al inicio</a></p>` });
}

/** Mensaje de una sola cosa (enlace vencido, ya usado, error…). */
export function paginaMensaje({ cfg, base, titulo, texto, malo = false, enlace }) {
  return pagina({ cfg, base, titulo, cuerpo: `
    <h1>${esc(titulo)}</h1>
    <p class="aviso${malo ? " malo" : ""}" role="${malo ? "alert" : "status"}">${esc(texto)}</p>
    ${enlace ? `<p><a href="${esc(enlace.href)}">${esc(enlace.texto)}</a></p>` : ""}` });
}

export const NOMBRE_PAIS = Object.fromEntries(PAISES);
export const dato = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
export const fechaLarga = (d) => new Date(d).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

/** Lo que ve el operador al abrir su enlace: los datos y los botones Aprobar / Rechazar (POST: abrir el enlace no cambia nada). */
export function paginaRevision({ cfg, base, token, s }) {
  const servicios = s.servicios.map((c) => esc(SERVICIOS_SOLICITABLES.find((x) => x.codigo === c)?.nombre ?? c)).join(", ");
  const ruta = `${esc(base)}/solicitud/${esc(token)}`;
  return pagina({ cfg, base, titulo: "Revisar solicitud", cuerpo: `
    <h1>Solicitud de empresa</h1>
    <div class="tarjeta"><dl class="datos">
      ${dato("Negocio", esc(s.nombre))}${dato("Dirección web", `<code>${esc(s.slug)}</code>`)}${dato("Servicios", servicios)}
      ${dato("País y moneda", `${esc(NOMBRE_PAIS[s.pais] ?? s.pais)} · ${esc(s.moneda)}`)}
      ${dato("Administrador", `${esc(s.adminNombre)} &lt;${esc(s.adminCorreo)}&gt;`)}${dato("Teléfono", esc(s.telefono))}
      ${dato("Recibida", esc(fechaLarga(s.creadaTs)))}${dato("Vence", esc(fechaLarga(s.expira)))}
    </dl>
    ${s.estado === "incompleta" ? '<p class="aviso malo" role="alert">Un intento anterior de aprobar quedó a medias. Volver a aprobar lo reanuda sin duplicar la empresa.</p>' : ""}
    <p>Al aprobar se crea la empresa con esos servicios y su administrador, y se le envía a <strong>${esc(s.adminCorreo)}</strong> el enlace para elegir su contraseña.</p>
    <div class="acciones">
      <form method="post" action="${ruta}/aprobar"><button class="boton" type="submit">Aprobar y crear la empresa</button></form>
      <form method="post" action="${ruta}/rechazar"><button class="boton peligro" type="submit">Rechazar</button></form>
    </div></div>` });
}

export function paginaAprobada({ cfg, base, urls, r, correo }) {
  const aviso = correo.ok
    ? `<p class="aviso" role="status">Le enviamos a <strong>${esc(r.admin.correo)}</strong> ${r.admin.nuevo ? "el enlace para elegir su contraseña" : "el aviso de que su empresa ya está lista (ya tenía cuenta)"}.</p>`
    : `<p class="aviso malo" role="alert"><strong>No se pudo enviar el correo</strong> (${esc(correo.motivo)}). La empresa ya está creada. ${r.admin.nuevo ? `Entrégale este enlace por un medio seguro, es de un solo uso y vence en 14 días:<br><code>${esc(urls.acceso)}</code>` : "Avísale de otra forma que ya puede entrar con su cuenta."}</p>`;
  return pagina({ cfg, base, titulo: "Empresa creada", cuerpo: `
    <h1>Empresa creada</h1>
    <div class="tarjeta"><dl class="datos">${dato("Empresa", esc(r.empresa.nombre))}${dato("Dirección web", `<code>${esc(r.empresa.slug)}</code>`)}
      ${dato("Administrador", esc(r.admin.correo))}${urls.carta ? dato("Carta pública", `<a href="${esc(urls.carta)}">${esc(urls.carta)}</a>`) : ""}</dl></div>
    ${aviso}` });
}

export function paginaRechazada({ cfg, base, r, correo }) {
  return pagina({ cfg, base, titulo: "Solicitud rechazada", cuerpo: `
    <h1>Solicitud rechazada</h1>
    <p class="aviso" role="status">La solicitud de <strong>${esc(r.nombre)}</strong> quedó rechazada y su enlace ya no sirve. ${correo.ok ? "Le avisamos por correo." : `No se pudo avisarle por correo (${esc(correo.motivo)}).`}</p>` });
}

/** Formulario para elegir la contraseña. */
export function paginaAcceso({ cfg, base, token, quien, error = "" }) {
  const rec = quien.tipo === "recuperacion";
  return pagina({ cfg, base, titulo: rec ? "Elige una contraseña nueva" : "Crea tu contraseña", cuerpo: `
    <h1>${rec ? "Elige una contraseña nueva" : "Crea tu contraseña"}</h1>
    <p>Hola${quien.nombre ? `, ${esc(quien.nombre)}` : ""}. Tu cuenta es <strong>${esc(quien.correo)}</strong>. Elige una contraseña de al menos 10 caracteres${rec ? "; al guardarla se cerrarán las sesiones que tengas abiertas con la anterior" : " para entrar"}.</p>
    ${error ? `<p class="aviso malo" role="alert">${esc(error)}</p>` : ""}
    <form method="post" action="${esc(base)}/acceso/${esc(token)}" class="tarjeta">
      <div class="campo"><label for="password">Contraseña</label><input type="password" id="password" name="password" minlength="10" maxlength="200" required autocomplete="new-password"></div>
      <div class="campo"><label for="password2">Repítela</label><input type="password" id="password2" name="password2" minlength="10" maxlength="200" required autocomplete="new-password"></div>
      <div class="acciones"><button class="boton" type="submit">Guardar y entrar</button></div>
    </form>` });
}

export function paginaAccesoListo({ cfg, base, tipo }) {
  return pagina({ cfg, base, titulo: "Contraseña creada", cuerpo: `
    <h1>¡Listo!</h1>
    <p class="aviso" role="status">Tu contraseña quedó guardada.${tipo === "recuperacion" ? " Cerramos las sesiones que tenías abiertas: vuelve a entrar con la nueva." : ""} Ya puedes entrar con tu correo y tu contraseña.</p>
    <p><a class="boton" href="${esc(base)}/cuenta/" style="text-decoration:none;display:inline-block">Entrar a mi cuenta</a></p>` });
}

/** «¿Olvidaste tu contraseña?»: pide el correo. La confirmación es siempre la misma exista o no la cuenta. */
export function paginaRecuperar({ cfg, base, enviada = false, error = "", correo = "" }) {
  if (enviada)
    return pagina({ cfg, base, titulo: "Revisa tu correo", cuerpo: `
    <h1>Revisa tu correo</h1>
    <p class="aviso" role="status">Si ese correo tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva. Vale por 1 hora y se usa una sola vez. Si no lo ves, mira en spam.</p>
    <p><a href="${esc(base)}/cuenta/">Volver a entrar</a></p>` });
  return pagina({ cfg, base, titulo: "Recuperar mi contraseña", cuerpo: `
    <h1>Recuperar mi contraseña</h1>
    <p>Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
    ${error ? `<p class="aviso malo" role="alert">${esc(error)}</p>` : ""}
    <form method="post" action="${esc(base)}/recuperar" class="tarjeta">
      <div class="campo"><label for="correo">Tu correo</label><input type="email" id="correo" name="correo" maxlength="254" required autocomplete="email" value="${esc(correo)}"></div>
      <div class="miel" aria-hidden="true"><label>No llenes este campo <input type="text" name="sitio" tabindex="-1" autocomplete="off"></label></div>
      <div class="acciones"><button class="boton" type="submit">Enviarme el enlace</button></div>
    </form>
    <p><a href="${esc(base)}/cuenta/">Volver a entrar</a></p>` });
}
