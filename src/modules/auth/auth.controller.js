// ─────────────────────────────────────────────────────────────────────────────
// src/modules/auth/auth.controller.js — La capa HTTP de auth.
//
// Cada función: toma datos ya validados (req.valid.body), llama al service,
// pone/borra la cookie de sesión y arma la respuesta JSON.
// ─────────────────────────────────────────────────────────────────────────────

import { Lanchero } from '../../models/index.js';
import { registerLanchero, loginUser, publicUser } from './auth.service.js';
import { setSessionCookie, clearSessionCookie } from './session.js';

// POST /api/v1/auth/register
export async function register(req, res) {
  const { user, lanchero } = await registerLanchero(req.valid.body);
  setSessionCookie(res, user); // lo dejamos logueado de una vez: menos fricción
  // 201 = "Created" (se creó un recurso nuevo).
  res.status(201).json({
    data: { user: publicUser(user), lanchero: { id: lanchero.id, fullName: lanchero.fullName, phone: lanchero.phone } },
  });
}

// POST /api/v1/auth/login
export async function login(req, res) {
  const user = await loginUser(req.valid.body);
  setSessionCookie(res, user);
  res.json({ data: { user: publicUser(user) } });
}

// POST /api/v1/auth/logout
export function logout(_req, res) {
  clearSessionCookie(res);
  res.status(204).end(); // 204 = "No Content": salió bien y no hay nada que devolver
}

// GET /api/v1/auth/me — "¿quién soy?". El frontend lo llama al abrir la app para saber
// si hay sesión y qué pantallas mostrar. req.user lo dejó requireAuth.
export async function me(req, res) {
  // Si es lanchero, adjuntamos su perfil (el admin no tiene).
  const lanchero = await Lanchero.findOne({
    where: { userId: req.user.id },
    attributes: ['id', 'fullName', 'phone'],
  });
  res.json({ data: { user: publicUser(req.user), lanchero } });
}
