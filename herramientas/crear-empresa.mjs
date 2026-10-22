// Herramienta del operador de la plataforma (Arquitectura.md, 5.20).
// Crea una empresa, su primer admin y una contraseña temporal que se muestra UNA sola vez.
//
// Uso (desde la raíz del gateway, con el .env que tiene MONGODB_URI y MONGODB_DB):
//   node --env-file=.env herramientas/crear-empresa.mjs \
//     --nombre "Café Central" --slug cafe-central --servicios tobt \
//     --admin-correo ana@cafecentral.com --admin-nombre "Ana Pérez" \
//     [--pais PE] [--moneda PEN] [--dry-run]
//
// --servicios acepta varios códigos separados por coma (tobt,siscore).
// --dry-run valida todo y no escribe nada.
//
// Si el correo ya tiene cuenta, se afilia a la empresa nueva como admin con su cuenta
// de siempre: no se toca su contraseña ni su nombre y no se genera contraseña temporal.
//
// Vive fuera de test/ a propósito: `node --test` ejecuta todo archivo de esa carpeta
// (5.9) y este script, sin argumentos, terminaría con error.

import { parseArgs } from "node:util";
import { randomInt } from "node:crypto";
import mongoose from "mongoose";
import { createCore, conEmpresa } from "core";

const USO = `Uso:
  node --env-file=.env herramientas/crear-empresa.mjs \\
    --nombre "Café Central" --slug cafe-central --servicios tobt \\
    --admin-correo ana@cafecentral.com --admin-nombre "Ana Pérez" \\
    [--pais PE] [--moneda PEN] [--dry-run]`;

function fallar(mensaje, { uso = false } = {}) {
  console.error(`\nError: ${mensaje}`);
  if (uso) console.error(`\n${USO}`);
  process.exit(1);
}

// 12 caracteres sin ambiguos (sin 0/O, 1/l/I), como la que genera core.empleados (5.14).
function generarPassword(largo = 12) {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let salida = "";
  for (let i = 0; i < largo; i++) salida += alfabeto[randomInt(alfabeto.length)];
  return salida;
}

// --- Argumentos -------------------------------------------------------------
let valores;
try {
  ({ values: valores } = parseArgs({
    options: {
      nombre: { type: "string" },
      slug: { type: "string" },
      servicios: { type: "string" },
      pais: { type: "string", default: "PE" },
      moneda: { type: "string", default: "PEN" },
      "admin-correo": { type: "string" },
      "admin-nombre": { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
    strict: true,
  }));
} catch (e) {
  fallar(e.message, { uso: true });
}

const nombre = valores.nombre?.trim();
const slug = valores.slug?.trim().toLowerCase();
const servicios = (valores.servicios ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const pais = valores.pais.trim().toUpperCase();
const moneda = valores.moneda.trim().toUpperCase();
const adminCorreo = valores["admin-correo"]?.trim().toLowerCase();
const adminNombre = valores["admin-nombre"]?.trim();
const simular = valores["dry-run"];

if (!nombre) fallar("falta --nombre.", { uso: true });
if (!slug) fallar("falta --slug.", { uso: true });
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
  fallar("--slug solo admite minúsculas, números y guiones (por ejemplo cafe-central), hasta 60 caracteres.");
}
if (servicios.length === 0) fallar("falta --servicios (por ejemplo tobt).", { uso: true });
if (servicios.some((s) => !/^[a-z][a-z0-9_]*$/.test(s))) {
  fallar("cada código de --servicios va en minúsculas, números y _ (por ejemplo tobt,siscore).");
}
if (!/^[A-Z]{2}$/.test(pais)) fallar("--pais debe ser un código ISO de 2 letras (PE, AR, ...).");
if (!/^[A-Z]{3}$/.test(moneda)) fallar("--moneda debe ser un código ISO 4217 de 3 letras (PEN, USD, ...).");
if (!adminCorreo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminCorreo)) {
  fallar("falta --admin-correo o no parece un correo.", { uso: true });
}
if (!adminNombre) fallar("falta --admin-nombre.", { uso: true });

const uri = process.env.MONGODB_URI;
if (!uri) fallar("falta MONGODB_URI. Ejecuta con --env-file=.env desde la raíz del gateway.");

// --- Conexión y núcleo (mismo patrón que src/db.js, 5.7) -----------------------
const connection = await mongoose
  .createConnection(uri, { dbName: process.env.MONGODB_DB || "mi-servidor" })
  .asPromise();

let codigoSalida = 0;

try {
  const core = createCore({ connection });
  const { Empresa, Usuario, Membresia } = core.modelos;

  // Los índices únicos (correo, membresía por empresa) tienen que existir antes de escribir.
  await core.auth.listo();

  // Validaciones previas: que no quede nada a medias por algo que se podía saber antes.
  const empresaExistente = await Empresa.findOne({ slug });
  if (empresaExistente) fallar(`ya existe una empresa con el slug «${slug}».`);

  const usuarioExistente = await Usuario.findOne({ correo: adminCorreo });
  if (usuarioExistente && usuarioExistente.estado && usuarioExistente.estado !== "activo") {
    fallar(`la cuenta ${adminCorreo} existe pero su estado es «${usuarioExistente.estado}».`);
  }

  console.log("\nSe va a crear:");
  console.log(`  Empresa:   ${nombre} (slug ${slug}), país ${pais}, moneda ${moneda}`);
  console.log(`  Servicios: ${servicios.join(", ")}`);
  console.log(
    usuarioExistente
      ? `  Admin:     ${adminCorreo} (cuenta ya existente: se afilia con su contraseña de siempre)`
      : `  Admin:     ${adminNombre} <${adminCorreo}> (cuenta nueva, contraseña temporal)`
  );

  if (simular) {
    console.log("\n--dry-run: no se escribió nada.");
  } else {
    // 1. Empresa (copia las plantillas de rol de sus servicios).
    const empresa = await core.empresas.crearEmpresa({ nombre, slug, servicios, pais, moneda });
    const empresaId = empresa._id;

    // 2. Primer admin.
    let usuarioId;
    let passwordTemporal = null;
    try {
      if (usuarioExistente) {
        usuarioId = usuarioExistente._id;
      } else {
        passwordTemporal = generarPassword();
        const usuario = await core.empresas.crearUsuario({
          correo: adminCorreo,
          password: passwordTemporal,
          nombre: adminNombre,
        });
        usuarioId = usuario._id;
        // Obliga a cambiarla en el primer ingreso (5.14); la pantalla de `cuenta` lo gestiona (5.19).
        await Usuario.updateOne({ _id: usuarioId }, { $set: { debeCambiarPassword: true } });
      }

      // 3. Membresía con rol admin.
      await core.empresas.agregarMiembro({ empresaId, usuarioId, rol: "admin" });
    } catch (e) {
      console.error(
        `\nLa empresa «${slug}» (id ${empresaId}) SÍ se creó, pero falló el alta del admin.` +
          `\nNo se borra nada automáticamente. Revisa el error y completa el alta a mano.`
      );
      throw e;
    }

    // 4. Comprobación de lo escrito, leyendo de vuelta.
    const verificada = await conEmpresa(empresaId, async () => {
      const m = await Membresia.findOne({ usuarioId, empresaId });
      const rol = m ? await core.modelos.Rol.findOne({ _id: m.rolId }) : null;
      return { membresia: m, rol };
    });
    const usuarioFinal = await Usuario.findOne({ _id: usuarioId });
    const empresaFinal = await Empresa.findOne({ _id: empresaId });

    if (!verificada.membresia?.activa || !(verificada.rol?.permisos ?? []).includes("*")) {
      throw new Error("La membresía del admin no quedó activa con un rol que tenga «*». Revisa la base de datos.");
    }
    if (passwordTemporal && usuarioFinal?.debeCambiarPassword !== true) {
      throw new Error("La cuenta nueva no quedó con debeCambiarPassword. Revisa la base de datos.");
    }

    console.log("\nListo.");
    console.log(`  Empresa id:  ${empresaId}`);
    console.log(`  Servicios:   ${JSON.stringify(empresaFinal?.servicios ?? servicios)}`);
    console.log(`  Admin id:    ${usuarioId} (rol ${verificada.rol.nombre})`);
    if (passwordTemporal) {
      console.log("\n  ┌─────────────────────────────────────────────────────────────┐");
      console.log(`  │ Contraseña temporal de ${adminCorreo}`);
      console.log(`  │ ${passwordTemporal}`);
      console.log("  │ Se muestra UNA sola vez y no se guarda en ningún archivo.   │");
      console.log("  │ Entrégala por un medio seguro. Debe cambiarla al entrar.     │");
      console.log("  └─────────────────────────────────────────────────────────────┘");
    } else {
      console.log("\n  La cuenta ya existía: entra con su contraseña de siempre y verá la empresa nueva al elegir empresa.");
    }
    console.log("\n  Siguiente: el admin crea su equipo desde /empleados (5.14).");
  }
} catch (e) {
  console.error(`\nFalló: ${e.codigo ? `[${e.codigo}] ` : ""}${e.message}`);
  codigoSalida = 1;
} finally {
  await connection.close();
}

process.exit(codigoSalida);