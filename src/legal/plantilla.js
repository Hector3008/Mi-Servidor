// Plantilla común de las páginas legales: HTML estático, sin scripts, con los mismos colores que el landing.

/** Escapa texto para ponerlo dentro de HTML (los datos del responsable vienen del entorno). */
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
/** «2026-10-25» → «25 de octubre de 2026». */
export function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return esc(iso);
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

export const ESTILOS = `
  :root { --fondo:#f7f6f2; --superficie:#fff; --texto:#1c1f24; --texto-suave:#5a6270; --borde:#dcd9d0; --principal:#1f5f4a; --acento:#b4561b; --aviso:#fff4e5; --aviso-borde:#e8c48f; }
  @media (prefers-color-scheme: dark) {
    :root { --fondo:#12151a; --superficie:#1a1f26; --texto:#eceef2; --texto-suave:#a2abb8; --borde:#2b323c; --principal:#5fc3a0; --acento:#e59a63; --aviso:#2a2118; --aviso-borde:#6b4d2a; }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body { margin: 0; background: var(--fondo); color: var(--texto); font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  a { color: var(--principal); }
  a:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
  .contenedor { max-width: 760px; margin: 0 auto; padding: 0 16px; }
  header.barra { padding: 20px 0; border-bottom: 1px solid var(--borde); }
  header.barra .contenedor { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .marca { font-weight: 700; text-decoration: none; color: var(--texto); }
  .marca span { color: var(--acento); }
  main { padding: 32px 0 48px; }
  h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 4px; }
  h2 { font-size: 1.2rem; margin: 32px 0 8px; }
  p, li { margin: 0 0 10px; }
  ul { padding-left: 22px; margin: 0 0 12px; }
  .vigencia { color: var(--texto-suave); margin-bottom: 24px; }
  .indice { background: var(--superficie); border: 1px solid var(--borde); border-radius: 12px; padding: 12px 16px; margin: 0 0 8px; }
  .indice ol { margin: 6px 0 0; padding-left: 22px; columns: 2 220px; }
  .indice li { margin: 0 0 4px; }
  .aviso { background: var(--aviso); border: 1px solid var(--aviso-borde); border-radius: 12px; padding: 10px 14px; margin: 0 0 20px; }
  footer { padding: 24px 0 40px; border-top: 1px solid var(--borde); color: var(--texto-suave); font-size: .9rem; }
  footer .contenedor { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; }
  @media print { header.barra nav, footer nav, .indice { display: none; } body { background: #fff; color: #000; } }
`;

/**
 * Arma una página legal completa.
 * @param {{ cfg: object, titulo: string, descripcion: string, vigencia: string, secciones: Array<[string, string]>, otra: { href: string, texto: string } }} p
 *   `secciones`: [título, html del cuerpo]; el cuerpo ya viene con sus datos escapados.
 */
export function pagina({ cfg, titulo, descripcion, vigencia, secciones, otra, aviso = "" }) {
  const indice = secciones.map(([t], i) => `<li><a href="#s${i + 1}">${esc(t)}</a></li>`).join("");
  const cuerpo = secciones.map(([t, html], i) => `<section id="s${i + 1}"><h2>${i + 1}. ${esc(t)}</h2>${html}</section>`).join("\n");
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)} · ${esc(cfg.plataforma)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>${ESTILOS}</style>
</head>
<body>
  <header class="barra">
    <div class="contenedor">
      <a class="marca" href="./">${esc(cfg.plataforma)}</a>
      <nav><a href="./">Inicio</a> · <a href="${esc(otra.href)}">${esc(otra.texto)}</a></nav>
    </div>
  </header>
  <main>
    <div class="contenedor">
      <h1>${esc(titulo)}</h1>
      <p class="vigencia">Versión vigente desde el ${fechaLarga(vigencia)}.</p>
      ${aviso}
      <nav class="indice" aria-label="Contenido"><strong>Contenido</strong><ol>${indice}</ol></nav>
      ${cuerpo}
    </div>
  </main>
  <footer>
    <div class="contenedor">
      <a href="./">${esc(cfg.plataforma)}</a>
      <nav><a href="terminos">Términos y condiciones</a> · <a href="privacidad">Política de privacidad</a></nav>
    </div>
  </footer>
</body>
</html>
`;
}

/** Los datos de contacto como texto HTML (con enlace de correo solo si es válido). */
export function contacto(cfg) {
  if (!cfg.correo) return "los datos de contacto que el responsable publique en este sitio";
  return `<a href="mailto:${esc(cfg.correo)}">${esc(cfg.correo)}</a>`;
}

/** Quién presta el servicio, con su documento si lo hay. */
export function responsable(cfg) {
  if (!cfg.responsable) return `el responsable de ${esc(cfg.plataforma)}`;
  return cfg.documento ? `${esc(cfg.responsable)} (${esc(cfg.documento)})` : esc(cfg.responsable);
}

/** Aviso visible cuando faltan datos del responsable (para que no pase a producción sin darse cuenta). */
export function avisoConfiguracion(cfg) {
  if (!cfg.faltantes.length) return "";
  return `<p class="aviso" role="note"><strong>Pendiente de configurar:</strong> el administrador de la plataforma todavía no completó los datos del responsable (${cfg.faltantes.map(esc).join(", ")}).</p>`;
}
