// ─────────────────────────────────────────────────────────────────────────────
// src/utils/AppError.js — Un error "esperado" con código HTTP y código legible.
//
// Idea: cuando algo sale mal por culpa del usuario (no encontrado, sin permiso,
// datos inválidos) lanzamos un AppError. El manejador de errores central
// (middlewares/errorHandler.js) lo convierte en una respuesta JSON prolija.
// Los errores que NO son AppError se consideran fallas nuestras (500).
// ─────────────────────────────────────────────────────────────────────────────

// "class X extends Error" crea un tipo de error propio que hereda todo lo de Error.
export class AppError extends Error {
  // El constructor se ejecuta al hacer `new AppError(...)`.
  // status: código HTTP (404, 400...). code: palabra clave para el frontend. details: info extra.
  constructor(status, code, message, details) {
    super(message);        // Llama al constructor de Error para guardar el mensaje.
    this.name = 'AppError'; // Nombre del tipo, útil al depurar.
    this.status = status;   // Guardamos el código HTTP en el objeto.
    this.code = code;       // Ej: 'NOT_FOUND'.
    this.details = details; // Opcional: por ejemplo los campos inválidos de un formulario.
  }
}

// Funciones "atajo" para los casos más comunes. Se usan así: throw notFound('Lancha');
// Una función flecha: (parámetros) => resultado.
export const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'No autenticado') => new AppError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Sin permiso') => new AppError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Recurso') => new AppError(404, 'NOT_FOUND', `${what} no encontrado`);
export const conflict = (message) => new AppError(409, 'CONFLICT', message);
