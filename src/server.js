// ─────────────────────────────────────────────────────────────────────────────
// src/server.js — Punto de entrada: conecta a la base y enciende el servidor.
// Se ejecuta con:  npm run dev
// ─────────────────────────────────────────────────────────────────────────────

import { createApp } from './app.js';
import { env } from './config/env.js';
import { sequelize } from './config/db.js';

async function main() {
  // Verificamos la base ANTES de aceptar tráfico: si no conecta, mejor fallar ya.
  await sequelize.authenticate();
  console.log('✅ Conectado a PostgreSQL');

  const app = createApp();

  // app.listen(puerto, callback): empieza a escuchar pedidos HTTP.
  // Devuelve el "server" de Node, que necesitamos para apagarlo con elegancia.
  const server = app.listen(env.PORT, () => {
    console.log(`🚤 NautiFlow API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // "Apagado elegante": al recibir la señal de parar (Ctrl+C = SIGINT, Render = SIGTERM)
  // dejamos de aceptar pedidos nuevos, terminamos los en curso y cerramos la base.
  const shutdown = (signal) => {
    console.log(`\n${signal} recibido, cerrando...`);
    server.close(async () => {
      await sequelize.close();
      process.exit(0); // 0 = terminó bien
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// main() es async y devuelve una promesa; .catch atrapa cualquier error de arranque.
main().catch((err) => {
  console.error('❌ No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
