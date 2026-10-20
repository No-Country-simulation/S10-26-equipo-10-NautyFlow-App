// ─────────────────────────────────────────────────────────────────────────────
// src/modules/auth/session.js — Cómo se crea, guarda y lee la SESIÓN.
//
// ¿Qué es una sesión? Después de iniciar sesión, el servidor le entrega al navegador
// un "pase" (token). El navegador lo envía en cada pedido y así el servidor sabe quién
// es sin pedir la contraseña otra vez.
//
// Nuestro pase es un JWT (JSON Web Token): un texto con 3 partes
//   cabecera.contenido.firma
// El contenido dice quién es (id y rol) y cuándo vence. La FIRMA se calcula con
// JWT_SECRET: si alguien modifica el contenido, la firma deja de coincidir y lo rechazamos.
// OJO: el contenido NO está cifrado (cualquiera puede leerlo), por eso nunca va nada secreto.
//
// ¿Dónde guardamos el pase? En una COOKIE "httpOnly": JavaScript del navegador no puede
// leerla, así un ataque XSS no puede robarla. (Por eso NO usamos localStorage.)
// ─────────────────────────────────────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

// Nombre de la cookie. Prefijo "nf_" (NautiFlow) para no chocar con otras cookies.
export const COOKIE_NAME = 'nf_session';

// Las cookies miden el tiempo en milisegundos: horas × 60 min × 60 s × 1000 ms.
const MAX_AGE_MS = env.SESSION_HOURS * 60 * 60 * 1000;

// Opciones de seguridad de la cookie:
const cookieOptions = {
  httpOnly: true,                            // JavaScript del navegador NO puede leerla
  // En producción solo viaja por HTTPS. Con SameSite 'none' los navegadores TAMBIÉN lo exigen.
  secure: env.NODE_ENV === 'production' || env.COOKIE_SAMESITE === 'none',
  // SameSite: no se envía en pedidos que vienen de OTROS sitios (nos protege de CSRF: que
  // otra web te haga actuar). Por defecto 'lax'. Si el frontend y la API quedan en dominios
  // distintos al desplegar, se configura COOKIE_SAMESITE=none en las variables de Render.
  sameSite: env.COOKIE_SAMESITE,
  path: '/',                                 // vale para todas las rutas
};

// Crea el JWT. Recibe el usuario y devuelve el texto firmado.
export function signSession(user) {
  return jwt.sign(
    { role: user.role },        // contenido extra ("claims"): el rol
    env.JWT_SECRET,             // la clave con la que se firma
    {
      algorithm: 'HS256',       // algoritmo de firma (HMAC con SHA-256)
      subject: user.id,         // "sub": a quién pertenece el token
      expiresIn: `${env.SESSION_HOURS}h`, // "exp": se vuelve inválido solo
    },
  );
}

// Verifica firma y vencimiento. Si algo está mal LANZA un error (lo atrapa quien llama).
// IMPORTANTE: fijamos algorithms: ['HS256']. Si no, un atacante podría intentar presentar
// un token con otro algoritmo (por ejemplo "none", sin firma) y engañar a la verificación.
export const verifySession = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

// Guarda el pase en la cookie de la respuesta (res.cookie la envía al navegador).
export const setSessionCookie = (res, user) =>
  res.cookie(COOKIE_NAME, signSession(user), { ...cookieOptions, maxAge: MAX_AGE_MS });

// Cerrar sesión = pedirle al navegador que borre la cookie. Las opciones deben coincidir.
export const clearSessionCookie = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);
