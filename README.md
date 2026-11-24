# TP 12 — Cambio parcial y eliminación de reservas (Node.js, Express, EJS y MongoDB Atlas)

Este proyecto es la continuación del TP 11 (`tp-12-salas-crud-web-mongodb`) y forma parte de mi recorrido aprendiendo desarrollo back-end con **Node.js**, **Express**, **EJS** y **MongoDB Atlas**.

En este práctico sumé dos acciones nuevas para las reservas de salas desde la web y ajusté una mejora que me señalaron en la corrección anterior:
- **Cambiar solo el estado desde la web** (`GET` y `POST /reservas/:id/estado`), reutilizando el método `actualizarParcial` del servicio.
- **Eliminar una reserva previa confirmación desde la web** (`GET` y `POST /reservas/:id/eliminar`), reutilizando el método `eliminar` del servicio.
- **Unificar la validación de reemplazo completo antes de castear con el modelo** (`validarReemplazoCompleto`), para que tanto `PUT /api/reservas/:id` como `POST /reservas/:id/editar` revisen bien los tipos de datos antes de llegar a Mongoose.



## 1. Preparación del entorno y conexión

Para trabajar en este TP copié la base del TP 11 (sin `.git`, `node_modules` ni `.env`) y configuré la nueva base de datos en Atlas:

- **Base de datos:** `reservas_salas_u12` (colección `reservas`).
- **Variables de entorno:** completé `.env.example` con marcadores y usé mi archivo `.env` local (que queda fuera de Git en `.gitignore`) con la URI apuntando a `reservas_salas_u12`:


PORT=3000
NODE_ENV=development
MONGODB_USERNAME=tu_usuario_atlas
MONGODB_PASSWORD=tu_password_atlas
MONGODB_URI=mongodb+srv://tu_usuario_atlas:tu_password_atlas@tu-cluster.mongodb.net/reservas_salas_u12?retryWrites=true&w=majority&appName=Cluster0


Antes de arrancar el servidor, corrí estos comandos para comprobar que todo estuviera bien:


npm ci
npm run check
node --env-file=.env scripts/comprobar-conexion.js
node --env-file=.env src/index.js




## 2. Campos admitidos y reglas que fui validando

Estos son los campos de una reserva y las reglas que aplica la aplicación para evitar datos inválidos:

| Campo | Tipo | Qué valida la aplicación |
| :--- | :--- | :--- |
| `estudiante` | `String` | No puede ir vacío (`trim`). |
| `email` | `String` | Obligatorio y con `@`. |
| `sala` | `String` | Solo acepta `Sala Norte`, `Sala Sur` o `Sala Multimedia`. |
| `fecha` | `String` | Obligatoria con formato `AAAA-MM-DD`. |
| `turno` | `String` | Solo acepta `Mañana`, `Tarde` o `Noche`. |
| `personas` | `Number` | Número entero entre `1` y `6` (en JSON debe llegar como `number` y en formularios web como texto numérico). |
| `estado` | `String` | Solo `pendiente` (por defecto al crear) o `confirmada`. |



## 3. Diferencia entre los POST web y los PATCH / DELETE de la API

Una de las cosas clave que trabajé en este TP es entender que las rutas web y la API comparten la misma lógica en `src/servicios/reservas.js` (sin llamar a la API por HTTP ni poner consultas de MongoDB dentro de los controladores), pero cada una responde según su canal:

| Aspecto | Formularios Web (`POST /estado` y `POST /eliminar`) | API REST (`PATCH` y `DELETE /api/reservas/:id`) |
| :--- | :--- | :--- |
| **Cómo llegan los datos** | `application/x-www-form-urlencoded` desde el formulario o Postman. | `application/json` en `PATCH`; sin cuerpo en `DELETE`. |
| **Qué se puede cambiar parcialmente** | **Solo** `estado` (`pendiente` o `confirmada`). Si viene `personas`, campos extra o repetidos, lo rechaza. | `personas` (`1` a `6`) y/o `estado` (`pendiente` o `confirmada`), al menos uno. |
| **Confirmación al borrar** | Primero entra a `GET /reservas/:id/eliminar` (solo lectura) y en el `POST` exige únicamente `confirmar=si`. | Borra directamente sobre el `:id` indicado. |
| **Si sale bien** | Responde **`303 See Other`** con `Location: /reservas/:id` (al cambiar estado) o `Location: /reservas` (al eliminar). | Responde **`200 OK`** con el JSON actualizado en `PATCH`, o **`204 No Content`** sin cuerpo en `DELETE`. |
| **Si hay error de entrada** | Responde **`400 Bad Request`** mostrando la vista HTML con el mensaje de error, el ID y los valores conservados (`res.locals`). | Responde **`400 Bad Request`** con JSON `{ "error": "..." }`. |
| **Si no existe el ID** | Responde **`404 Not Found`** en HTML sin recrear ningún documento. | Responde **`404 Not Found`** con JSON `{ "error": "Recurso no encontrado." }`. |



## 4. Rutas que implementé y respuestas

### Rutas Web (vistas EJS)
- `GET /` — Inicio.
- `GET /reservas` — Listado de reservas con botones para **Estado**, **Editar**, **Eliminar** y **Ver detalle**.
- `GET /reservas/nueva` y `POST /reservas` — Crear una reserva nueva.
- `GET /reservas/:id` — Ver el detalle de una reserva.
- `GET /reservas/:id/editar` y `POST /reservas/:id/editar` — Edición completa de los 7 campos (`303` al detalle si va bien, `400` HTML si hay error).
- `GET /reservas/:id/estado` — Muestra los datos actuales y un `select` con el estado actual, más un enlace **Cancelar** que vuelve sin guardar.
- `POST /reservas/:id/estado` — Valida que llegue solo `estado` válido, llama a `actualizarParcial` y redirige con `303` a `/reservas/:id` (o devuelve `400` HTML si falla).
- `GET /reservas/:id/eliminar` — Muestra los datos clave y advierte que el borrado es permanente, con **Cancelar** como enlace de lectura.
- `POST /reservas/:id/eliminar` — Exige únicamente `confirmar=si`, llama a `eliminar` y redirige con `303` a `/reservas` (o devuelve `400` / `404` HTML según corresponda).

### Rutas API (JSON)
- `GET /estado` — Revisa que el servicio anda y cuenta cuántas reservas hay en la base.
- `GET /api/reservas` — Lista reservas con filtros, orden y paginación.
- `GET /api/reservas/:id` — Devuelve una reserva en JSON.
- `POST /api/reservas` — Crea una reserva por API (`201` y cabecera `Location`).
- `PUT /api/reservas/:id` — Reemplazo completo con validación previa unificada (`200`, `400` o `404`).
- `PATCH /api/reservas/:id` — Cambio parcial de `personas` y/o `estado` (`200`, `400` o `404`).
- `DELETE /api/reservas/:id` — Elimina por ID (`204` sin cuerpo, `400` o `404`).



## 5. Cómo repetí las pruebas y lo que obtuve

### Registros que creé desde el formulario web (`/reservas/nueva`)
1. **Ana Ejemplo** (`ID_ANA`: `6b04df75b7f3c1611d284f32`) — `ana@example.com`, `Sala Norte`, `2026-11-11`, `Mañana`, `2` personas, estado inicial `pendiente`.
2. **Bruno Ejemplo** (`ID_BRUNO`: `6b04dfafb7f3c1611d284f33`) — `bruno@example.com`, `Sala Sur`, `2026-11-11`, `Tarde`, `3` personas, estado inicial `pendiente` (lo usé para probar la eliminación web).
3. **Carlos Descartable** (`ID_DESCARTABLE`: `6b04dfe2b7f3c1611d284f34`) — `carlos@example.com`, `Sala Multimedia`, `2026-11-12`, `Noche`, `1` persona, estado inicial `pendiente` (lo usé para probar `DELETE` en la API).

Para ver los `303 See Other` en Postman desactivé **Automatically follow redirects** en *Settings* y revisé la pestaña *Headers* de la respuesta para mirar `Location`.

### Evidencias anotadas durante las pruebas

#### 1. Cambio parcial por API (`PATCH /api/reservas/6b04df75b7f3c1611d284f32`)
- **Antes del cambio (`GET /api/reservas/6b04df75b7f3c1611d284f32` → `200 OK`):**
  ```json
  {
    "id": "6b04df75b7f3c1611d284f32",
    "estudiante": "Ana Ejemplo",
    "email": "ana@example.com",
    "sala": "Sala Norte",
    "fecha": "2026-11-11",
    "turno": "Mañana",
    "personas": 2,
    "estado": "pendiente"
  }
  ```
- **Con `{"estado": "confirmada"}` (`PATCH` → `200 OK`):**
  ```json
  {
    "id": "6b04df75b7f3c1611d284f32",
    "estudiante": "Ana Ejemplo",
    "email": "ana@example.com",
    "sala": "Sala Norte",
    "fecha": "2026-11-11",
    "turno": "Mañana",
    "personas": 2,
    "estado": "confirmada"
  }
  
  El `id` y los otros 6 campos quedaron exactamente igual.
- **Casos inválidos en `PATCH`:** enviar `{}` o `{"estado": "inventado"}` devolvió **`400 Bad Request`** en JSON, y al consultar con `GET` comprobé que los datos no cambiaron.

#### 2. Cambio parcial desde la web (`POST /reservas/6b04df75b7f3c1611d284f32/estado`)
- **Envío válido (`estado=pendiente` en `x-www-form-urlencoded`):** devolvió **`303 See Other`** con cabecera **`Location: /reservas/6b04df75b7f3c1611d284f32`**.
- **Casos inválidos en el formulario (`400 Bad Request` HTML sobre `Cambiar estado de reserva · Reservas`):**
  - `estado=inventado` → `400 Bad Request` HTML con explicación.
  - `estado` vacío o cuerpo sin filas → `400 Bad Request` HTML sin tocar el registro.
  - `estado=confirmada` junto con `personas=5` (campo extra) → `400 Bad Request` HTML.
  - `estado=confirmada` repetido en dos filas → `400 Bad Request` HTML.
- **Dejando a Ana en `confirmada` (`estado=confirmada`):** devolvió **`303 See Other`** con **`Location: /reservas/6b04df75b7f3c1611d284f32`**.
- **Cancelar:** al entrar a `/reservas/6b04df75b7f3c1611d284f32/estado` y hacer clic en **Cancelar**, volvió al detalle sin guardar cambios.

#### 3. Confirmación, cancelación y eliminación de Bruno (`6b04dfafb7f3c1611d284f33`)
- **Entrar a la pantalla de confirmación (`GET /reservas/6b04dfafb7f3c1611d284f33/eliminar`):** devolvió **`200 OK` HTML** (`Eliminar reserva · Reservas`) y el `GET /api/reservas/6b04dfafb7f3c1611d284f33` siguió en **`200 OK`** (hacer `GET` o tocar **Cancelar** y recargar no borra nada).
- **Intentos inválidos en `POST /reservas/6b04dfafb7f3c1611d284f33/eliminar`:** sin filas, con `confirmar=no` o con `confirmar` repetido (`no` y `si`) devolvieron **`400 Bad Request` HTML** y el documento siguió existiendo.
- **Eliminación confirmada (`confirmar=si`):** devolvió **`303 See Other`** con cabecera **`Location: /reservas`**.
- **Después de borrar:** `GET /api/reservas/6b04dfafb7f3c1611d284f33` devolvió **`404 Not Found`**, y repetir el `POST` de eliminación también devolvió **`404 Not Found` HTML** sin recrearlo.

#### 4. Eliminación por API de Carlos (`6b04dfe2b7f3c1611d284f34`)
- `DELETE /api/reservas/6b04dfe2b7f3c1611d284f34` → **`204 No Content`** sin cuerpo.
- Repetir `DELETE /api/reservas/6b04dfe2b7f3c1611d284f34` → **`404 Not Found`**.

#### 5. Qué pasó después de reiniciar el servidor (`Ctrl + C` y volver a levantar)
- `GET /api/reservas/6b04df75b7f3c1611d284f32` (Ana) → **`200 OK`**, persistiendo `"estado": "confirmada"` y sus 6 campos originales intactos.
- `GET /api/reservas/6b04dfafb7f3c1611d284f33` (Bruno) → **`404 Not Found`**.
- `GET /api/reservas/6b04dfe2b7f3c1611d284f34` (Carlos) → **`404 Not Found`**.
- También comprobé que crear reservas, listarlas y hacer edición completa de 7 campos sigue funcionando sin problemas.