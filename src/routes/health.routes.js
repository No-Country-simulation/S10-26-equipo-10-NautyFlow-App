// ─────────────────────────────────────────────────────────────────────────────
// src/routes/health.routes.js — Endpoints para saber si el servidor está vivo.
//
// Render (y cualquier plataforma) llama a una URL de "health check" cada tanto:
// si no responde, reinicia el servicio. Además a vos te sirve para probar que
// todo arrancó bien.
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from 'express';             // Router = mini-aplicación que agrupa rutas.
import { sequelize } from '../config/db.js';

const router = Router();

// GET /health → "liveness": ¿el proceso de Node está corriendo? No toca la base.
// (req, res) => ...  es el "handler": recibe la petición y arma la respuesta.
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()) }); // uptime = segundos encendido
});

// GET /ready → "readiness": ¿puedo atender pedidos? Verifica también la base de datos.
// `async` permite usar `await` adentro para esperar operaciones lentas (como la base).
// En Express 5, si este await falla, el error va solo al errorHandler (no hace falta try/catch).
router.get('/ready', async (_req, res) => {
  await sequelize.authenticate(); // lanza error si no hay conexión con PostgreSQL
  res.json({ status: 'ready' });
});

// Exportamos el router; app.js lo "monta" en la aplicación.
export default router;
