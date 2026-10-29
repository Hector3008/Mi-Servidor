import { esc } from "../legal/plantilla.js";
import { SERVICIOS_SOLICITABLES } from "../solicitudes/servicios.js";
import { dato, fechaLarga, NOMBRE_PAIS, pagina } from "../solicitudes/paginas.js";

// Pantalla de operador (5.66): HTML del servidor, sin scripts. Todo dato de terceros pasa por `esc`.
// Cada formulario lleva el campo `_csrf` de la sesión además de la cookie SameSite=Strict.

const SECCIONES = [["solicitudes", "Solicitudes"], ["empresas", "Empresas"]];
const nombreServicio = (c) => SERVICIOS_SOLICITABLES.find((s) => s.codigo === c)?.nombre ?? c;
const CAPA = ({ cfg, base, titulo, cuerpo }) => pagina({ cfg, base, titulo, cuerpo, ancho: true });

function marco({ cfg, base, csrf, seccion, titulo, cuerpo, aviso }) {
  const nav = SECCIONES.map(([k, n]) => `<a href="${esc(base)}/operador/${k}"${k === seccion ? ' aria-current="page"' : ""}>${n}</a>`).join("");
  return CAPA({ cfg, base, titulo, cuerpo: `
    <nav class="operador" aria-label="Operador">${nav}<form method="post" action="${esc(base)}/operador/salir"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="boton secundario chico" type="submit">Salir</button></form></nav>
    ${aviso ? `<p class="aviso${aviso.malo ? " malo" : ""}" role="${aviso.malo ? "alert" : "status"}">${esc(aviso.texto)}</p>` : ""}
    ${cuerpo}` });
}

export function paginaEntrar({ cfg, base, enviado = false, error = "" }) {
  return pagina({ cfg, base, titulo: "Operador", cuerpo: enviado ? `
    <h1>Revisa tu correo</h1>
    <p class="aviso" role="status">Si esta plataforma está configurada, el enlace de entrada llegó al correo del operador. Vale por 15 minutos y se usa una sola vez.</p>` : `
    <h1>Pantalla de operador</h1>
    <p>Para entrar, te enviamos un enlace de un solo uso al correo del operador.</p>
    ${error ? `<p class="aviso malo" role="alert">${esc(error)}</p>` : ""}
    <form method="post" action="${esc(base)}/operador/entrar" class="tarjeta"><div class="acciones"><button class="boton" type="submit">Enviar el enlace a mi correo</button></div></form>` });
}

/** Paso intermedio: abrir el enlace del correo no inicia sesión; hay que pulsar el botón (así un escáner de enlaces no lo gasta). */
export function paginaConfirmarEntrada({ cfg, base, token }) {
  return pagina({ cfg, base, titulo: "Entrar como operador", cuerpo: `
    <h1>Entrar como operador</h1>
    <form method="post" action="${esc(base)}/operador/acceso/${esc(token)}" class="tarjeta"><p>Pulsa para abrir tu sesión (dura 8 horas).</p><div class="acciones"><button class="boton" type="submit">Entrar</button></div></form>` });
}

export function paginaMensajeOperador({ cfg, base, titulo, texto, malo = true, enlace }) {
  return pagina({ cfg, base, titulo, cuerpo: `
    <h1>${esc(titulo)}</h1>
    <p class="aviso${malo ? " malo" : ""}" role="${malo ? "alert" : "status"}">${esc(texto)}</p>
    ${enlace ? `<p><a href="${esc(enlace.href)}">${esc(enlace.texto)}</a></p>` : ""}` });
}

const FILTROS = [["pendiente", "Pendientes"], ["aprobada", "Aprobadas"], ["rechazada", "Rechazadas"], ["todas", "Todas"]];
const ETIQUETA = { pendiente: ["Pendiente", ""], procesando: ["Procesando", ""], incompleta: ["A medias", "malo"], aprobada: ["Aprobada", "ok"], rechazada: ["Rechazada", "malo"] };

export function paginaSolicitudes({ cfg, base, csrf, filtro, filas, pendientes, aviso }) {
  const tabs = FILTROS.map(([k, n]) => `<a href="${esc(base)}/operador/solicitudes?estado=${k}"${k === filtro ? ' aria-current="page"' : ""}>${n}</a>`).join(" · ");
  const lista = filas
    .map((s) => {
      const [txt, cls] = ETIQUETA[s.estado] ?? [s.estado, ""];
      const abierta = ["pendiente", "incompleta"].includes(s.estado) && !s.vencida;
      const acciones = abierta
        ? `<div class="acciones">
            <form method="post" action="${esc(base)}/operador/solicitudes/${esc(s.id)}/aprobar"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="boton chico" type="submit">${s.estado === "incompleta" ? "Reanudar aprobación" : "Aprobar"}</button></form>
            <form method="post" action="${esc(base)}/operador/solicitudes/${esc(s.id)}/rechazar"><input type="hidden" name="_csrf" value="${esc(csrf)}"><button class="boton peligro chico" type="submit">Rechazar</button></form></div>`
        : "";
      return `<article class="tarjeta"><h2 style="margin:0 0 8px;font-size:1.1rem">${esc(s.nombre)} <span class="etiqueta ${cls}">${esc(txt)}</span>${s.vencida ? ' <span class="etiqueta malo">Vencida</span>' : ""}</h2>
        <dl class="datos">${dato("Dirección web", `<code>${esc(s.slug)}</code>`)}${dato("Servicios", s.servicios.map((c) => esc(nombreServicio(c))).join(", "))}
        ${dato("País y moneda", `${esc(NOMBRE_PAIS[s.pais] ?? s.pais)} · ${esc(s.moneda)}`)}${dato("Administrador", `${esc(s.adminNombre)} &lt;${esc(s.adminCorreo)}&gt;`)}${dato("Teléfono", esc(s.telefono))}
        ${dato("Recibida", esc(fechaLarga(s.creadaTs)))}${s.error ? dato("Último error", esc(s.error)) : ""}</dl>${acciones}</article>`;
    })
    .join("");
  return marco({ cfg, base, csrf, seccion: "solicitudes", titulo: "Solicitudes", aviso, cuerpo: `
    <h1>Solicitudes de empresa</h1>
    <p>${pendientes} por resolver. ${tabs}</p>
    ${lista || '<p class="aviso" role="status">No hay solicitudes en esta vista.</p>'}` });
}

export function paginaEmpresas({ cfg, base, csrf, filas, texto = "", aviso }) {
  const lista = filas
    .map((e) => {
      const admins = e.admins.length
        ? e.admins
            .map(
              (a) => `<li>${esc(a.nombre ?? "")} &lt;${esc(a.correo)}&gt;${a.suspendido ? ' <span class="etiqueta malo">Cuenta suspendida</span>' : ` <form class="en-linea" method="post" action="${esc(base)}/operador/empresas/${esc(e.id)}/reenviar"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="usuarioId" value="${esc(a.id)}"><button class="boton secundario chico" type="submit">Reenviar acceso</button></form>`}</li>`,
            )
            .join("")
        : "<li>Sin administradores activos</li>";
      return `<article class="tarjeta"><h2 style="margin:0 0 8px;font-size:1.1rem">${esc(e.nombre)} <span class="etiqueta ${e.activa ? "ok" : "malo"}">${e.activa ? "Activa" : "Suspendida"}</span></h2>
        <dl class="datos">${dato("Dirección web", `<code>${esc(e.slug)}</code>`)}${dato("Servicios", e.servicios.map((c) => esc(nombreServicio(c))).join(", ") || "—")}${dato("País y moneda", `${esc(NOMBRE_PAIS[e.pais] ?? e.pais ?? "—")} · ${esc(e.moneda ?? "—")}`)}${e.creadaTs ? dato("Creada", esc(fechaLarga(e.creadaTs))) : ""}${dato("Administradores", `<ul style="margin:0;padding-left:18px">${admins}</ul>`)}</dl>
        <form method="post" action="${esc(base)}/operador/empresas/${esc(e.id)}/estado"><input type="hidden" name="_csrf" value="${esc(csrf)}"><input type="hidden" name="activa" value="${e.activa ? "0" : "1"}">
          <button class="boton ${e.activa ? "peligro" : ""} chico" type="submit">${e.activa ? "Suspender empresa" : "Reactivar empresa"}</button></form></article>`;
    })
    .join("");
  return marco({ cfg, base, csrf, seccion: "empresas", titulo: "Empresas", aviso, cuerpo: `
    <h1>Empresas</h1>
    <form method="get" action="${esc(base)}/operador/empresas" class="campo" role="search"><label for="q">Buscar por nombre o dirección web</label><input type="text" id="q" name="q" maxlength="60" value="${esc(texto)}"></form>
    <p style="color:var(--texto-suave)">Suspender una empresa la oculta al elegir empresa, su carta pública deja de verse y sus sesiones se quedan sin permisos. No borra nada: reactivarla lo deja como estaba.</p>
    ${lista || '<p class="aviso" role="status">No hay empresas que coincidan.</p>'}` });
}

export function paginaResultado({ cfg, base, csrf, titulo, cuerpo, volver }) {
  return marco({ cfg, base, csrf, seccion: volver.seccion, titulo, cuerpo: `<h1>${esc(titulo)}</h1>${cuerpo}<p><a href="${esc(base)}/operador/${esc(volver.seccion)}">Volver a ${esc(volver.nombre)}</a></p>` });
}
