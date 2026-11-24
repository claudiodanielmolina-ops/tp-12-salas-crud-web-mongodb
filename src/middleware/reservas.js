// src/middleware/reservas.js

/**
 * Middleware de Router: Asigna la sección para el subgrupo /reservas
 */
function prepararReserva(req, res, next) {
  res.locals.seccion = "Reservas de salas";
  next();
}

const salasPermitidas = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const turnosPermitidos = ["Mañana", "Tarde", "Noche"];

/**
 * Middleware de Validación con control estricto de tipos y enums
 */
function validarReserva(req, res, next) {
  const body = req.body || {};

  if (
    typeof body.estudiante !== "string" ||
    typeof body.email !== "string" ||
    typeof body.sala !== "string" ||
    typeof body.fecha !== "string" ||
    typeof body.turno !== "string"
  ) {
    req.errorValidacion = "Tipos de datos incorrectos en los campos de texto.";
    req.valoresInvalidos = body;
    return next();
  }

  const estudiante = body.estudiante.trim();
  const email = body.email.trim();
  const sala = body.sala.trim();
  const fecha = body.fecha.trim();
  const turno = body.turno.trim();

  const rawPersonas = body.personas;
  if (
    typeof rawPersonas === "boolean" ||
    Array.isArray(rawPersonas) ||
    typeof rawPersonas === "object" ||
    rawPersonas === null ||
    rawPersonas === ""
  ) {
    req.errorValidacion = "El campo personas debe ser un número válido.";
    req.valoresInvalidos = body;
    return next();
  }

  const personas = Number(rawPersonas);

  if (
    !estudiante ||
    !email ||
    !email.includes("@") ||
    !salasPermitidas.includes(sala) ||
    !fecha ||
    !turnosPermitidos.includes(turno) ||
    !Number.isInteger(personas) ||
    personas < 1 ||
    personas > 6
  ) {
    req.errorValidacion = "Completá todos los campos con valores válidos.";
    req.valoresInvalidos = body;
    return next();
  }

  req.reservaValidada = { estudiante, email, sala, fecha, turno, personas };
  next();
}

module.exports = { prepararReserva, validarReserva };
