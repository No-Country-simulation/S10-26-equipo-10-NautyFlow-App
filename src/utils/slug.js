// ─────────────────────────────────────────────────────────────────────────────
// src/utils/slug.js — Convierte un nombre en un "slug" apto para URL.
//
// "Delfín del Delta" → "delfin-del-delta"
// El slug es la parte legible de la dirección pública de la lancha:
//   /lanchas/delfin-del-delta
// ─────────────────────────────────────────────────────────────────────────────

import { randomBytes } from 'node:crypto'; // generador de bytes aleatorios seguro (viene con Node)

export function slugify(text) {
  return text
    // normalize('NFD') separa cada letra de su acento: "í" pasa a ser "i" + "´" (dos caracteres).
    .normalize('NFD')
    // Borramos los acentos sueltos (rango Unicode U+0300 a U+036F). "ñ" queda como "n".
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Todo lo que NO sea letra o número (espacios, signos, emojis) pasa a un guion.
    // El "+" agrupa varios seguidos en uno solo.
    .replace(/[^a-z0-9]+/g, '-')
    // Quitamos guiones sobrantes al principio o al final.
    .replace(/^-+|-+$/g, '')
    // Limitamos el largo (la columna admite 100; dejamos lugar para el sufijo).
    .slice(0, 80);
}

// Si dos lanchas se llaman igual, la segunda recibe un sufijo aleatorio corto:
// "delfin-del-delta-a3f9". randomBytes(2) = 2 bytes → .toString('hex') = 4 caracteres.
export const withSuffix = (slug) => `${slug || 'lancha'}-${randomBytes(2).toString('hex')}`;
