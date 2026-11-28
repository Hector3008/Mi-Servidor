import { esc } from "../legal/plantilla.js";
import { ESTILOS } from "../tobt-info/pagina.js";

// Página de presentación de topd (to Picking and Dispatch): qué es, cómo corre un pedido por las cuatro estaciones, qué herramientas
// trae y capturas de su interfaz. HTML estático sin scripts; enlaces e imágenes relativos a `/topd/` (la página vive en `/topd/info`),
// así que sirve con cualquier BASE_PATH. Las capturas son de una empresa de ejemplo con datos inventados (ver `img/`). Los estilos son
// los mismos de tobt y agatas para que todas las presentaciones de la plataforma se vean de la misma familia.

// [nombre, descripción]
const HERRAMIENTAS = [
  ["Guía con opciones del catálogo", "Busca por todas las palabras de la descripción en código, nombre, marca, proveedor y familia, y muestra el stock y la ubicación de cada opción. Lo que no sirve se tacha antes de llegar al almacén."],
  ["Carga desde Excel o PDF", "Ventas arma la proforma a mano o sube un archivo; hay una plantilla de Excel descargable. Revisas lo cargado antes de crear."],
  ["Sacar por opción y por piso", "De una línea de 5 se pueden sacar 3 de una opción y 2 de otra, cada una con su piso. Si falta algo, el almacén agrega otra opción o un ítem nuevo."],
  ["Puntaje por piso", "Cada piso tiene su puntaje, configurable por empresa. Taller, muestra y foto suman aparte, una sola vez por línea."],
  ["Revisión opción por opción", "Quien despacha marca lo que realmente salió, corrige si hace falta, fotografía el pedido completo y lo cierra."],
  ["Fotos en tu Google Drive", "De cada línea y del despacho completo. En la base de datos solo se guarda el enlace, no la imagen."],
  ["Stock al día", "Se sincroniza desde tu hoja de Google cada pocos minutos y solo envía lo que cambió."],
  ["Supervisión del día", "Cuánto se sacó, qué sigue pendiente, quién busca qué y a qué ritmo va la última hora."],
  ["Reportes de puntajes y tiempos", "Por persona, por piso y por día, para saber cómo trabaja el almacén."],
  ["Relacionales para tu Excel", "Al cerrar un pedido queda una fila por opción sacada, con fecha, código, cantidad e importes. Se descarga en Excel para descontar el stock; si un pedido se anula, sus filas también."],
  ["Emisores y configuración", "Las razones sociales que emiten, los pisos y los puntajes se configuran por empresa, sin tocar código."],
  ["Equipo y roles", "Creación, almacén, revisión, bandeja, configuración y supervisión se dan por separado: cada persona ve solo lo que le toca."],
];

const PASOS = [
  ["Ventas crea la proforma", "A mano o desde un Excel o PDF, con su guía de almacén."],
  ["El almacén saca", "Marca cada opción, su piso y sus fotos."],
  ["Revisión valida", "Comprueba opción por opción y fotografía el despacho."],
  ["Bandeja y Excel", "El pedido queda a la vista y sus relacionales se descargan."],
];

const img = (n, w, h, alt) => `<img src="info/img/${n}.webp" width="${w}" height="${h}" loading="lazy" alt="${esc(alt)}">`;

/** La página completa. `cfg` es la configuración legal (`leerConfigLegal`): de ahí salen el nombre de la plataforma y el correo. */
export function paginaTopdInfo(cfg) {
  const p = esc(cfg.plataforma);
  const asunto = encodeURIComponent("Quiero conocer topd");
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
<title>Topd · to Picking and Dispatch · ${p}</title>
<meta name="description" content="Topd junta ventas, almacén y revisión en un solo flujo: la proforma, el picking por opción y piso, la revisión del despacho y los relacionales para tu Excel.">
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
        <p class="etiqueta">Topd · to Picking and Dispatch</p>
        <h1>Cada repuesto, de la proforma a la entrega.</h1>
        <p class="lead">Topd es el servicio de ${p} para negocios que venden y despachan por pedido: ventas arma la proforma, el almacén saca cada pieza de su opción y de su piso, y quien despacha lo revisa antes de entregarlo.</p>
        <div class="acciones">
          ${contactarHero}
          <a class="boton secundario" href="#como-funciona">Cómo funciona</a>
        </div>
      </div>
    </div>

    <section id="como-funciona">
      <div class="contenedor">
        <h2>Así corre un pedido</h2>
        <p class="intro">Cuatro estaciones, en este orden. Cada persona entra solo a las que le tocan según su rol.</p>
        <ol class="pasos">
          ${PASOS.map(([t, d]) => `<li><b>${esc(t)}</b><span>${esc(d)}</span></li>`).join("\n          ")}
        </ol>
        <figure>
          ${img("creacion", 1400, 1000, "Estación de creación: a la izquierda el formulario del cliente y de la venta, con el botón Cargar desde Excel o PDF; a la derecha la vista previa de la guía de almacén con tres opciones del catálogo por cada línea.")}
          <figcaption><b>Creación.</b> La proforma se arma a mano o desde un archivo, y la guía de almacén se ve en vivo con las opciones del catálogo.</figcaption>
        </figure>
      </div>
    </section>

    <section id="herramientas">
      <div class="contenedor">
        <h2>Lo que trae</h2>
        <p class="intro">Cada empresa lo configura a su manera; cada persona ve solo lo que su rol permite.</p>
        <div class="rejilla">
          ${HERRAMIENTAS.map(([t, d]) => `<article class="tarjeta"><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join("\n          ")}
        </div>
        <p class="nota">Topd no emite comprobantes electrónicos: la factura se emite fuera del sistema.</p>
      </div>
    </section>

    <section id="capturas">
      <div class="contenedor">
        <h2>En el almacén, en el celular</h2>
        <p class="intro">Quien busca, quien revisa y quien supervisa trabajan desde su celular o tablet.</p>
        <div class="capturas">
          <div class="movil">
            <figure>
              ${img("almacen", 760, 2240, "Estación Almacén en el celular: una proforma con 20 unidades de bendix navara y tres opciones del catálogo, cada una con su piso y las unidades sacadas, el resumen de lo encontrado con sus puntos y el botón Listo para revisión.")}
              <figcaption><b>Almacén.</b> Cada opción con su piso y sus unidades; el puntaje se calcula solo.</figcaption>
            </figure>
            <figure>
              ${img("revision", 760, 1732, "Estación Revisión en el celular: una proforma con dos líneas; en la primera, dos casillas para confirmar cada opción sacada y, en la segunda, una casilla para revisar la línea; el botón de cerrar sigue bloqueado hasta revisarlas todas.")}
              <figcaption><b>Revisión.</b> Se confirma opción por opción; no se cierra hasta revisar todo.</figcaption>
            </figure>
            <figure>
              ${img("supervision", 760, 2586, "Vista de Supervisión en el celular: puntos del día, líneas resueltas, pendientes, quién está buscando ahora, el avance por persona y las líneas resueltas por hora.")}
              <figcaption><b>Supervisión.</b> Lo que se sacó hoy, lo pendiente y quién lo está buscando.</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>

    <section id="relacionales">
      <div class="contenedor">
        <h2>Del pedido a tu Excel</h2>
        <p class="intro">Al cerrar un pedido, cada opción sacada queda como una fila lista para descontar el stock.</p>
        <figure>
          ${img("relacionales", 1000, 773, "Pestaña Relacionales: filtros por fechas, estado y proforma; totales de filas, unidades e importe; el botón Descargar Excel y una tabla con fecha, proforma, código, cantidad, unitario, total y descripción.")}
          <figcaption><b>Relacionales.</b> Filtras por fecha, estado o proforma y descargas el Excel con las filas vigentes.</figcaption>
        </figure>
        <p class="nota">Las capturas son de una empresa de ejemplo con datos inventados.</p>
      </div>
    </section>

    <section id="contacto">
      <div class="contenedor">
        <div class="contacto">
          <h2>¿Lo probamos en tu almacén?</h2>
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
