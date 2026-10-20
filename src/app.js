// ─────────────────────────────────────────────────────────────────────────────
// src/app.js — Arma la aplicación Express (pero NO la pone a escuchar).
//
// Separar "armar la app" (acá) de "encenderla" (server.js) permite que los tests
// importen la app y le hagan pedidos sin abrir un puerto real.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express';  // El framework web.
import helmet from 'helmet';    // Agrega cabeceras HTTP de seguridad.
import cors from 'cors';        // Controla qué sitios web pueden llamar a la API.
import cookieParser from 'cookie-parser'; // Lee las cookies del pedido y las deja en req.cookies.
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import apiRoutes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

export function createApp() {
  const app = express(); // Crea la aplicación.

  // En producción (Render) la API está detrás de un "proxy" (un intermediario que recibe
  // el tráfico y nos lo reenvía). Sin esta línea, TODOS los pedidos parecerían venir de la
  // IP del proxy y el limitador de intentos bloquearía a todos juntos. El 1 = "confiá en un
  // solo proxy". En local no hay proxy, así que no se activa.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  // app.use(middleware) agrega un paso a la "línea de montaje". EL ORDEN IMPORTA.

  // 1) helmet: ej. evita que tu API se muestre dentro de iframes ajenos, oculta "X-Powered-By".
  app.use(helmet());

  // 2) cors: el navegador bloquea que una web (localhost:5173) llame a otra (localhost:3000)
  //    salvo que el servidor lo permita. Permitimos SOLO el origen de nuestro frontend.
  //    credentials:true deja enviar cookies (las usaremos para la sesión).
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));

  // 3) express.json(): lee el body de tipo JSON y lo deja listo en req.body.
  //    limit evita que alguien mande un body gigante para saturar el servidor.
  app.use(express.json({ limit: '100kb' }));

  // 3b) cookieParser(): convierte la cabecera "Cookie: nf_session=..." en el objeto
  //     req.cookies. Lo necesita requireAuth para encontrar la sesión.
  app.use(cookieParser());

  // 4) Rutas. Health en la raíz (/health, /ready); la API de negocio bajo /api/v1.
  //    Versionar (/v1) permite cambiar la API en el futuro sin romper clientes viejos.
  app.use(healthRoutes);
  app.use('/api/v1', apiRoutes);

  // 5) Si ninguna ruta atendió el pedido → 404.
  app.use(notFound);

  // 6) SIEMPRE al final: atrapa cualquier error y lo convierte en respuesta JSON.
  app.use(errorHandler);

  return app; // La devolvemos para que server.js (o un test) la use.
}
