// Cargar dotenv al inicio absoluto para que lea el archivo .env
require("dotenv").config();
const mongoose = require("mongoose");
const { leerConfiguracion } = require("./config/entorno");
// 1. Importar la función correctamente desestructurada del módulo central
const { conectarBaseDatos } = require("./config/base-datos");
const crearServicioReservas = require("./servicios/reservas");
const crearApp = require("./app");

async function main() {
  // 1. Leer la configuración del entorno (puerto, etc.)
  const config = leerConfiguracion();
  const puerto = config.puerto;
  const formatoRegistro = config.formatoRegistro;

  // 2. Conectar a MongoDB utilizando el módulo centralizado ANTES de abrir el puerto HTTP
  console.log("Conectando a MongoDB Atlas...");
  await conectarBaseDatos(); // No necesita pasar parámetro porque lee la URI internamente
  console.log("¡Conexión exitosa a MongoDB Atlas!");

  // 3. Instanciar el servicio asíncrono de reservas
  const servicioReservas = crearServicioReservas();

  // 4. Crear la aplicación Express
  const app = crearApp({ servicioReservas, formatoRegistro });

  // 5. Iniciar la escucha del servidor
  const servidor = app.listen(puerto, () => {
    console.log(`Aplicación disponible en http://localhost:${puerto}`);
  });

  // 6. Cierre ordenado (Graceful Shutdown) ante SIGINT y SIGTERM
  const cerrarServidor = async (senal) => {
    console.log(
      `\nRecibida señal ${senal}. Cerrando servidor HTTP y desconectando de MongoDB...`,
    );
    servidor.close(async () => {
      try {
        await mongoose.connection.close();
        console.log("Conexión a MongoDB cerrada correctamente.");
        process.exit(0);
      } catch (err) {
        console.error("Error al cerrar la conexión a MongoDB:", err);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => cerrarServidor("SIGINT"));
  process.on("SIGTERM", () => cerrarServidor("SIGTERM"));
}

// Punto de entrada seguro con manejo de errores de arranque
main().catch((error) => {
  console.error("No se pudo iniciar la aplicación:", error.message);
  process.exitCode = 1;
});
