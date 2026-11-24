// src/rutas/api-reservas.js
const express = require("express");

function crearRouterApiReservas(controladorReservas) {
  const router = express.Router();

  router.get("/", controladorReservas.listarApi);
  router.get("/:id", controladorReservas.obtenerPorIdApi);
  router.post("/", controladorReservas.crearApi);
  router.put("/:id", controladorReservas.actualizarTotalApi); // <--- Ruta PUT
  router.patch("/:id", controladorReservas.actualizarParcialApi); // <--- PATCH
  router.delete("/:id", controladorReservas.eliminarApi); // <--- DELETE

  return router;
}

module.exports = crearRouterApiReservas;
