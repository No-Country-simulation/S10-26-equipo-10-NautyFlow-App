// ─────────────────────────────────────────────────────────────────────────────
// src/modules/zones/zones.controller.js — Lógica del endpoint de zonas.
//
// Un CONTROLLER recibe la petición (req), usa los modelos y arma la respuesta (res).
// ─────────────────────────────────────────────────────────────────────────────

import { Zone } from '../../models/index.js';

// GET /api/v1/zones → lista las zonas activas ordenadas (para los desplegables del front).
export async function listZones(_req, res) {
  // findAll = SELECT. Opciones:
  //  where: filtro (WHERE is_active = true)
  //  order: [['campo','ASC']] = ORDER BY sort_order ASC
  //  attributes: solo devolvemos las columnas necesarias (no exponemos de más)
  const zones = await Zone.findAll({
    where: { isActive: true },
    order: [['sortOrder', 'ASC']],
    attributes: ['id', 'name', 'slug'],
  });

  // Respondemos con un objeto { data: [...] }. Envolver en "data" deja espacio
  // para agregar más campos después (paginación, etc.) sin romper el frontend.
  res.json({ data: zones });
}
