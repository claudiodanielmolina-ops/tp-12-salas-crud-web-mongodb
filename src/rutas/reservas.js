// src/rutas/reservas.js
const express = require("express");
const { prepararReserva, validarReserva } = require("../middleware/reservas");

function crearRouterReservas(controladorReservas) {
  const router = express.Router();

  // Middleware de área para /reservas (vistas web)
  router.use(prepararReserva);

  router.get("/", controladorReservas.listar);
  router.get("/nueva", controladorReservas.mostrarFormulario);
  router.get("/:id/editar", controladorReservas.mostrarFormularioEdicion);
  router.get("/:id/estado", controladorReservas.mostrarFormularioEstado);
  router.get("/:id/eliminar", controladorReservas.mostrarFormularioEliminar);
  router.get("/:id", controladorReservas.mostrarDetalle);

  router.post("/", validarReserva, controladorReservas.crear);
  router.post("/:id/editar", controladorReservas.editar);
  router.post("/:id/estado", controladorReservas.cambiarEstado);
  router.post("/:id/eliminar", controladorReservas.eliminarWeb);

  return router;
}

module.exports = crearRouterReservas;
