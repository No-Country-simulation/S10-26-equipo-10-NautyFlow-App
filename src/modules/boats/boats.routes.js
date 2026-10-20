// ─────────────────────────────────────────────────────────────────────────────
// src/modules/boats/boats.routes.js — URLs del portal del lanchero (/api/v1/me/boats).
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { requireLanchero } from '../../middlewares/requireLanchero.js';
import { validate } from '../../middlewares/validate.js';
import { boatIdParams, boatSchema, zonesSchema, availabilitySchema, activeSchema } from './boats.schemas.js';
import * as c from './boats.controller.js'; // "c" de controller, para escribir menos

const router = Router();

// Los tres porteros, UNA sola vez para todo el archivo:
//   1) ¿hay sesión?  2) ¿es LANCHERO (no admin)?  3) cargar su perfil.
router.use(requireAuth, requireRole('LANCHERO'), requireLanchero);

// Cada ruta: [validar params] → [validar body] → controller. Si algo no pasa, se corta.
router.get('/', c.list);
router.post('/', validate(boatSchema), c.create);

router.get('/:id', validate(boatIdParams, 'params'), c.get);
router.put('/:id', validate(boatIdParams, 'params'), validate(boatSchema), c.update);

router.put('/:id/zones', validate(boatIdParams, 'params'), validate(zonesSchema), c.setZones);
router.put('/:id/availability', validate(boatIdParams, 'params'), validate(availabilitySchema), c.setAvailability);
router.patch('/:id/active', validate(boatIdParams, 'params'), validate(activeSchema), c.setActive);

export default router;
