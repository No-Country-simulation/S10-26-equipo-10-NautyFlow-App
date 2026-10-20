// ─────────────────────────────────────────────────────────────────────────────
// vitest.config.js — Configuración de los tests.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';          // convierte el texto de un .env en un objeto
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Cargamos .env.test para que los tests usen la base nautiflow_test.
    env: parseEnv(readFileSync('.env.test', 'utf8')),
    // Los tests de base de datos comparten una sola base: los corremos de a uno
    // para que no se pisen entre sí.
    fileParallelism: false,
  },
});
