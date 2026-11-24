// scripts/crear-reserva.js

/* const conectarBaseDatos = require("../src/config/base-datos"); */

require("dotenv").config();

const {
  conectarBaseDatos,
  desconectarBaseDatos,
} = require("../src/config/base-datos");

const Reserva = require("../src/modelos/reserva");

async function main() {
  try {
    await conectarBaseDatos();
    console.log("=== Ejecutando prueba de inserción y validación ===");

    const nuevaReservaData = {
      estudiante: "Laura Benítez",
      email: "laura.benitez@example.com",
      sala: "Sala Multimedia",
      fecha: "2026-11-12",
      turno: "Tarde",
      personas: 3,
    };

    const nuevaReserva = new Reserva(nuevaReservaData);
    const reservaGuardada = await nuevaReserva.save();

    console.log(`Éxito: Documento guardado con ID: ${reservaGuardada._id}`);
  } catch (error) {
    if (error.name === "ValidationError") {
      console.error("Rechazo por validación del esquema de Mongoose:");
      Object.keys(error.errors).forEach((campo) => {
        console.error(`   - Campo '${campo}': ${error.errors[campo].message}`);
      });
    } else {
      console.error(
        "Error operativo o de conexión con la base de datos:",
        error.message,
      );
    }
    process.exitCode = 1;
  } finally {
    await desconectarBaseDatos(); // <--- Usamos la función centralizada que ya importamos
    console.log("Conexión con MongoDB cerrada de forma limpia.");
  }
}

main();
