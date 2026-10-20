// ─────────────────────────────────────────────────────────────────────────────
// src/modules/admin/admin.routes.js — Zona SOLO para administradores.
//
// Con UN router.use() protegemos TODAS las rutas de este archivo: lo que agreguemos
// debajo (verificación, viajes...) ya nace protegido y no podemos olvidarnos del guardia.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';

const router = Router();

// Primero ¿hay sesión?, después ¿es ADMIN? El orden importa.
router.use(requireAuth, requireRole('ADMIN'));

// Ruta de prueba para comprobar la protección. La reemplazaremos por rutas reales (Día 6+).
router.get('/ping', (req, res) => {
  res.json({ data: { message: 'Hola admin', email: req.user.email } });
});

export default router;
