// ─────────────────────────────────────────────────────────────────────────────
// src/modules/auth/auth.schemas.js — Qué datos aceptamos en registro y login.
//
// Un "schema" de Zod es el molde del body. Si algo no encaja, el pedido se rechaza
// con 400 ANTES de tocar la base de datos.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// Reutilizamos esta pieza en registro y login.
// .trim() quita espacios de los costados, .toLowerCase() pasa a minúsculas,
// .pipe(z.email()) recién después valida el formato. El orden importa: primero limpiamos.
const email = z.string().trim().toLowerCase().pipe(z.email('Email inválido'));

export const registerSchema = z.object({
  email,

  // Largo mínimo 10 (más largo = más difícil de adivinar). Máximo 128 para que nadie
  // envíe un texto gigante que haga trabajar de más al hash.
  password: z
    .string()
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128, 'La contraseña es demasiado larga'),

  fullName: z.string().trim().min(2, 'Ingresá tu nombre completo').max(120),

  // Aceptamos "+54 9 11 5555-1234" tal como lo escribe la gente (con espacios, + o guiones)...
  // .transform(...) lo convierte a solo dígitos: 5491155551234, que es lo que guardamos y
  // lo que necesita el link de WhatsApp (wa.me).
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,20}$/, 'Teléfono inválido')
    .transform((v) => v.replace(/\D/g, '')),

  // El lanchero DEBE aceptar el tratamiento de sus datos (Ley 25.326), sobre todo porque
  // subirá documentos sensibles. z.literal(true) = solo vale exactamente `true`.
  acceptTerms: z.literal(true, 'Debés aceptar el tratamiento de tus datos para registrarte'),
});

export const loginSchema = z.object({
  email,
  // En el login NO validamos largo mínimo: solo que venga algo. Si la validáramos,
  // le diríamos a un atacante qué reglas tiene la contraseña.
  password: z.string().min(1, 'Ingresá tu contraseña').max(128),
});
