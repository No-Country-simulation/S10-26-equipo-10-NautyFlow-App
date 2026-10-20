// ─────────────────────────────────────────────────────────────────────────────
// tests/health.test.js — Primeros tests: salud del servidor, zonas y errores.
// Ejecutar:  npm test
// ─────────────────────────────────────────────────────────────────────────────

// describe agrupa tests; it define uno; expect compara el resultado con lo esperado.
// beforeAll/afterAll corren una vez antes/después de todos los tests del grupo.
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest'; // hace pedidos HTTP a la app SIN abrir un puerto real
import { createApp } from '../src/app.js';
import { sequelize } from '../src/config/db.js';

const app = createApp();

// Al terminar, cerramos la conexión a la base para que el test no quede colgado.
afterAll(async () => {
  await sequelize.close();
});

describe('Salud del servidor', () => {
  it('GET /health responde 200 y status ok', async () => {
    const res = await request(app).get('/health'); // simula GET /health
    expect(res.status).toBe(200);                  // código HTTP esperado
    expect(res.body.status).toBe('ok');            // contenido del JSON
  });

  it('GET /ready confirma la conexión a la base', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready' }); // toEqual compara objetos completos
  });
});

describe('GET /api/v1/zones', () => {
  it('devuelve las zonas sembradas por la migración, ordenadas', async () => {
    const res = await request(app).get('/api/v1/zones');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(7);
    expect(res.body.data[0].slug).toBe('primera-seccion'); // la de sort_order = 1
    // No debe filtrar columnas internas:
    expect(res.body.data[0]).not.toHaveProperty('sortOrder');
  });
});

describe('Manejo de errores', () => {
  it('una ruta inexistente devuelve 404 con formato JSON uniforme', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('un JSON malformado devuelve 400 y no un error 500', async () => {
    const res = await request(app)
      .post('/api/v1/zones')
      .set('Content-Type', 'application/json')
      .send('{"roto":'); // JSON incompleto a propósito
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });
});
