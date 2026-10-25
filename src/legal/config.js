// Datos del responsable que salen en los textos legales. Vienen de variables de entorno del gateway (no se
// escriben en el código): así cada despliegue pone sus propios datos sin tocar los textos.
//   NOMBRE_PLATAFORMA   nombre con que se presenta el servicio (por defecto «Mi-Servidor»)
//   LEGAL_RESPONSABLE   nombre de la persona o razón social que presta el servicio
//   LEGAL_DOCUMENTO     RUC o DNI del responsable (opcional)
//   LEGAL_CORREO        correo de contacto para consultas y para ejercer derechos sobre datos personales
//   LEGAL_JURISDICCION  ciudad cuyos tribunales resuelven controversias (por defecto «Lima»)

// Fecha de la versión vigente de cada texto. Hay que cambiarla cada vez que cambie el contenido de la página.
export const VERSION_TERMINOS = "2026-10-25";
export const VERSION_PRIVACIDAD = "2026-10-25";

const CORREO = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,200}\.[^\s@<>"']{2,}$/;
const limpio = (v, max) => {
  const t = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return t ? t.slice(0, max) : "";
};

/** Lee y limpia la configuración legal. `faltantes` lista lo imprescindible que no se configuró. */
export function leerConfigLegal(env = process.env) {
  const correo = limpio(env.LEGAL_CORREO, 254);
  const cfg = {
    plataforma: limpio(env.NOMBRE_PLATAFORMA, 60) || "Mi-Servidor",
    responsable: limpio(env.LEGAL_RESPONSABLE, 120),
    documento: limpio(env.LEGAL_DOCUMENTO, 40),
    correo: CORREO.test(correo) ? correo : "",
    jurisdiccion: limpio(env.LEGAL_JURISDICCION, 60) || "Lima",
  };
  cfg.faltantes = [];
  if (!cfg.responsable) cfg.faltantes.push("LEGAL_RESPONSABLE");
  if (!cfg.correo) cfg.faltantes.push("LEGAL_CORREO");
  return cfg;
}
