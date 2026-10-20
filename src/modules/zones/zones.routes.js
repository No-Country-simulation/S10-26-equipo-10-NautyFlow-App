// ─────────────────────────────────────────────────────────────────────────────
// src/modules/zones/zones.routes.js — Conecta URLs con funciones del controller.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { listZones } from './zones.controller.js';

const router = Router();

// Cuando llegue GET a "/" (relativo a donde se monte este router) → ejecuta listZones.
router.get('/', listZones);

export default router;
