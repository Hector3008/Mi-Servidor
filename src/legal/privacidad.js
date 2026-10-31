import { VERSION_PRIVACIDAD } from "./config.js";
import { avisoConfiguracion, contacto, esc, pagina, responsable } from "./plantilla.js";

/**
 * Política de privacidad. Describe lo que el sistema hace de verdad (ver core: cuentas de cliente, entrar con Google,
 * sesiones y anonimización); si cambia el comportamiento, hay que cambiar este texto y su fecha (config.js).
 */
export function paginaPrivacidad(cfg) {
  const P = esc(cfg.plataforma);
  const secciones = [
    ["Quién es responsable de tus datos", `
      <p>Esta política aplica a ${P}, un servicio prestado por ${responsable(cfg)}. Explica qué datos personales se tratan, para qué y qué derechos tienes, conforme a la Ley N.º 29733, Ley de Protección de Datos Personales, y su Reglamento (Decreto Supremo N.º 016-2024-JUS).</p>
      <p>Hay dos papeles distintos:</p>
      <ul>
        <li><strong>El establecimiento</strong> (el bar, la cafetería o la tienda donde creas tu cuenta) decide para qué usa los datos de sus clientes: reconocerte, darte puntos, aplicarte promociones. Es quien responde por ese uso.</li>
        <li><strong>${P}</strong> aporta la tecnología: guarda y procesa esos datos por encargo del establecimiento y no los usa para fines propios. Para las cuentas del personal y de los administradores, ${P} decide el tratamiento (acceso y seguridad del servicio).</li>
      </ul>
      <p>Para cualquier consulta sobre tus datos escribe a ${contacto(cfg)}.</p>`],
    ["Qué datos tratamos y para qué", `
      <p><strong>Si eres cliente:</strong></p>
      <ul>
        <li><em>Datos de tu ficha:</em> nombre, correo y/o teléfono. Si el establecimiento los registra, también otros datos de contacto o preferencias.</li>
        <li><em>Datos de acceso:</em> tu contraseña, que se guarda transformada de forma irreversible (nunca en texto legible, ni siquiera podemos verla). Si entras con Google no hay contraseña (ver la sección sobre Google).</li>
        <li><em>Tus consumos en ese establecimiento:</em> pedidos asociados a tu ficha, puntos acumulados y sus movimientos, logros, vales y, si usas un código de invitación, quién te invitó o a quién invitaste.</li>
        <li><em>Tus reseñas:</em> las estrellas y el comentario que dejes sobre un plato que pagaste. Son <strong>públicas</strong>: cualquier persona que abra la carta las ve con tu primer nombre y la inicial de tu apellido. Si las borras, dejan de mostrarse; si cancelas tu cuenta, tu nombre en ellas pasa a «Anónimo».</li>
        <li><em>Tu aceptación del programa de puntos:</em> si la diste o la retiraste, cuándo y por qué medio.</li>
        <li><em>Pedidos con entrega (delivery):</em> la dirección y los datos de entrega que se registren en ese pedido.</li>
      </ul>
      <p><strong>Finalidades:</strong> crear y mantener tu cuenta; reconocerte en el local y asociar tus consumos a ti; acumular y canjear puntos, vales y beneficios cuando aceptas participar; aplicarte promociones; responder tus consultas; y mantener la seguridad del servicio. No usamos tus datos para publicidad de terceros ni los vendemos.</p>
      <p><strong>Si eres personal o administrador de un establecimiento:</strong> tu nombre, correo, contraseña (transformada de forma irreversible), PIN si usas una tablet del local, rol y permisos, y el registro de las acciones que haces en el sistema (por ejemplo, quién abrió, cobró o anuló un pedido). Sirven para autenticarte, limitar lo que puedes hacer y dejar trazabilidad.</p>
      <p><strong>Datos técnicos:</strong> al iniciar sesión guardamos tu dirección IP, el tipo de navegador o dispositivo y la fecha de último uso de la sesión, para seguridad (por ejemplo, detectar abusos) y para mantener tu sesión.</p>
      <p><strong>Lo que no recogemos:</strong> no te pedimos datos de tarjeta ni procesamos pagos, no recogemos tu ubicación, no usamos cookies de publicidad ni herramientas de analítica de terceros.</p>`],
    ["Entrar con Google", `
      <p>Si eliges «Iniciar sesión con Google», Google nos entrega solo tu identidad básica: un identificador de tu cuenta de Google, tu correo (verificado por Google) y tu nombre. No accedemos a tus contactos, correos, archivos, calendario ni a ningún otro dato de tu cuenta de Google.</p>
      <ul>
        <li>Los usamos únicamente para iniciar tu sesión y para crear tu ficha de cliente o vincularte a la que ya existe con ese mismo correo en ese establecimiento (así conservas tus puntos).</li>
        <li><em>Si eres personal o administrador</em> y usas el botón del inicio de sesión de la cuenta del personal: solo te deja entrar si ya existe una cuenta tuya con ese correo (no crea cuentas nuevas). La primera vez guardamos el identificador de tu cuenta de Google para reconocerla después, y entrar así no te pide cambiar la contraseña temporal.</li>
        <li>No los usamos para publicidad ni los compartimos con terceros, salvo lo descrito en la sección «Con quién se comparten».</li>
        <li>Al mostrar el botón, tu navegador carga un script de Google (accounts.google.com) y el inicio de sesión ocurre en los servidores de Google, que tratan los datos según su propia política de privacidad.</li>
        <li>Puedes retirar el permiso en cualquier momento desde la configuración de tu cuenta de Google (apartado de seguridad y conexiones con terceros). Si tu cuenta solo entra con Google, puedes pedirnos que te ayudemos a acceder de otra forma o a cancelarla.</li>
      </ul>`],
    ["Con quién se comparten", `
      <ul>
        <li><strong>Cualquier visitante de la carta:</strong> tus reseñas, con tu primer nombre y la inicial de tu apellido (nunca tu correo ni tu teléfono).</li>
        <li><strong>El establecimiento donde tienes tu cuenta:</strong> su personal autorizado ve tu ficha (nombre, datos de contacto, puntos y consumos), porque es quien te atiende. Un establecimiento no ve los datos de los clientes de otro.</li>
        <li><strong>Proveedores que alojan el servicio</strong> (nube y base de datos): procesan los datos solo para que el servicio funcione, bajo medidas de seguridad. Sus servidores pueden estar fuera del Perú.</li>
        <li><strong>Google</strong>, en el momento de iniciar sesión con tu cuenta de Google.</li>
        <li><strong>Autoridades</strong>, cuando una norma o una orden válida lo exija.</li>
      </ul>
      <p>No vendemos ni alquilamos tus datos.</p>`],
    ["Cookies y almacenamiento del navegador", `
      <p>Usamos solo lo necesario para mantener tu sesión; no hay cookies de publicidad ni de analítica.</p>
      <ul>
        <li><strong>Sesión de cliente</strong> (una cookie por establecimiento): te mantiene dentro de tu cuenta. Caduca tras 7 días sin usarla y, en todo caso, a los 30 días.</li>
        <li><strong>Sesión del personal</strong> (cookie «sid»): se cierra tras un periodo sin uso. Las tablets del local pueden llevar además una cookie que identifica el dispositivo para entrar con PIN.</li>
        <li>Estas cookies no son accesibles desde el código de la página y, en producción, viajan solo por conexión segura (HTTPS).</li>
        <li>El panel de la cuenta guarda en tu navegador, mientras dura la pestaña, una marca para no repetir un paso de bienvenida.</li>
        <li>Si usas Google, Google puede colocar sus propias cookies al mostrar el botón.</li>
      </ul>
      <p>Puedes borrar las cookies desde tu navegador; tendrás que volver a iniciar sesión.</p>`],
    ["Cuánto tiempo guardamos los datos", `
      <ul>
        <li><strong>Sesiones:</strong> se eliminan automáticamente cuando caducan.</li>
        <li><strong>Tu ficha de cliente:</strong> mientras mantengas tu cuenta o el establecimiento la mantenga activa, y hasta que pidas su cancelación.</li>
        <li><strong>Cancelación:</strong> al cancelar, la ficha se anonimiza: se borran tu nombre, correo, teléfono y demás datos de contacto, se retira tu consentimiento y tu cuenta deja de funcionar. Algunos registros históricos (pedidos y recibos ya emitidos) pueden conservar una copia del nombre o teléfono con que se emitieron, porque el establecimiento los necesita para su contabilidad y control.</li>
        <li><strong>Cuentas del personal:</strong> mientras la persona trabaje con el establecimiento y después, solo lo necesario para la trazabilidad de lo que hizo.</li>
      </ul>`],
    ["Tus derechos", `
      <p>Como titular de tus datos tienes derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> saber qué datos tuyos tratamos y cómo.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos. Tu nombre lo puedes cambiar tú mismo desde tu cuenta.</li>
        <li><strong>Cancelación:</strong> pedir que se eliminen o anonimicen tus datos cuando ya no sean necesarios.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento por motivos legítimos.</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado.</li>
        <li><strong>Revocar tu consentimiento</strong> en cualquier momento. Por ejemplo, puedes retirar tu aceptación al programa de puntos desde tu cuenta, sin perder el acceso a la carta.</li>
      </ul>
      <p>Para ejercerlos escribe a ${contacto(cfg)} o pídelo en el establecimiento; te responderemos dentro de los plazos que fija la ley. Si crees que no atendimos bien tu solicitud, puedes presentar un reclamo ante la Autoridad Nacional de Protección de Datos Personales (Ministerio de Justicia y Derechos Humanos).</p>
      <p>No tomamos decisiones sobre ti basadas únicamente en tratamiento automatizado que produzcan efectos jurídicos o te afecten de forma significativa.</p>`],
    ["Seguridad", `
      <p>Protegemos tus datos con medidas como: contraseñas guardadas de forma irreversible, sesiones que no se pueden leer desde el código de la página, comunicación cifrada (HTTPS), separación de los datos de cada establecimiento, acceso del personal según permisos y límites a los intentos repetidos de entrar. Ninguna medida es infalible: si notas algo raro, escríbenos.</p>`],
    ["Menores de edad", `
      <p>El servicio no está dirigido a menores. Si eres menor de edad, crea una cuenta solo con la autorización de tu madre, padre o tutor. Si detectamos datos de un menor sin esa autorización, los eliminaremos.</p>`],
    ["Cambios en esta política", `
      <p>Podemos actualizar esta política. La versión vigente es la publicada aquí, con su fecha. Si el cambio es importante (por ejemplo, un nuevo uso de tus datos), lo avisaremos en el sitio y, cuando la ley lo exija, pediremos de nuevo tu consentimiento.</p>`],
    ["Contacto", `<p>Consultas, solicitudes sobre tus datos o reclamos: ${contacto(cfg)}.</p>`],
  ];
  return pagina({
    cfg,
    titulo: "Política de privacidad",
    descripcion: `Cómo ${cfg.plataforma} trata tus datos personales: qué datos, para qué, con quién se comparten y tus derechos.`,
    vigencia: VERSION_PRIVACIDAD,
    secciones,
    otra: { href: "terminos", texto: "Términos y condiciones" },
    aviso: avisoConfiguracion(cfg),
  });
}
