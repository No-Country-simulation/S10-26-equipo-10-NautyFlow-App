// ─────────────────────────────────────────────────────────────────────────────
// tests/auth.test.js — Pruebas del sistema de login y permisos.
// Ejecutar:  npm test
//
// Cada test describe una promesa de seguridad: "si pasa X, el sistema responde Y".
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { Op } from 'sequelize';
import { createApp } from '../src/app.js';
import { sequelize, User } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';

const app = createApp();
const PASS = 'Clave-Segura-123';

// Todos los emails de test terminan en @auth.test: así sabemos qué limpiar sin tocar otros datos.
const cleanup = () => User.destroy({ where: { email: { [Op.like]: '%@auth.test' } } });

// Datos válidos de registro; `over` permite cambiar un campo para probar un caso.
const validBody = (over = {}) => ({
  email: 'carlos@auth.test',
  password: PASS,
  fullName: 'Carlos Pérez',
  phone: '+54 9 11 5555-1234', // con espacios y "+": el esquema lo normaliza
  acceptTerms: true,
  ...over,
});

beforeEach(cleanup);              // antes de CADA test, empezamos sin usuarios de prueba
afterAll(async () => {
  await cleanup();
  await sequelize.close();
});

describe('POST /api/v1/auth/register', () => {
  it('crea la cuenta, normaliza el teléfono y deja la sesión iniciada', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'carlos@auth.test', role: 'LANCHERO' });
    expect(res.body.data.lanchero.phone).toBe('5491155551234'); // solo dígitos
    expect(JSON.stringify(res.body)).not.toContain('passwordHash'); // nunca se filtra el hash

    // La cookie de sesión debe ser httpOnly (JavaScript del navegador no puede leerla).
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('nf_session='));
    expect(cookie).toBeDefined();
    expect(cookie).toContain('HttpOnly');
  });

  it('guarda un hash argon2id, jamás la contraseña', async () => {
    await request(app).post('/api/v1/auth/register').send(validBody());
    const user = await User.scope('withPassword').findOne({ where: { email: 'carlos@auth.test' } });

    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(PASS);
  });

  it('rechaza datos inválidos con 400 e indica qué campo falló', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validBody({ password: 'corta' }));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain('password');
  });

  it('exige aceptar el tratamiento de datos', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validBody({ acceptTerms: false }));
    expect(res.status).toBe(400);
  });

  it('rechaza un email repetido aunque cambien las mayúsculas (409)', async () => {
    await request(app).post('/api/v1/auth/register').send(validBody());
    const res = await request(app).post('/api/v1/auth/register').send(validBody({ email: 'CARLOS@Auth.Test' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validBody());
  });

  it('con credenciales correctas devuelve el usuario y setea la cookie', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: PASS });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('carlos@auth.test');
    expect(res.headers['set-cookie'].some((c) => c.startsWith('nf_session='))).toBe(true);
  });

  it('responde IGUAL con clave incorrecta que con un email inexistente', async () => {
    const wrongPass = await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: 'otra-clave-123' });
    const noUser = await request(app).post('/api/v1/auth/login').send({ email: 'nadie@auth.test', password: 'otra-clave-123' });

    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    // Mismo mensaje: no le damos pistas a quien intenta descubrir qué emails existen.
    expect(wrongPass.body.error.message).toBe(noUser.body.error.message);
  });

  it('bloquea la cuenta tras 5 intentos fallidos, incluso con la clave correcta', async () => {
    for (let i = 0; i < 5; i++) {
      const bad = await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: 'incorrecta-123' });
      expect(bad.status).toBe(401);
    }

    const locked = await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: PASS });
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('un login correcto reinicia el contador de fallos', async () => {
    await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: 'incorrecta-123' });
    await request(app).post('/api/v1/auth/login').send({ email: 'carlos@auth.test', password: PASS });

    const user = await User.findOne({ where: { email: 'carlos@auth.test' } });
    expect(user.failedLogins).toBe(0);
    expect(user.lastLoginAt).not.toBeNull();
  });
});

describe('Sesión: GET /auth/me y POST /auth/logout', () => {
  it('sin cookie → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('con una cookie inventada o alterada → 401', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', 'nf_session=esto.no.es.un.jwt');
    expect(res.status).toBe(401);
  });

  it('con sesión válida devuelve el usuario y su perfil de lanchero', async () => {
    // agent() conserva las cookies entre pedidos, como lo haría un navegador.
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(validBody());

    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('LANCHERO');
    expect(res.body.data.lanchero.fullName).toBe('Carlos Pérez');
  });

  it('logout borra la sesión', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(validBody());

    const out = await agent.post('/api/v1/auth/logout');
    expect(out.status).toBe(204);

    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('si desactivan la cuenta, la sesión deja de servir al instante', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(validBody());
    await User.update({ isActive: false }, { where: { email: 'carlos@auth.test' } });

    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Roles: zona de administración', () => {
  it('sin sesión → 401', async () => {
    const res = await request(app).get('/api/v1/admin/ping');
    expect(res.status).toBe(401);
  });

  it('un lanchero logueado → 403 (tiene sesión pero no permiso)', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send(validBody());

    const res = await agent.get('/api/v1/admin/ping');
    expect(res.status).toBe(403);
  });

  it('un administrador → 200', async () => {
    // Creamos el admin directo en la base: por la API pública no se puede (a propósito).
    await User.create({
      email: 'admin@auth.test',
      passwordHash: await hashPassword(PASS),
      role: 'ADMIN',
    });
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: 'admin@auth.test', password: PASS });

    const res = await agent.get('/api/v1/admin/ping');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@auth.test');
  });

  it('no se puede auto-asignar el rol ADMIN al registrarse', async () => {
    // Mandamos un campo "role" extra: el esquema lo ignora y el service fija LANCHERO.
    const res = await request(app).post('/api/v1/auth/register').send(validBody({ role: 'ADMIN' }));
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('LANCHERO');
  });
});
