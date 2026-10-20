// ─────────────────────────────────────────────────────────────────────────────
// src/routes/index.js — Router principal de la API (/api/v1/...).
// Acá se irán sumando los módulos sprint a sprint (auth, boats, trips...).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import zonesRoutes from '../modules/zones/zones.routes.js';
import authRoutes from '../modules/auth/auth.routes.js';
import adminRoutes from '../modules/admin/admin.routes.js';
import boatsRoutes from '../modules/boats/boats.routes.js';

const router = Router();

// router.use('/prefijo', otroRouter): todo lo que empiece con /zones va a zonesRoutes.
// Como este router se monta en /api/v1, la URL final es /api/v1/zones.
router.use('/zones', zonesRoutes);
router.use('/auth', authRoutes);   // /api/v1/auth/register, /login, /logout, /me
router.use('/admin', adminRoutes); // /api/v1/admin/...  (protegido: solo ADMIN)
router.use('/me/boats', boatsRoutes); // /api/v1/me/boats/...  (portal del lanchero: solo SUS lanchas)

export default router;
