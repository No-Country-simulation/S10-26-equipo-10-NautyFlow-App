// ─────────────────────────────────────────────────────────────────────────────
// src/middlewares/auth.js — Los "porteros" de la API.
//
// AUTENTICACIÓN = ¿quién sos?       →  requireAuth
// AUTORIZACIÓN  = ¿qué podés hacer? →  requireRole
//
// Se usan como pasos previos de una ruta:
//   router.get('/algo', requireAuth, requireRole('ADMIN'), controller)
// ─────────────────────────────────────────────────────────────────────────────

import { User } from '../models/index.js';
import { COOKIE_NAME, verifySession } from '../modules/auth/session.js';
import { unauthorized, forbidden } from '../utils/AppError.js';

// Exige una sesión válida. Si la hay, deja al usuario en `req.user` para los pasos siguientes.
export async function requireAuth(req, _res, next) {
  // cookie-parser (instalado en app.js) arma req.cookies como objeto { nombre: valor }.
  // El "?." (encadenamiento opcional) evita un error si req.cookies no existiera.
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw unauthorized(); // no mandó cookie → no inició sesión

  let payload;
  try {
    payload = verifySession(token); // comprueba la firma y el vencimiento
  } catch {
    // Firma falsa, token alterado o vencido: todos son lo mismo para nosotros.
    throw unauthorized('Sesión inválida o vencida');
  }

  // Volvemos a leer al usuario de la BASE en cada pedido (en vez de fiarnos solo del token).
  // Costo: una consulta barata por pedido. Beneficio: si el admin desactiva una cuenta o
  // cambia un rol, el efecto es INMEDIATO, sin esperar a que venza el token.
  const user = await User.findByPk(payload.sub);
  if (!user || !user.isActive) throw unauthorized('Sesión inválida');

  req.user = user; // lo dejamos disponible para los controllers
  next();
}

// Fábrica: requireRole('ADMIN') o requireRole('ADMIN', 'LANCHERO').
// `...roles` junta todos los argumentos en una lista.
// IMPORTANTE: va DESPUÉS de requireAuth (necesita req.user).
export const requireRole = (...roles) => (req, _res, next) => {
  // Usamos el rol que viene de la BASE (req.user), no el del token.
  if (!req.user || !roles.includes(req.user.role)) throw forbidden();
  next();
};
