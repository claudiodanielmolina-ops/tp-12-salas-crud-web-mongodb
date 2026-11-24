// src/controladores/reservas.js
const mongoose = require("mongoose");

const ESTADOS_VALIDOS = ["pendiente", "confirmada"];

function crearControladorReservas(servicioReservas) {
  // ==========================================
  // MÓDULO WEB (HTML)
  // ==========================================

  async function listar(req, res, next) {
    try {
      const reservas = await servicioReservas.listar();
      res.render("reservas/lista", {
        titulo: "Reservas de turnos",
        reservas,
      });
    } catch (error) {
      next(error);
    }
  }

  function mostrarFormulario(req, res) {
    res.render("reservas/nueva", {
      titulo: "Nueva reserva",
      error: null,
      valores: {},
    });
  }

  async function mostrarDetalle(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReservas.obtenerPorId(id);

      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe esa reserva.",
        });
      }

      res.render("reservas/detalle", {
        titulo: reserva.estudiante,
        reserva,
      });
    } catch (error) {
      next(error);
    }
  }

  async function mostrarFormularioEdicion(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReservas.obtenerPorId(id);

      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe la reserva solicitada para editar.",
        });
      }

      res.render("reservas/editar", {
        titulo: "Editar reserva",
        id: reserva._id.toString(),
        error: null,
        valores: {
          estudiante: reserva.estudiante,
          email: reserva.email,
          sala: reserva.sala,
          fecha: reserva.fecha,
          turno: reserva.turno,
          personas: reserva.personas,
          estado: reserva.estado,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async function crear(req, res, next) {
    try {
      if (req.errorValidacion) {
        return res.status(400).render("reservas/nueva", {
          titulo: "Nueva reserva",
          error: req.errorValidacion,
          valores: req.valoresInvalidos,
        });
      }

      await servicioReservas.crear(req.reservaValidada);
      res.redirect("/reservas");
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).render("reservas/nueva", {
          titulo: "Nueva reserva",
          error: error.message,
          valores: req.body,
        });
      }
      next(error);
    }
  }

  async function editar(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const valoresRecibidos = {
        estudiante: req.body?.estudiante ?? "",
        email: req.body?.email ?? "",
        sala: req.body?.sala ?? "",
        fecha: req.body?.fecha ?? "",
        turno: req.body?.turno ?? "",
        personas: req.body?.personas ?? "",
        estado: req.body?.estado ?? "",
      };

      // Guardar contexto de edición en res.locals antes de invocar el servicio unificado
      res.locals.contextoEdicion = {
        id,
        valores: valoresRecibidos,
      };

      const reservaActualizada = await servicioReservas.actualizarTotal(
        id,
        req.body,
        { personasComoTexto: true },
      );

      if (!reservaActualizada) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe la reserva que intenta actualizar.",
        });
      }

      res.redirect(303, `/reservas/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // TP 12 - PASO 1: CAMBIO PARCIAL DE ESTADO (WEB)
  // ==========================================

  async function mostrarFormularioEstado(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReservas.obtenerPorId(id);

      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe la reserva solicitada.",
        });
      }

      res.render("reservas/estado", {
        titulo: "Cambiar estado de reserva",
        id: reserva._id.toString(),
        reserva,
        estadoSeleccionado: reserva.estado,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async function cambiarEstado(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reservaActual = await servicioReservas.obtenerPorId(id);

      if (!reservaActual) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe la reserva que intenta actualizar.",
        });
      }

      const estadoCrudo = req.body?.estado;
      const estadoTexto = typeof estadoCrudo === "string" ? estadoCrudo : "";

      // Guardar contexto en res.locals para que cualquier ValidationError vuelva a estado.ejs
      res.locals.contextoEstado = {
        id,
        reserva: reservaActual,
        estadoSeleccionado: estadoTexto,
      };

      if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
      ) {
        return res.status(400).render("reservas/estado", {
          titulo: "Cambiar estado de reserva",
          id,
          reserva: reservaActual,
          estadoSeleccionado: estadoTexto,
          error: "Cuerpo de solicitud ausente o inválido.",
        });
      }

      const llaves = Object.keys(req.body);

      if (llaves.length !== 1 || llaves[0] !== "estado") {
        return res.status(400).render("reservas/estado", {
          titulo: "Cambiar estado de reserva",
          id,
          reserva: reservaActual,
          estadoSeleccionado: estadoTexto,
          error: "El formulario solo admite exactamente el campo 'estado'.",
        });
      }

      if (Array.isArray(estadoCrudo) || typeof estadoCrudo !== "string") {
        return res.status(400).render("reservas/estado", {
          titulo: "Cambiar estado de reserva",
          id,
          reserva: reservaActual,
          estadoSeleccionado: "",
          error:
            "El campo 'estado' debe enviarse una única vez como valor textual.",
        });
      }

      const estadoLimpio = estadoCrudo.trim();

      if (!ESTADOS_VALIDOS.includes(estadoLimpio)) {
        return res.status(400).render("reservas/estado", {
          titulo: "Cambiar estado de reserva",
          id,
          reserva: reservaActual,
          estadoSeleccionado: estadoLimpio,
          error: "El estado debe ser 'pendiente' o 'confirmada'.",
        });
      }

      // Construir cambios únicamente con estado y delegar a actualizarParcial
      const reservaActualizada = await servicioReservas.actualizarParcial(id, {
        estado: estadoLimpio,
      });

      if (!reservaActualizada) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "La reserva dejó de existir antes de guardar el cambio.",
        });
      }

      res.redirect(303, `/reservas/${id}`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // TP 12 - PASO 2: ELIMINACIÓN CON CONFIRMACIÓN (WEB)
  // ==========================================

  async function mostrarFormularioEliminar(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const reserva = await servicioReservas.obtenerPorId(id);

      if (!reserva) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "No existe la reserva solicitada para eliminar.",
        });
      }

      res.render("reservas/eliminar", {
        titulo: "Eliminar reserva",
        id: reserva._id.toString(),
        reserva,
        error: null,
      });
    } catch (error) {
      next(error);
    }
  }

  async function eliminarWeb(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).render("no-encontrado", {
          codigoError: 400,
          titulo: "ID inválido",
          mensaje: "El identificador proporcionado no tiene un formato válido.",
        });
      }

      const llaves =
        req.body && typeof req.body === "object" && !Array.isArray(req.body)
          ? Object.keys(req.body)
          : [];

      const confirmacionValida =
        llaves.length === 1 &&
        llaves[0] === "confirmar" &&
        typeof req.body.confirmar === "string" &&
        req.body.confirmar === "si";

      if (!confirmacionValida) {
        const reservaActual = await servicioReservas.obtenerPorId(id);

        if (!reservaActual) {
          return res.status(404).render("no-encontrado", {
            codigoError: 404,
            titulo: "Reserva no encontrada",
            mensaje: "No existe la reserva solicitada.",
          });
        }

        return res.status(400).render("reservas/eliminar", {
          titulo: "Eliminar reserva",
          id,
          reserva: reservaActual,
          error:
            "Debe confirmar la eliminación enviando únicamente 'confirmar=si'.",
        });
      }

      const reservaEliminada = await servicioReservas.eliminar(id);

      if (!reservaEliminada) {
        return res.status(404).render("no-encontrado", {
          codigoError: 404,
          titulo: "Reserva no encontrada",
          mensaje: "La reserva no existe o ya fue eliminada previamente.",
        });
      }

      // Redirigir 303 al listado general, nunca al detalle eliminado
      res.redirect(303, "/reservas");
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // MÓDULO API JSON (REST)
  // ==========================================

  async function actualizarTotalApi(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID mal formado." });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res
          .status(400)
          .json({ error: "Cuerpo de solicitud ausente o malformado." });
      }

      const reservaActualizada = await servicioReservas.actualizarTotal(
        id,
        req.body,
        { personasComoTexto: false },
      );

      if (!reservaActualizada) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }

      res.status(200).json({
        id: reservaActualizada._id.toString(),
        estudiante: reservaActualizada.estudiante,
        email: reservaActualizada.email,
        sala: reservaActualizada.sala,
        fecha: reservaActualizada.fecha,
        turno: reservaActualizada.turno,
        personas: reservaActualizada.personas,
        estado: reservaActualizada.estado,
      });
    } catch (error) {
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async function actualizarParcialApi(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID mal formado." });
      }

      if (!req.body || Object.keys(req.body).length === 0) {
        return res
          .status(400)
          .json({ error: "Cuerpo de solicitud ausente o malformado." });
      }

      const reservaActualizada = await servicioReservas.actualizarParcial(
        id,
        req.body,
      );

      if (!reservaActualizada) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }

      res.status(200).json({
        id: reservaActualizada._id.toString(),
        estudiante: reservaActualizada.estudiante,
        email: reservaActualizada.email,
        sala: reservaActualizada.sala,
        fecha: reservaActualizada.fecha,
        turno: reservaActualizada.turno,
        personas: reservaActualizada.personas,
        estado: reservaActualizada.estado,
      });
    } catch (error) {
      if (error.name === "ValidationError" || error.name === "CastError") {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  async function eliminarApi(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID mal formado." });
      }

      const reservaEliminada = await servicioReservas.eliminar(id);

      if (!reservaEliminada) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }

      res.status(204).send();
    } catch (error) {
      if (error.name === "CastError") {
        return res.status(400).json({ error: "ID mal formado." });
      }
      next(error);
    }
  }

  async function listarApi(req, res, next) {
    try {
      const ordenesPermitidos = ["estudiante", "personas-asc", "personas-desc"];

      const queryKeys = Object.keys(req.query);
      const permitidas = ["sala", "orden", "pagina", "limite"];

      for (const key of queryKeys) {
        if (!permitidas.includes(key)) {
          return res
            .status(400)
            .json({ error: `Parámetro de consulta no válido: ${key}` });
        }
        if (Array.isArray(req.query[key])) {
          return res
            .status(400)
            .json({ error: `El parámetro '${key}' no puede repetirse.` });
        }
      }

      let sala = undefined;
      if (req.query.sala !== undefined) {
        if (typeof req.query.sala !== "string" || !req.query.sala.trim()) {
          return res
            .status(400)
            .json({ error: "El parámetro 'sala' debe ser un texto no vacío." });
        }
        sala = req.query.sala.trim();
      }

      let orden = "estudiante";
      if (req.query.orden !== undefined) {
        if (
          typeof req.query.orden !== "string" ||
          !ordenesPermitidos.includes(req.query.orden.trim())
        ) {
          return res.status(400).json({
            error: "Criterio de ordenamiento inválido o desconocido.",
          });
        }
        orden = req.query.orden.trim();
      }

      let pagina = 1;
      if (req.query.pagina !== undefined) {
        const rawPagina = req.query.pagina;
        if (typeof rawPagina !== "string" || !rawPagina.trim()) {
          return res.status(400).json({
            error: "El parámetro 'pagina' debe ser un texto numérico.",
          });
        }
        const numPagina = Number(rawPagina);
        if (!Number.isInteger(numPagina) || numPagina < 1 || numPagina > 1000) {
          return res.status(400).json({
            error: "El parámetro 'pagina' debe ser un entero entre 1 y 1000.",
          });
        }
        pagina = numPagina;
      }

      let limite = 2;
      if (req.query.limite !== undefined) {
        const rawLimite = req.query.limite;
        if (typeof rawLimite !== "string" || !rawLimite.trim()) {
          return res.status(400).json({
            error: "El parámetro 'limite' debe ser un texto numérico.",
          });
        }
        const numLimite = Number(rawLimite);
        if (!Number.isInteger(numLimite) || numLimite < 1 || numLimite > 20) {
          return res.status(400).json({
            error: "El parámetro 'limite' debe ser un entero entre 1 y 20.",
          });
        }
        limite = numLimite;
      }

      const resultado = await servicioReservas.consultar({
        sala,
        orden,
        pagina,
        limite,
      });

      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async function obtenerPorIdApi(req, res, next) {
    try {
      const id = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "ID mal formado." });
      }

      const reserva = await servicioReservas.obtenerPorId(id);

      if (!reserva) {
        return res.status(404).json({ error: "Recurso no encontrado." });
      }

      res.status(200).json({
        id: reserva._id.toString(),
        estudiante: reserva.estudiante,
        email: reserva.email,
        sala: reserva.sala,
        fecha: reserva.fecha,
        turno: reserva.turno,
        personas: reserva.personas,
        estado: reserva.estado,
      });
    } catch (error) {
      next(error);
    }
  }

  async function crearApi(req, res, next) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res
          .status(400)
          .json({ error: "Cuerpo de solicitud ausente o malformado." });
      }

      const reservaGuardada = await servicioReservas.crear(req.body);
      const recursoId = reservaGuardada._id.toString();

      res.setHeader("Location", `/api/reservas/${recursoId}`);
      res.status(201).json({
        id: recursoId,
        estudiante: reservaGuardada.estudiante,
        email: reservaGuardada.email,
        sala: reservaGuardada.sala,
        fecha: reservaGuardada.fecha,
        turno: reservaGuardada.turno,
        personas: reservaGuardada.personas,
        estado: reservaGuardada.estado,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  return {
    listar,
    mostrarFormulario,
    mostrarDetalle,
    mostrarFormularioEdicion,
    crear,
    editar,
    mostrarFormularioEstado,
    cambiarEstado,
    mostrarFormularioEliminar,
    eliminarWeb,
    listarApi,
    obtenerPorIdApi,
    crearApi,
    actualizarTotalApi,
    actualizarParcialApi,
    eliminarApi,
  };
}

module.exports = crearControladorReservas;
