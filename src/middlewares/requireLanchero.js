// ─────────────────────────────────────────────────────────────────────────────
// src/middlewares/requireLanchero.js — Carga el PERFIL de lanchero de quien pidió.
//
// Un usuario (users) y su perfil de conductor (lancheros) son tablas distintas.
// Las rutas del portal necesitan el perfil: de ahí sale el lancheroId con el que
// filtramos TODO lo que se lee o se modifica. Así nadie toca lanchas ajenas.
// ─────────────────────────────────────────────────────────────────────────────

import { Lanchero } from '../models/index.js';
import { forbidden } from '../utils/AppError.js';

// Va DESPUÉS de requireAuth (necesita req.user).
export async function requireLanchero(req, _res, next) {
  // findOne = SELECT ... LIMIT 1. Buscamos el perfil cuyo user_id es el del usuario logueado.
  const lanchero = await Lanchero.findOne({ where: { userId: req.user.id } });

  // Un usuario LANCHERO siempre tiene perfil (se crea junto con la cuenta), pero
  // verificamos por si los datos quedaron inconsistentes.
  if (!lanchero) throw forbidden('Tu usuario no tiene perfil de lanchero');

  req.lanchero = lanchero; // lo dejamos disponible para el controller
  next();
}
