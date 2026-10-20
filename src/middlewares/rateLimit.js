// ─────────────────────────────────────────────────────────────────────────────
// src/middlewares/rateLimit.js — Limita cuántos pedidos puede hacer una misma IP.
//
// Es una defensa por IP, y complementa el bloqueo por CUENTA del login (5 fallos → 15 min).
// Frena la fuerza bruta distribuida entre muchos emails y el spam de registros.
// ─────────────────────────────────────────────────────────────────────────────

import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

// Para register y login: 20 pedidos cada 15 minutos por IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,    // duración de la ventana en milisegundos (15 min)
  limit: 20,                   // pedidos permitidos por IP dentro de esa ventana
  standardHeaders: 'draft-8',  // informa al cliente cuánto le queda (cabeceras RateLimit-*)
  legacyHeaders: false,        // no usamos las cabeceras viejas X-RateLimit-*
  // En los tests hacemos muchos pedidos seguidos desde la misma IP: lo desactivamos ahí.
  skip: () => env.NODE_ENV === 'test',
  // Mismo formato de error que el resto de la API (lo que espera el frontend).
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos. Probá de nuevo más tarde.' },
  },
});
