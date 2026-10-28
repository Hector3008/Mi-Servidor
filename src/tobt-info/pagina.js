import { esc } from "../legal/plantilla.js";

// Página de presentación de tobt (5.63): qué es, cómo funciona el flujo del local, qué herramientas trae y capturas de su
// interfaz. HTML estático sin scripts; enlaces e imágenes relativos a `/tobt/` (la página vive en `/tobt/info`), así que
// sirve con cualquier BASE_PATH. Las capturas son de una cafetería de ejemplo con datos inventados (ver `img/`).

const ESTILOS = `
  :root { --fondo:#f7f6f2; --superficie:#fff; --texto:#1c1f24; --texto-suave:#5a6270; --borde:#dcd9d0; --principal:#1f5f4a; --principal-texto:#fff; --acento:#b4561b; --radio:14px; --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  @media (prefers-color-scheme: dark) {
    :root { --fondo:#12151a; --superficie:#1a1f26; --texto:#eceef2; --texto-suave:#a2abb8; --borde:#2b323c; --principal:#5fc3a0; --principal-texto:#0c1713; --acento:#e59a63; }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body { margin: 0; background: var(--fondo); color: var(--texto); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  a { color: inherit; }
  a:focus-visible { outline: 3px solid var(--acento); outline-offset: 2px; }
  .contenedor { max-width: 960px; margin: 0 auto; padding: 0 16px; }
  header.barra { padding: 20px 0; }
  header.barra .contenedor { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .marca { font-weight: 700; text-decoration: none; }
  .marca span { color: var(--acento); }
  .boton { display: inline-block; text-decoration: none; font-weight: 600; padding: 10px 18px; border-radius: 999px; background: var(--principal); color: var(--principal-texto); border: 1px solid var(--principal); }
  .boton.secundario { background: transparent; color: var(--texto); border-color: var(--borde); }
  .boton:hover { filter: brightness(1.06); }
  .hero { padding: 48px 0 32px; }
  .etiqueta { margin: 0 0 12px; font: 600 13px/1 var(--mono); text-transform: uppercase; letter-spacing: .12em; color: var(--acento); }
  h1 { margin: 0 0 16px; font-size: clamp(2rem, 6vw, 3.1rem); line-height: 1.1; letter-spacing: -.02em; max-width: 20ch; }
  .lead { margin: 0 0 28px; max-width: 58ch; font-size: 1.125rem; color: var(--texto-suave); }
  .acciones { display: flex; flex-wrap: wrap; gap: 12px; }
  section { padding: 36px 0; border-top: 1px solid var(--borde); }
  h2 { margin: 0 0 8px; font-size: 1.5rem; letter-spacing: -.01em; }
  .intro { margin: 0 0 22px; color: var(--texto-suave); max-width: 62ch; }
  .pasos { counter-reset: paso; display: grid; gap: 10px; margin: 0 0 24px; padding: 0; list-style: none; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
  .pasos li { counter-increment: paso; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 14px 16px; }
  .pasos li::before { content: counter(paso); display: inline-block; width: 26px; height: 26px; line-height: 26px; text-align: center; border-radius: 50%; background: var(--principal); color: var(--principal-texto); font-weight: 700; font-size: .85rem; margin-bottom: 8px; }
  .pasos b { display: block; }
  .pasos span { color: var(--texto-suave); font-size: .92rem; }
  .rejilla { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
  .tarjeta { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 18px; }
  .tarjeta h3 { margin: 0 0 6px; font-size: 1.05rem; }
  .tarjeta p { margin: 0; color: var(--texto-suave); font-size: .95rem; }
  figure { margin: 0; }
  figure img { display: block; width: 100%; height: auto; border: 1px solid var(--borde); border-radius: var(--radio); background: var(--superficie); }
  figcaption { margin-top: 8px; color: var(--texto-suave); font-size: .92rem; }
  figcaption b { color: var(--texto); }
  .capturas { display: grid; gap: 28px; }
  .par { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); align-items: start; }
  .movil { display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items: start; }
  .movil figure { max-width: 320px; }
  .nota { margin: 20px 0 0; color: var(--texto-suave); font-size: .9rem; }
  .contacto { background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); padding: 28px 22px; text-align: center; }
  .contacto h2 { margin-bottom: 8px; }
  .contacto p { margin: 0 auto 18px; max-width: 52ch; color: var(--texto-suave); }
  footer { padding: 28px 0 48px; border-top: 1px solid var(--borde); color: var(--texto-suave); font-size: .9rem; }
  footer .contenedor { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 24px; }
  @media (max-width: 560px) { .hero { padding-top: 28px; } .acciones .boton, .contacto .boton { width: 100%; text-align: center; } }
`;

// [nombre, descripción]
const HERRAMIENTAS = [
  ["Pedidos por mesa o por persona", "Abre la cuenta, agrega platos del catálogo o ítems libres, cambia notas y corrige un precio sin anular. Cuando la mesa paga por separado, cada ítem se cobra a quien corresponde."],
  ["Cocina ítem por ítem", "Cada plato es una tarjeta con su hora. Sale primero el café, sin esperar al resto de la mesa. Un toque en «Listo» y el mesero lo ve."],
  ["Platos agotados", "Cocina marca lo que hoy no hay. El mesero recibe una advertencia al cargar el pedido y tu carta lo muestra como «Agotado»."],
  ["Carta pública", "Tus clientes abren la carta desde el celular con un enlace tuyo, con tu logo, tus colores, fotos y descripciones de cada plato."],
  ["Puntos, vales y retos", "Tus clientes acumulan puntos al pagar y los canjean por vales; hay niveles, insignias, retos por categoría y puntos por traer amigos."],
  ["Promociones y anuncios", "2x1, descuentos por combo, por día o por horario, aplicados solos al pedido; y los eventos o avisos que quieras mostrar en la carta."],
  ["Reseñas de tus platos", "Solo opina quien ya pagó el plato. Se publican al instante y tú puedes ocultar las que no corresponden."],
  ["Recibos y cuenta", "Recibo de pago numerado y cuenta de consumo, listos para imprimir en 80 mm o A4, con tu logo y tus datos. No son comprobantes electrónicos."],
  ["Reportes de ventas", "Ventas en el tiempo, por categoría, por mesero y por cliente, platos más vendidos y horas pico."],
  ["Equipo, roles y tablets", "Cada persona entra con lo que su rol le permite. En el salón, las tablets se emparejan y el personal entra con un PIN."],
];

const PASOS = [
  ["El mesero abre el pedido", "Mesa, persona o barra, y los platos del catálogo."],
  ["La cocina prepara", "Ve cada ítem y lo marca listo."],
  ["Se entrega", "El mesero marca lo que ya salió a la mesa."],
  ["Caja cobra", "Todo, o solo lo que paga cada quien."],
  ["Recibo y puntos", "El recibo sale al cobrar y el cliente suma sus puntos."],
];

const img = (n, w, h, alt) => `<img src="info/img/${n}.webp" width="${w}" height="${h}" loading="lazy" alt="${esc(alt)}">`;

/** La página completa. `cfg` es la configuración legal (`leerConfigLegal`): de ahí salen el nombre de la plataforma y el correo. */
export function paginaTobtInfo(cfg) {
  const p = esc(cfg.plataforma);
  const asunto = encodeURIComponent("Quiero conocer tobt");
  const correo = cfg.correo ? esc(cfg.correo) : "";
  const contactar = correo
    ? `<a class="boton" href="mailto:${correo}?subject=${asunto}">Escríbenos a ${correo}</a>`
    : `<span class="boton secundario" aria-disabled="true">Correo de contacto próximamente</span>`;
  const contactarHero = correo ? `<a class="boton" href="mailto:${correo}?subject=${asunto}">Contáctanos</a>` : `<a class="boton" href="#contacto">Contáctanos</a>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tobt · to bar and table · ${p}</title>
<meta name="description" content="Tobt reúne los pedidos del salón, la cocina, la caja y la carta de tu local en un solo lugar, con puntos y promociones para tus clientes.">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="../favicon-32.png">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<style>${ESTILOS}</style>
</head>
<body>
  <header class="barra">
    <div class="contenedor">
      <a class="marca" href="../">${p}</a>
      <a class="boton secundario" href="../cuenta/">Entrar</a>
    </div>
  </header>

  <main>
    <div class="hero">
      <div class="contenedor">
        <p class="etiqueta">Tobt · to bar and table</p>
        <h1>Tu salón, tu cocina y tu caja, en una sola pantalla.</h1>
        <p class="lead">Tobt es el servicio de ${p} para bares, cafeterías y restaurantes: el mesero toma el pedido, la cocina lo ve al instante, caja cobra y tus clientes tienen su carta, sus puntos y sus promociones en el celular.</p>
        <div class="acciones">
          ${contactarHero}
          <a class="boton secundario" href="#como-funciona">Cómo funciona</a>
        </div>
      </div>
    </div>

    <section id="como-funciona">
      <div class="contenedor">
        <h2>Así corre un pedido</h2>
        <p class="intro">Del pedido al recibo, sin papelitos ni gritos a la cocina.</p>
        <ol class="pasos">
          ${PASOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("\n          ")}
        </ol>
        <div class="par">
          <figure>
            ${img("pedidos", 760, 760, "Lista de pedidos abiertos: mesa 5, mesa 2, barra y mesa 7, cada uno con sus platos, su estado y su total.")}
            <figcaption><b>Pedidos.</b> Todas las cuentas abiertas, con el estado de cada plato y lo que falta por cobrar.</figcaption>
          </figure>
          <figure>
            ${img("cocina", 760, 470, "Pantalla de Cocina con cuatro tarjetas de platos en preparación, cada una con su cantidad, su nota, el tiempo que lleva y el botón Listo.")}
            <figcaption><b>Cocina.</b> Una tarjeta por plato, con su nota y el tiempo que lleva esperando.</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="herramientas">
      <div class="contenedor">
        <h2>Lo que trae</h2>
        <p class="intro">Cada local usa lo que necesita; cada persona ve solo lo que su rol permite.</p>
        <div class="rejilla">
          ${HERRAMIENTAS.map(([t, d]) => `<article class="tarjeta"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section id="capturas">
      <div class="contenedor">
        <h2>Tus clientes, en el celular</h2>
        <p class="intro">La carta de tu local, con lo que hoy no hay y las opiniones de quienes ya probaron cada plato.</p>
        <div class="capturas">
          <div class="movil">
            <figure>
              ${img("carta", 780, 1500, "Carta pública en el celular: el nombre del local, un buscador, categorías y platos con su precio; la Moka aparece con la etiqueta Agotado.")}
              <figcaption><b>La carta.</b> Con buscador y categorías. Lo agotado se ve marcado.</figcaption>
            </figure>
            <figure>
              ${img("plato", 780, 1557, "Detalle de un plato en el celular: Cheesecake de maracuyá con su precio, su descripción, la nota promedio y las reseñas de otros clientes.")}
              <figcaption><b>El plato.</b> Descripción, foto, nota promedio y reseñas de clientes que ya lo pagaron.</figcaption>
            </figure>
            <figure>
              ${img("agotados", 780, 1500, "Pantalla Platos agotados de la cocina en el celular: Moka y Torta de chocolate marcadas como agotadas desde hace 35 minutos, con el botón Ya hay, y otros platos con el botón Marcar agotado.")}
              <figcaption><b>Platos agotados.</b> Cocina marca y quita en un toque, desde cualquier celular o tablet.</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>

    <section id="administracion">
      <div class="contenedor">
        <h2>Tú tienes el control</h2>
        <p class="intro">Desde tu cuenta administras el equipo, el catálogo, los puntos, las promociones, los anuncios, las reseñas y los reportes.</p>
        <div class="par">
          <figure>
            ${img("cuenta-inicio", 800, 700, "Inicio de la cuenta con accesos a Mi perfil, Equipo, Catálogo, Fidelización, Promociones, Anuncios, Reseñas, Reportes, Empresa, Pedidos, Cocina y Platos agotados.")}
            <figcaption><b>Tu inicio.</b> Cada persona ve solo los accesos que su rol permite.</figcaption>
          </figure>
          <figure>
            ${img("resenas-admin", 980, 520, "Administración, pestaña Reseñas: una tabla con el plato, la nota, el comentario, el autor y el estado de cada reseña, con botones Ocultar y Mostrar.")}
            <figcaption><b>Reseñas.</b> Ves primero las que los clientes reportaron y ocultas las que no corresponden.</figcaption>
          </figure>
        </div>
        <p class="nota">Las capturas son de una cafetería de ejemplo («Café Aurora») con datos inventados.</p>
      </div>
    </section>

    <section id="contacto">
      <div class="contenedor">
        <div class="contacto">
          <h2>¿Lo probamos en tu local?</h2>
          <p>Cuéntanos cómo trabajas hoy y te mostramos cómo quedaría. Sin compromiso.</p>
          ${contactar}
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="contenedor">
      <span>${p}</span>
      <nav><a href="../">Inicio</a> · <a href="../terminos">Términos y condiciones</a> · <a href="../privacidad">Política de privacidad</a> · <a href="../cuenta/">Entrar</a></nav>
    </div>
  </footer>
</body>
</html>
`;
}
