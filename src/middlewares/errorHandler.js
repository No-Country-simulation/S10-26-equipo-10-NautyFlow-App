// ─────────────────────────────────────────────────────────────────────────────
// src/middlewares/errorHandler.js — Dos middlewares finales: 404 y errores.
//
// ¿Qué es un middleware? Una función que Express ejecuta EN CADENA para cada
// petición: (req, res, next). Puede responder, o llamar next() para pasar al
// siguiente. Piensa en una línea de montaje: seguridad → JSON → rutas → errores.
// ─────────────────────────────────────────────────────────────────────────────

import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

// Se ejecuta si NINGUNA ruta respondió: la URL no existe.
// El guion bajo en `_req` es convención: "este parámetro existe pero no lo uso".
export function notFound(_req, res) {
  // res.status(404) fija el código HTTP; .json() envía el cuerpo en formato JSON.
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

// Express reconoce un manejador de errores porque tiene EXACTAMENTE 4 parámetros.
// Se ejecuta cuando alguien lanza un error (throw) o falla una promesa async
// (en Express 5 los errores de funciones async llegan acá automáticamente).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // 1) Error nuestro, esperado: lo mostramos tal cual.
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 2) Error de validación de Zod (datos mal enviados por el cliente): es un 400.
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        // issues = lista de problemas; los resumimos como { campo, mensaje }.
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }

  // 3) JSON mal formado en el body: body-parser marca este error con type 'entity.parse.failed'.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'JSON inválido' } });
  }

  // 4) Cualquier otra cosa es un bug nuestro: lo registramos y respondemos 500.
  // En test no ensuciamos la consola.
  if (env.NODE_ENV !== 'test') console.error(err);

  // NUNCA devolvemos el detalle interno al cliente en producción (podría filtrar secretos).
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
    },
  });
}
