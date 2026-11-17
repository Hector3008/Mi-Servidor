import { esc } from "../legal/plantilla.js";
import { ESTILOS } from "../tobt-info/pagina.js";

// Página de presentación del juego de agatas: qué es, cómo se juega, qué trae y capturas de sus pantallas. HTML estático sin
// scripts; enlaces e imágenes relativos a `/agatas/` (la página vive en `/agatas/info`), así que sirve con cualquier BASE_PATH.
// Las capturas son de un local de ejemplo con datos inventados (ver `img/`). Los estilos son los de la página de tobt.

// [nombre, descripción]
const HERRAMIENTAS = [
  ["Un solo QR para todo el local", "Lo imprimes una vez. Cada persona que lo escanea escribe un apodo, recibe un color al azar y una mano de piezas de ese color. No instala nada ni necesita cuenta."],
  ["Intercambio cara a cara", "Una persona ofrece una pieza y la otra se une con la suya. Cada pieza trae una pregunta que responden en voz alta; cuando los dos confirman, las piezas cambian de mano."],
  ["Premios por colores distintos", "Con 3, 5 o 6 colores distintos en la mano (tú eliges los umbrales), la persona reclama su premio y recibe un código de canje. El premio es único por partida."],
  ["El mesero valida", "El mesero escribe el código en su pantalla y entrega el premio una sola vez. También puede anular un código o retirar a alguien del juego."],
  ["Todo se configura", "Los colores, cuántas piezas hay de cada uno, el nombre de las piezas, la pregunta de cada una, los premios y los textos son tuyos. Puedes pedir cuenta para jugar si prefieres."],
  ["Reinicio programado", "Que el juego empiece de cero todos los días a cierta hora, una vez por semana, o nunca. Las partidas retiradas o reiniciadas avisan a la persona en vez de dejarla perdida."],
  ["Pensado contra trampas", "Un tope de partidas por red y de intercambios por hora, ofertas que caducan solas, premios solo con validación del mesero y piezas que nunca entran en dos intercambios a la vez."],
  ["Corre en tu cuenta", "Se administra desde la misma cuenta que usas para el resto de tus servicios, con los permisos de cada rol: quien configura, quien valida y quien solo mira."],
];

const PASOS = [
  ["Escanea el QR", "Entra con un apodo y recibe su color."],
  ["Ofrece una pieza", "La reservamos mientras dura el intercambio."],
  ["Otra persona se une", "Con el QR de la oferta o con su código de 8 letras."],
  ["Responden y confirman", "Cada pieza trae su pregunta; se contestan en persona."],
  ["Reclama el premio", "Con los colores que pediste, y el mesero lo entrega."],
];

const img = (n, w, h, alt) => `<img src="info/img/${n}.webp" width="${w}" height="${h}" loading="lazy" alt="${esc(alt)}">`;

/** La página completa. `cfg` es la configuración legal (`leerConfigLegal`): de ahí salen el nombre de la plataforma y el correo. */
export function paginaAgatasInfo(cfg) {
  const p = esc(cfg.plataforma);
  const asunto = encodeURIComponent("Quiero conocer el juego de agatas");
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
<title>Agatas · el juego del local · ${p}</title>
<meta name="description" content="Un juego de intercambio de piezas de colores para que tus clientes se conozcan, con premios que valida el mesero. Se escanea un QR y listo.">
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
        <p class="etiqueta">Agatas · el juego del local</p>
        <h1>Que tus clientes se hablen entre ellos.</h1>
        <p class="lead">Agatas es un juego de intercambio de piezas de colores para tu local. La gente escanea un QR, cambia piezas con otras personas respondiendo una pregunta, y junta colores distintos para ganar un premio que valida tu mesero.</p>
        <div class="acciones">
          ${contactarHero}
          <a class="boton secundario" href="#como-se-juega">Cómo se juega</a>
        </div>
      </div>
    </div>

    <section id="como-se-juega">
      <div class="contenedor">
        <h2>Así corre una partida</h2>
        <p class="intro">Del QR al premio, sin instalar nada y sin cuenta.</p>
        <ol class="pasos">
          ${PASOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("\n          ")}
        </ol>
        <div class="capturas">
          <div class="movil">
            <figure>
              ${img("entrada", 600, 777, "Pantalla de entrada del juego en el celular: el título Juego de agatas, una explicación breve, el campo para escribir un apodo y el botón Empezar a jugar.")}
              <figcaption><b>Entrar.</b> Un apodo y listo; el servidor le da su color.</figcaption>
            </figure>
            <figure>
              ${img("mano", 600, 1354, "La mano de una jugadora en el celular: cuatro de seis colores juntados, seis piezas numeradas de colores naranja, crema, verde y café, y un botón para ofrecer una pieza a otra persona.")}
              <figcaption><b>Tu mano.</b> Los colores que ya tienes y los que te faltan.</figcaption>
            </figure>
            <figure>
              ${img("intercambio", 600, 1177, "Pantalla de intercambio: la jugadora recibe una pieza roja y entrega una naranja, cada una con su pregunta para responder en persona, y el botón Ya respondimos, confirmar.")}
              <figcaption><b>El intercambio.</b> Cada pieza trae una pregunta; se responden cara a cara y los dos confirman.</figcaption>
            </figure>
            <figure>
              ${img("premio", 600, 862, "Lista de premios: el primero ya reclamado muestra su código de canje para enseñarle al mesero; el segundo se puede reclamar; el tercero muestra una barra de progreso con los colores que faltan.")}
              <figcaption><b>Los premios.</b> Al reclamar, sale un código de canje para el mesero.</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>

    <section id="herramientas">
      <div class="contenedor">
        <h2>Lo que trae</h2>
        <p class="intro">Tú decides las reglas; el juego se encarga de que se cumplan.</p>
        <div class="rejilla">
          ${HERRAMIENTAS.map(([t, d]) => `<article class="tarjeta"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("\n          ")}
        </div>
      </div>
    </section>

    <section id="administracion">
      <div class="contenedor">
        <h2>Tú tienes el control</h2>
        <p class="intro">Configuras el juego desde tu cuenta y tu mesero valida los premios desde su celular.</p>
        <div class="par">
          <figure>
            ${img("admin-juego", 1000, 951, "Administración, pestaña Juego: el QR del local para imprimir con los botones Imprimir QR, Copiar enlace y Pantalla del mesero, y debajo los nombres de las piezas y la cantidad por color.")}
            <figcaption><b>Configuración.</b> Tu QR, los colores, las preguntas, los premios y el reinicio.</figcaption>
          </figure>
        </div>
        <div class="movil">
          <figure>
            ${img("mesero-premios", 640, 774, "Pantalla del mesero, pestaña Premios: una lista de premios pendientes con el nombre de la persona, la hora y el código de canje.")}
            <figcaption><b>Mesero · premios.</b> Los códigos que esperan entrega.</figcaption>
          </figure>
          <figure>
            ${img("mesero-jugadores", 640, 774, "Pantalla del mesero, pestaña Jugadores: cuatro personas con la hora en que entraron y cuántos colores llevan, cada una con el botón Retirar.")}
            <figcaption><b>Mesero · jugadores.</b> Quién juega y cuántos colores lleva; puede retirar a alguien.</figcaption>
          </figure>
        </div>
        <p class="nota">Las capturas son de un local de ejemplo con datos inventados.</p>
      </div>
    </section>

    <section id="contacto">
      <div class="contenedor">
        <div class="contacto">
          <h2>¿Lo ponemos en tu local?</h2>
          <p>Cuéntanos cómo es tu local y te mostramos cómo quedaría el juego. Sin compromiso.</p>
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
