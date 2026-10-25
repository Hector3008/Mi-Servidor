import { VERSION_TERMINOS } from "./config.js";
import { avisoConfiguracion, contacto, esc, pagina, responsable } from "./plantilla.js";

/** Términos y condiciones de uso. Los datos del responsable salen de la configuración (ver config.js). */
export function paginaTerminos(cfg) {
  const P = esc(cfg.plataforma);
  const secciones = [
    ["Quién presta el servicio", `
      <p>${P} es una plataforma que ofrece a negocios (bares, cafeterías, restaurantes y tiendas; en adelante, «los establecimientos») herramientas para administrar su operación (carta, pedidos, clientes, puntos, promociones y anuncios) y, a las personas que los visitan, una cuenta para ver la carta y consultar sus puntos.</p>
      <p>El servicio lo presta ${responsable(cfg)}. Puedes escribirnos a ${contacto(cfg)}.</p>`],
    ["Aceptación de estos términos", `
      <p>Al crear una cuenta, entrar con tu correo, teléfono o con Google, o usar la plataforma, aceptas estos términos y la <a href="privacidad">política de privacidad</a>. Si no estás de acuerdo, no uses el servicio.</p>
      <p>Si eres menor de edad, usa el servicio solo con el permiso y la supervisión de tu madre, padre o tutor.</p>`],
    ["Quién usa la plataforma", `
      <ul>
        <li><strong>Clientes:</strong> personas que crean o usan una cuenta en la carta de un establecimiento.</li>
        <li><strong>Personal y administradores:</strong> personas a quienes un establecimiento da acceso para trabajar en el sistema, con los permisos que el establecimiento decida.</li>
        <li><strong>Establecimientos:</strong> los negocios que usan la plataforma para atender a sus clientes.</li>
      </ul>`],
    ["Tu cuenta", `
      <ul>
        <li>Los datos que das (nombre, correo, teléfono) deben ser verdaderos y tuyos.</li>
        <li>Eres responsable de tu contraseña y de lo que se haga con tu sesión. No la compartas. Si crees que alguien entró a tu cuenta, avísanos y cambia tu contraseña.</li>
        <li>Si entras con Google, tu acceso depende de tu cuenta de Google; la plataforma no ve tu contraseña de Google.</li>
        <li>Tu cuenta de cliente es de un establecimiento. Si visitas otro, tendrás una ficha distinta allí: los establecimientos no comparten tus datos entre sí.</li>
        <li>Puedes corregir tu nombre desde tu cuenta y pedir que se cancele cuando quieras (ver la política de privacidad).</li>
      </ul>`],
    ["Puntos, promociones, vales y beneficios", `
      <ul>
        <li>Los puntos, promociones, vales, logros y beneficios los define y otorga <strong>cada establecimiento</strong>, no la plataforma. Sus reglas (cuánto se acumula, niveles, vigencias, topes, qué se puede canjear) pueden cambiar.</li>
        <li>Los puntos no son dinero: no se pueden cambiar por efectivo, ni transferir a otra persona, salvo que el establecimiento diga expresamente lo contrario.</li>
        <li>Solo acumulas puntos si aceptas participar en el programa, y desde ese momento; no se dan por consumos anteriores. Puedes retirar tu aceptación cuando quieras desde tu cuenta. Lo que ocurre con los puntos ya acumulados lo define el establecimiento.</li>
        <li>Los premios por invitar a un amigo tienen condiciones (por ejemplo, que el amigo sea una cuenta nueva y pague su primer consumo) y topes. Podemos negar o revertir puntos obtenidos con engaños, cuentas falsas o abuso del programa.</li>
      </ul>`],
    ["Cartas, pedidos, precios y recibos", `
      <ul>
        <li>La carta es informativa. Los precios, la disponibilidad de los platos y las promociones los fija cada establecimiento y pueden cambiar sin aviso.</li>
        <li>Los pedidos y los pagos se hacen en el local con su personal. Las promociones automáticas se aplican al pedir en el local. La plataforma no procesa pagos ni te pide datos de tarjeta.</li>
        <li>Los recibos y cuentas que emite el sistema son documentos de control del establecimiento: no son facturas, boletas ni comprobantes de pago electrónicos.</li>
      </ul>`],
    ["Anuncios y contenido de los establecimientos", `
      <p>Los eventos, la publicidad, los nombres de platos, las descripciones y las fotos que se ven en una carta los publica el establecimiento, que es responsable de ellos. Las imágenes se muestran desde enlaces a sitios de terceros, sobre los que ${P} no tiene control. Podemos retirar contenido ilícito o que infrinja derechos de terceros.</p>`],
    ["Uso aceptable", `
      <p>No está permitido:</p>
      <ul>
        <li>entrar a cuentas o datos que no son tuyos, ni intentar saltarse los controles de seguridad o los permisos;</li>
        <li>suplantar a otra persona, crear cuentas falsas o usar el servicio para obtener beneficios de forma fraudulenta;</li>
        <li>enviar peticiones automáticas masivas, probar contraseñas o sobrecargar el servicio;</li>
        <li>usar el servicio para fines ilícitos o para dañar a otras personas.</li>
      </ul>`],
    ["Si eres un establecimiento o parte de su personal", `
      <ul>
        <li>El establecimiento es responsable de lo que registra en el sistema (clientes, pedidos, precios, promociones, anuncios) y de contar con la base legal y los consentimientos necesarios para tratar los datos de sus clientes.</li>
        <li>El establecimiento decide quién de su personal tiene acceso y con qué permisos, y debe dar de baja a quien deje de trabajar con él. Cada persona cuida sus credenciales.</li>
        <li>Los clientes pueden dirigirse al establecimiento para ejercer sus derechos sobre sus datos; el establecimiento debe atenderlos. ${P} presta apoyo técnico para ello.</li>
        <li>Si hay un acuerdo comercial aparte (precio, soporte, plazos), ese acuerdo se suma a estos términos.</li>
      </ul>`],
    ["Disponibilidad y cambios del servicio", `
      <p>Procuramos que el servicio funcione de forma continua, pero se ofrece «tal como está»: puede haber interrupciones, mantenimientos o errores. Podemos cambiar, limitar o dejar de ofrecer funciones. Cuando el cambio sea importante, lo avisaremos en el sitio con un plazo razonable.</p>`],
    ["Propiedad intelectual", `
      <p>El software, el diseño y la marca de ${P} son de su titular. Te damos una licencia limitada, no exclusiva e intransferible para usar el servicio según estos términos. Los contenidos de cada establecimiento (marca, logos, fotos, textos) son de ese establecimiento.</p>`],
    ["Limitación de responsabilidad", `
      <p>En la medida en que la ley peruana lo permita, ${P} no responde por daños indirectos ni por lucro cesante derivados de interrupciones del servicio, ni por el contenido, las promociones, los precios, los pedidos o las decisiones de cada establecimiento. Nada de esto limita la responsabilidad que la ley no permite limitar ni los derechos que te corresponden como consumidor.</p>`],
    ["Suspensión y cierre de cuentas", `
      <p>Puedes dejar de usar el servicio cuando quieras y pedir que tu cuenta se cancele. Podemos suspender o cerrar una cuenta que incumpla estos términos o ponga en riesgo la seguridad del servicio o de otras personas. Un establecimiento también puede desactivar la ficha de un cliente.</p>`],
    ["Datos personales", `
      <p>Cómo tratamos tus datos está en la <a href="privacidad">política de privacidad</a>, que forma parte de estos términos.</p>`],
    ["Cambios en estos términos", `
      <p>Podemos actualizar estos términos. La versión vigente es la que se publica aquí, con su fecha. Si el cambio es importante, lo avisaremos en el sitio. Seguir usando el servicio después del cambio significa que lo aceptas.</p>`],
    ["Ley aplicable y controversias", `
      <p>Estos términos se rigen por las leyes de la República del Perú. Ante cualquier desacuerdo, escríbenos primero para buscar una solución de buena fe. Si no se resuelve, se someterá a los jueces y tribunales de ${esc(cfg.jurisdiccion)}, sin perjuicio de los derechos que la ley te reconozca como consumidor ante las autoridades competentes.</p>`],
    ["Contacto", `<p>Para consultas sobre estos términos escribe a ${contacto(cfg)}.</p>`],
  ];
  return pagina({
    cfg,
    titulo: "Términos y condiciones",
    descripcion: `Condiciones de uso de ${cfg.plataforma}: cuentas, puntos y promociones, pedidos y responsabilidades.`,
    vigencia: VERSION_TERMINOS,
    secciones,
    otra: { href: "privacidad", texto: "Política de privacidad" },
    aviso: avisoConfiguracion(cfg),
  });
}
