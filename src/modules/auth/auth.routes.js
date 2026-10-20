// ─────────────────────────────────────────────────────────────────────────────
// src/modules/auth/auth.routes.js — URLs de autenticación.
// Cada ruta es una CADENA: limitador → validación → (guardia) → controller.
// Express las ejecuta en orden; si una falla, las siguientes no corren.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { requireAuth } from '../../middlewares/auth.js';
import { authLimiter } from '../../middlewares/rateLimit.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import { register, login, logout, me } from './auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);                  // no necesita sesión: borrar una cookie inexistente es inofensivo
router.get('/me', requireAuth, me);              // acá sí: sin sesión no hay "yo"

export default router;
