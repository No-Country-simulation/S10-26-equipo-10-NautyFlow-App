// ─────────────────────────────────────────────────────────────────────────────
// tests/boats.test.js — Pruebas del portal de lanchas (/api/v1/me/boats).
//
// Lo más importante que verifican: un lanchero NUNCA puede ver ni tocar las lanchas
// de otro, y nadie puede "colar" campos que no le corresponden (estado, reputación...).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { sequelize, User, Zone } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';

const app = createApp();
const API = '/api/v1/me/boats';

// Limpieza: primero las lanchas de los usuarios de test (la base NO deja borrar un lanchero
// con lanchas: ON DELETE RESTRICT), después los usuarios. Sus zonas y horarios se borran solos.
async function cleanup() {
  await sequelize.query(`
    DELETE FROM boats WHERE lanchero_id IN (
      SELECT l.id FROM lancheros l JOIN users u ON u.id = l.user_id WHERE u.email LIKE '%@boats.test')`);
  await sequelize.query(`DELETE FROM users WHERE email LIKE '%@boats.test'`);
}

// Registra un lanchero por la API y devuelve un "agent" (cliente con sus cookies, como un navegador).
async function lanceroAgent(email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/auth/register').send({
    email, password: 'Clave-Segura-123', fullName: 'Lanchero Test', phone: '5491155551234', acceptTerms: true,
  });
  expect(res.status).toBe(201);
  return agent;
}

const validBoat = (over = {}) => ({ name: 'Delfín del Delta', capacity: 8, ...over });

beforeEach(cleanup);
afterAll(async () => {
  await cleanup();
  await sequelize.close();
});

describe('Acceso', () => {
  it('sin sesión → 401', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
  });

  it('un administrador no usa el portal del lanchero → 403', async () => {
    await User.create({ email: 'admin@boats.test', passwordHash: await hashPassword('Clave-Segura-123'), role: 'ADMIN' });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'admin@boats.test', password: 'Clave-Segura-123' });

    const res = await agent.get(API);
    expect(res.status).toBe(403);
  });
});

describe('Crear y leer', () => {
  it('crea una lancha en estado DRAFT, activa y sin reputación', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const res = await agent.post(API).send(validBoat({ description: 'Ideal para familias', yearBuilt: 2018 }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Delfín del Delta',
      slug: 'delfin-del-delta',
      capacity: 8,
      verificationStatus: 'DRAFT',
      isActive: true,
      ratingAvg: null,
      ratingCount: 0,
      zones: [],
      availability: [],
    });
  });

  it('genera slugs únicos aunque el nombre se repita, y limpia acentos y ñ', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const first = await agent.post(API).send(validBoat());
    const second = await agent.post(API).send(validBoat());
    const third = await agent.post(API).send(validBoat({ name: 'Ñandú del Río' }));

    expect(first.body.data.slug).toBe('delfin-del-delta');
    expect(second.body.data.slug).toMatch(/^delfin-del-delta-[0-9a-f]{4}$/);
    expect(third.body.data.slug).toBe('nandu-del-rio');
  });

  it('ignora campos que el lanchero no puede decidir (estado, reputación, dueño)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const res = await agent.post(API).send(
      validBoat({ verificationStatus: 'VERIFIED', ratingAvg: 5, ratingCount: 999, lancheroId: crypto.randomUUID() }),
    );

    expect(res.status).toBe(201);
    expect(res.body.data.verificationStatus).toBe('DRAFT');
    expect(res.body.data.ratingAvg).toBeNull();
    expect(res.body.data.ratingCount).toBe(0);
  });

  it('lista solo MIS lanchas', async () => {
    const a = await lanceroAgent('a@boats.test');
    const b = await lanceroAgent('b@boats.test');
    await a.post(API).send(validBoat({ name: 'Lancha de A' }));
    await b.post(API).send(validBoat({ name: 'Lancha de B' }));

    const res = await a.get(API);
    expect(res.body.data.map((x) => x.name)).toEqual(['Lancha de A']);
  });

  it('limita a 5 lanchas por lanchero (409)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    for (let i = 1; i <= 5; i++) {
      expect((await agent.post(API).send(validBoat({ name: `Lancha ${i}` }))).status).toBe(201);
    }
    const sixth = await agent.post(API).send(validBoat({ name: 'Lancha 6' }));
    expect(sixth.status).toBe(409);
  });
});

describe('Validación', () => {
  it.each([
    ['capacidad 0', { capacity: 0 }, 'capacity'],
    ['capacidad 61', { capacity: 61 }, 'capacity'],
    ['capacidad como texto', { capacity: '8' }, 'capacity'],
    ['capacidad con decimales', { capacity: 7.5 }, 'capacity'],
    ['nombre de 1 letra', { name: 'A' }, 'name'],
    ['año inválido', { yearBuilt: 1800 }, 'yearBuilt'],
  ])('rechaza %s con 400 e indica el campo', async (_caso, over, field) => {
    const agent = await lanceroAgent('a@boats.test');
    const res = await agent.post(API).send(validBoat(over));

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  it('un id que no es UUID → 400 (y no un error 500 de la base)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const res = await agent.get(`${API}/123`);
    expect(res.status).toBe(400);
  });
});

describe('Editar', () => {
  it('cambia los datos pero el slug se mantiene (las URLs compartidas no se rompen)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat({ description: 'Texto viejo' }));
    const id = body.data.id;

    const res = await agent.put(`${API}/${id}`).send({ name: 'Delfín Plus', capacity: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Delfín Plus');
    expect(res.body.data.capacity).toBe(10);
    expect(res.body.data.slug).toBe('delfin-del-delta'); // igual que antes
    expect(res.body.data.description).toBeNull();         // PUT reemplaza: lo no enviado se vacía
  });
});

describe('Seguridad entre lancheros (IDOR)', () => {
  it('B no puede ver, editar, pausar ni cambiar zonas u horarios de la lancha de A → 404', async () => {
    const a = await lanceroAgent('a@boats.test');
    const b = await lanceroAgent('b@boats.test');
    const { body } = await a.post(API).send(validBoat());
    const url = `${API}/${body.data.id}`;

    const attempts = [
      await b.get(url),
      await b.put(url).send(validBoat({ name: 'Robada' })),
      await b.patch(`${url}/active`).send({ isActive: false }),
      await b.put(`${url}/zones`).send({ zoneIds: [1] }),
      await b.put(`${url}/availability`).send({ slots: [] }),
    ];
    // 404 (y no 403): no confirmamos que ese ID existe.
    for (const res of attempts) expect(res.status).toBe(404);

    // Y la lancha de A quedó intacta.
    const check = await a.get(url);
    expect(check.body.data.name).toBe('Delfín del Delta');
    expect(check.body.data.isActive).toBe(true);
  });
});

describe('Zonas', () => {
  it('asigna zonas y las reemplaza por completo', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    const url = `${API}/${body.data.id}/zones`;

    const zones = await Zone.findAll({ order: [['sortOrder', 'ASC']], limit: 3 });
    const [z1, z2, z3] = zones.map((z) => z.id);

    const first = await agent.put(url).send({ zoneIds: [z1, z2] });
    expect(first.status).toBe(200);
    expect(first.body.data.zones.map((z) => z.id)).toEqual([z1, z2]);

    const second = await agent.put(url).send({ zoneIds: [z3] });
    expect(second.body.data.zones.map((z) => z.id)).toEqual([z3]); // las anteriores desaparecieron
  });

  it('rechaza lista vacía, repetidas o zonas inexistentes (400)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    const url = `${API}/${body.data.id}/zones`;

    expect((await agent.put(url).send({ zoneIds: [] })).status).toBe(400);
    expect((await agent.put(url).send({ zoneIds: [1, 1] })).status).toBe(400);
    expect((await agent.put(url).send({ zoneIds: [9999] })).status).toBe(400);
  });
});

describe('Horarios', () => {
  const url = (id) => `${API}/${id}/availability`;

  it('guarda las franjas, las devuelve ordenadas y en formato HH:MM', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());

    const res = await agent.put(url(body.data.id)).send({
      slots: [
        { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.availability).toEqual([
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
      { dayOfWeek: 2, startTime: '08:00', endTime: '12:00' },
    ]);
  });

  it('una lista vacía borra todo (= sin restricción horaria)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    await agent.put(url(body.data.id)).send({ slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }] });

    const res = await agent.put(url(body.data.id)).send({ slots: [] });
    expect(res.status).toBe(200);
    expect(res.body.data.availability).toEqual([]);
  });

  it.each([
    ['fin antes del inicio', [{ dayOfWeek: 1, startTime: '12:00', endTime: '08:00' }]],
    ['hora mal escrita', [{ dayOfWeek: 1, startTime: '8:00', endTime: '12:00' }]],
    ['día inexistente', [{ dayOfWeek: 7, startTime: '08:00', endTime: '12:00' }]],
    ['franjas superpuestas', [
      { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
      { dayOfWeek: 1, startTime: '11:00', endTime: '15:00' },
    ]],
  ])('rechaza %s (400)', async (_caso, slots) => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    const res = await agent.put(url(body.data.id)).send({ slots });
    expect(res.status).toBe(400);
  });

  it('si la validación falla, NO se pierden los horarios anteriores', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    await agent.put(url(body.data.id)).send({ slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }] });

    await agent.put(url(body.data.id)).send({ slots: [{ dayOfWeek: 1, startTime: '12:00', endTime: '08:00' }] });

    const check = await agent.get(`${API}/${body.data.id}`);
    expect(check.body.data.availability).toHaveLength(1);
  });
});

describe('Pausar / activar', () => {
  it('pausa y reactiva la lancha', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    const url = `${API}/${body.data.id}/active`;

    const paused = await agent.patch(url).send({ isActive: false });
    expect(paused.body.data.isActive).toBe(false);

    const active = await agent.patch(url).send({ isActive: true });
    expect(active.body.data.isActive).toBe(true);
  });

  it('exige un booleano de verdad (400)', async () => {
    const agent = await lanceroAgent('a@boats.test');
    const { body } = await agent.post(API).send(validBoat());
    const res = await agent.patch(`${API}/${body.data.id}/active`).send({ isActive: 'false' });
    expect(res.status).toBe(400);
  });
});
