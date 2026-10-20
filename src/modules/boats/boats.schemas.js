// ─────────────────────────────────────────────────────────────────────────────
// src/modules/boats/boats.schemas.js — Qué datos aceptamos en el portal de lanchas.
//
// Dos ideas clave:
//  1) VALIDAR: todo dato externo se comprueba antes de tocar la base.
//  2) LISTA BLANCA: Zod descarta los campos que NO declaramos acá. Si alguien manda
//     {"verificationStatus":"VERIFIED"} al crear una lancha, ese campo simplemente
//     desaparece. Se llama "protección contra mass assignment" (asignación masiva).
// ─────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';

// ───────── Parámetro de la URL: /me/boats/:id ─────────
// Si llega "abc" en vez de un UUID, PostgreSQL daría un error 500. Validamos antes → 400 claro.
export const boatIdParams = z.object({
  id: z.uuid('ID de lancha inválido'),
});

// ───────── Crear / editar la lancha ─────────
// Un string opcional vacío ("") lo tratamos como "no cargado".
const optionalText = (max) =>
  z.string().trim().max(max, `Máximo ${max} caracteres`).optional();

export const boatSchema = z.object({
  name: z.string('El nombre es obligatorio').trim().min(2, 'El nombre es muy corto').max(80, 'Máximo 80 caracteres'),

  // z.number() NO acepta el texto "8", solo el número 8: así evitamos datos ambiguos.
  // .int() = sin decimales. 1 a 60 = mismo rango que el CHECK de la base.
  capacity: z
    .number('La capacidad debe ser un número')
    .int('La capacidad debe ser un número entero')
    .min(1, 'La capacidad mínima es 1')
    .max(60, 'La capacidad máxima es 60'),

  description: optionalText(1000),
  registrationNumber: optionalText(40), // matrícula

  yearBuilt: z
    .number('El año debe ser un número')
    .int()
    .min(1950, 'Año inválido')
    .max(new Date().getFullYear() + 1, 'Año inválido') // hasta el año que viene (modelos nuevos)
    .optional(),
});

// ───────── Zonas que cubre ─────────
export const zonesSchema = z.object({
  zoneIds: z
    .array(z.number().int().positive(), 'zoneIds debe ser una lista de números')
    .min(1, 'Elegí al menos una zona')
    .max(20, 'Demasiadas zonas')
    // refine = regla propia. Un Set no admite repetidos: si su tamaño es menor que el de la
    // lista, había IDs duplicados.
    .refine((ids) => new Set(ids).size === ids.length, 'Hay zonas repetidas'),
});

// ───────── Horarios semanales ─────────
// "08:00" a "23:59". La regex acepta horas 00-23 y minutos 00-59, con el formato HH:MM.
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida, usá el formato HH:MM');

const slotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0, 'Día inválido (0=domingo ... 6=sábado)').max(6, 'Día inválido (0=domingo ... 6=sábado)'),
    startTime: hhmm,
    endTime: hhmm,
  })
  // Comparar textos "HH:MM" funciona porque con ceros a la izquierda el orden alfabético
  // coincide con el orden de las horas ("08:00" < "14:30").
  .refine((s) => s.endTime > s.startTime, 'La hora de fin debe ser posterior a la de inicio');

export const availabilitySchema = z.object({
  slots: z
    .array(slotSchema)
    .max(50, 'Demasiadas franjas')
    // Una lista vacía ES válida: significa "sin restricción horaria".
    .refine(noOverlaps, 'Hay franjas que se superponen el mismo día'),
});

// Devuelve true si ninguna franja pisa a otra del mismo día.
function noOverlaps(slots) {
  // Ordenamos por día y hora de inicio. [...slots] copia la lista para no alterar la original.
  const sorted = [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    // Mismo día y la actual empieza antes de que termine la anterior → se superponen.
    if (cur.dayOfWeek === prev.dayOfWeek && cur.startTime < prev.endTime) return false;
  }
  return true;
}

// ───────── Pausar / activar ─────────
export const activeSchema = z.object({
  isActive: z.boolean('isActive debe ser true o false'),
});
