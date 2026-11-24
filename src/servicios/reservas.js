// src/servicios/reservas.js
const Reserva = require("../modelos/reserva");

const CAMPOS_EDICION = [
  "estudiante",
  "email",
  "sala",
  "fecha",
  "turno",
  "personas",
  "estado",
];

const SALAS_VALIDAS = ["Sala Norte", "Sala Sur", "Sala Multimedia"];
const TURNOS_VALIDOS = ["Mañana", "Tarde", "Noche"];
const ESTADOS_VALIDOS = ["pendiente", "confirmada"];

/**
 * Función auxiliar para validar estrictamente el campo 'personas'.
 * Rechaza booleanos, arrays, objetos, strings vacíos y exige un entero entre 1 y 6.
 * @param {any} valor - El valor recibido para personas.
 * @returns {boolean} True si es válido, false en caso contrario.
 */
function esPersonaValida(valor) {
  if (
    typeof valor === "boolean" ||
    Array.isArray(valor) ||
    (typeof valor === "object" && valor !== null) ||
    (typeof valor === "string" && !valor.trim())
  ) {
    return false;
  }
  const numero = Number(valor);
  if (
    !Number.isFinite(numero) ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 6
  ) {
    return false;
  }
  return true;
}

/**
 * Validación unificada previa al casteo del modelo para reemplazo completo (PUT y web /editar).
 * Garantiza que los 6 campos textuales sean strings puros y 'personas' respete el tipo del canal.
 * @param {Object} datos - Cuerpo recibido desde JSON (PUT) o formulario web (POST /editar).
 * @param {Object} [opciones={}] - Opciones de canal.
 * @param {boolean} [opciones.personasComoTexto=false] - True para formularios HTML, false para JSON.
 * @returns {Object} Objeto normalizado listo para findOneAndReplace.
 */
function validarReemplazoCompleto(datos, { personasComoTexto = false } = {}) {
  const crearError = (mensaje) => {
    const error = new Error(mensaje);
    error.name = "ValidationError";
    return error;
  };

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    throw crearError("Datos de solicitud ausentes o malformados.");
  }

  const llaves = Object.keys(datos);

  for (const llave of llaves) {
    if (llave.startsWith("$") || llave === "_id" || llave === "id") {
      throw crearError(`El campo '${llave}' no está permitido en el cuerpo.`);
    }
    if (!CAMPOS_EDICION.includes(llave)) {
      throw crearError(`Campo adicional no permitido: '${llave}'.`);
    }
  }

  if (
    llaves.length !== CAMPOS_EDICION.length ||
    !CAMPOS_EDICION.every((campo) =>
      Object.prototype.hasOwnProperty.call(datos, campo),
    )
  ) {
    throw crearError(
      "Se exigen exactamente los 7 campos editables (estudiante, email, sala, fecha, turno, personas, estado).",
    );
  }

  const camposTextuales = [
    "estudiante",
    "email",
    "sala",
    "fecha",
    "turno",
    "estado",
  ];
  for (const campo of camposTextuales) {
    if (typeof datos[campo] !== "string") {
      throw crearError(
        `El campo '${campo}' debe ser una cadena de texto válida.`,
      );
    }
  }

  const estudiante = datos.estudiante.trim();
  const email = datos.email.trim();
  const sala = datos.sala.trim();
  const fecha = datos.fecha.trim();
  const turno = datos.turno.trim();
  const estado = datos.estado.trim();

  if (!estudiante) {
    throw crearError("El nombre del estudiante es obligatorio.");
  }

  if (!email || !email.includes("@")) {
    throw crearError("Debe ingresar un correo electrónico válido con '@'.");
  }

  if (!SALAS_VALIDAS.includes(sala)) {
    throw crearError(
      "La sala seleccionada debe ser Sala Norte, Sala Sur o Sala Multimedia.",
    );
  }

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw crearError(
      "La fecha es obligatoria y debe tener formato AAAA-MM-DD.",
    );
  }

  if (!TURNOS_VALIDOS.includes(turno)) {
    throw crearError("El turno seleccionado debe ser Mañana, Tarde o Noche.");
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw crearError("El estado debe ser 'pendiente' o 'confirmada'.");
  }

  let personas;
  if (personasComoTexto) {
    if (typeof datos.personas !== "string" || !datos.personas.trim()) {
      throw crearError("La cantidad de personas es obligatoria.");
    }
    personas = Number(datos.personas.trim());
  } else {
    if (typeof datos.personas !== "number") {
      throw crearError(
        "El campo 'personas' debe ser un número entero en la API JSON.",
      );
    }
    personas = datos.personas;
  }

  if (!esPersonaValida(personas)) {
    throw crearError(
      "La cantidad de personas debe ser un número entero entre 1 y 6.",
    );
  }

  return {
    estudiante,
    email,
    sala,
    fecha,
    turno,
    personas,
    estado,
  };
}

/**
 * Fábrica del servicio de reservas que encapsula la lógica de negocio y persistencia con Mongoose.
 * @returns {Object} Objeto con los métodos del servicio.
 */
function crearServicioReservas() {
  async function listar(filtro = {}) {
    return await Reserva.find(filtro);
  }

  async function consultar({
    sala,
    orden = "estudiante",
    pagina = 1,
    limite = 2,
  } = {}) {
    const filtro = {};

    if (sala) {
      filtro.sala = sala.trim();
    }

    let sortCriteria = { estudiante: 1, _id: 1 };
    if (orden === "personas-asc") {
      sortCriteria = { personas: 1, _id: 1 };
    } else if (orden === "personas-desc") {
      sortCriteria = { personas: -1, _id: 1 };
    }

    const salto = (pagina - 1) * limite;
    const total = await Reserva.countDocuments(filtro);

    const documentos = await Reserva.find(filtro)
      .select("estudiante email sala fecha turno personas estado")
      .sort(sortCriteria)
      .skip(salto)
      .limit(limite)
      .lean();

    const datos = documentos.map((doc) => ({
      id: doc._id.toString(),
      estudiante: doc.estudiante,
      email: doc.email,
      sala: doc.sala,
      fecha: doc.fecha,
      turno: doc.turno,
      personas: doc.personas,
      estado: doc.estado,
    }));

    const paginas = limite > 0 ? Math.ceil(total / limite) : 0;

    return {
      datos,
      pagina,
      limite,
      total,
      paginas,
    };
  }

  async function obtenerPorId(id) {
    return await Reserva.findById(id);
  }

  async function crear(datosValidados) {
    if (!esPersonaValida(datosValidados.personas)) {
      const error = new Error(
        "El campo 'personas' es inválido. Debe ser un número entero entre 1 y 6.",
      );
      error.name = "ValidationError";
      throw error;
    }

    const nuevaReserva = new Reserva({
      estudiante: datosValidados.estudiante,
      email: datosValidados.email,
      sala: datosValidados.sala,
      fecha: datosValidados.fecha,
      turno: datosValidados.turno,
      personas: datosValidados.personas,
      estado: "pendiente",
    });

    return await nuevaReserva.save();
  }

  /**
   * Realiza un reemplazo completo (PUT y formulario web /editar) de una reserva existente.
   * Ejecuta la validación unificada de tipos textuales antes de delegar a Mongoose.
   * @param {string} id - ID de la reserva a reemplazar.
   * @param {Object} datos - Objeto con los 7 campos obligatorios.
   * @param {Object} [opciones={}] - Opciones de canal ({ personasComoTexto }).
   * @returns {Promise<Object|null>} El documento actualizado o null si no existe.
   */
  async function actualizarTotal(id, datos, opciones = {}) {
    const datosNormalizados = validarReemplazoCompleto(datos, opciones);

    return await Reserva.findOneAndReplace({ _id: id }, datosNormalizados, {
      new: true,
      runValidators: true,
      upsert: false,
    });
  }

  /**
   * Realiza una actualización parcial (PATCH API y formulario web /estado).
   * @param {string} id - ID de la reserva a actualizar.
   * @param {Object} datos - Objeto con personas y/o estado.
   * @returns {Promise<Object|null>} El documento actualizado o null si no existe.
   */
  async function actualizarParcial(id, datos) {
    const camposPermitidos = ["personas", "estado"];
    const llaves = Object.keys(datos);

    if (
      llaves.length === 0 ||
      !llaves.every((campo) => camposPermitidos.includes(campo))
    ) {
      const error = new Error(
        "PATCH solo admite los campos 'personas' y/o 'estado', y al menos uno debe estar presente.",
      );
      error.name = "ValidationError";
      throw error;
    }

    const actualizacion = {};

    if (datos.personas !== undefined) {
      if (
        typeof datos.personas !== "number" ||
        !esPersonaValida(datos.personas)
      ) {
        const error = new Error("El campo 'personas' es inválido en PATCH.");
        error.name = "ValidationError";
        throw error;
      }
      actualizacion.personas = datos.personas;
    }

    if (datos.estado !== undefined) {
      if (
        typeof datos.estado !== "string" ||
        !ESTADOS_VALIDOS.includes(datos.estado)
      ) {
        const error = new Error(
          "El campo 'estado' debe ser 'pendiente' o 'confirmada'.",
        );
        error.name = "ValidationError";
        throw error;
      }
      actualizacion.estado = datos.estado;
    }

    return await Reserva.findOneAndUpdate(
      { _id: id },
      { $set: actualizacion },
      { new: true, runValidators: true, upsert: false },
    );
  }

  /**
   * Realiza la eliminación física de una reserva por su ID (DELETE API y web /eliminar).
   * @param {string} id - ID de la reserva a eliminar.
   * @returns {Promise<Object|null>} El documento eliminado o null.
   */
  async function eliminar(id) {
    return await Reserva.findByIdAndDelete(id);
  }

  async function contar() {
    return await Reserva.countDocuments();
  }

  return {
    listar,
    consultar,
    obtenerPorId,
    crear,
    actualizarTotal,
    actualizarParcial,
    eliminar,
    contar,
  };
}

module.exports = crearServicioReservas;
