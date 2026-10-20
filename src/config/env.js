// ─────────────────────────────────────────────────────────────────────────────
// src/config/env.js — Lee y VALIDA las variables de entorno una sola vez.
//
// ¿Por qué existe este archivo?
// Las variables de entorno (process.env) son texto que viene "de afuera" (tu
// archivo .env o el panel de Render). Si falta una o está mal escrita, es mejor
// que la app FALLE AL ARRANCAR con un mensaje claro, y no 3 horas después con un
// error críptico. Por eso las validamos con Zod.
//
// DÍA 2: agregamos JWT_SECRET, SESSION_HOURS y las credenciales del admin inicial.
// ─────────────────────────────────────────────────────────────────────────────

// "import" trae código de otro módulo. Con ES Modules (type: "module" en package.json)
// usamos import/export en vez de require(). Zod es una librería de validación.
import { z } from 'zod';

// Definimos el "molde" (esquema) que deben cumplir las variables.
// z.object({...}) = un objeto con estas propiedades.
const schema = z.object({
  // z.enum([...]) = solo se aceptan esos valores. .default('development') = si no viene, usa ese.
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // process.env SIEMPRE trae texto ("3000"), nunca número. z.coerce.number() convierte
  // el texto a número. .int() = entero, .positive() = mayor que 0.
  PORT: z.coerce.number().int().positive().default(3000),

  // z.string().min(1) = texto no vacío. Obligatoria: no tiene .default(), así que
  // si falta, la validación falla y la app no arranca.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),

  // URL del frontend permitido por CORS. Si no se define, usamos la de Vite en desarrollo.
  WEB_ORIGIN: z.string().default('http://localhost:5173'),

  // ── NUEVO (Día 2) ──
  // Clave secreta con la que FIRMAMOS las sesiones (JWT). Quien la conozca podría fabricar
  // sesiones falsas, por eso: larga (mínimo 32 caracteres), aleatoria y jamás en Git.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),

  // Cuántas horas dura una sesión antes de pedir login de nuevo.
  SESSION_HOURS: z.coerce.number().int().positive().default(12),

  // Política SameSite de la cookie de sesión. 'lax' sirve cuando el frontend y la API
  // comparten sitio (localhost en desarrollo). Si en producción están en dominios
  // distintos, se configura 'none' (que además exige HTTPS).
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Credenciales del primer administrador. Son OPCIONALES (.optional()): solo las usa el
  // script `npm run db:seed:admin`. Si las definís, exigimos que sean válidas.
  ADMIN_EMAIL: z.email('ADMIN_EMAIL no es un email válido').optional(),
  ADMIN_PASSWORD: z.string().min(10, 'ADMIN_PASSWORD debe tener al menos 10 caracteres').optional(),
});

// safeParse NO lanza excepción: devuelve { success: true, data } o { success: false, error }.
// process.env es el objeto global de Node con todas las variables del sistema/.env.
const result = schema.safeParse(process.env);

// Si algo está mal...
if (!result.success) {
  // ...mostramos cada problema en una línea legible (campo + motivo)...
  for (const issue of result.error.issues) {
    console.error(`❌ Variable de entorno inválida: ${issue.path.join('.')} → ${issue.message}`);
  }
  // ...y terminamos el proceso con código 1 (convención: distinto de 0 = error).
  process.exit(1);
}

// "export const" publica el valor para que otros archivos lo importen:
//   import { env } from './config/env.js'
// result.data ya está limpio y con los tipos correctos (PORT es número).
export const env = result.data;
