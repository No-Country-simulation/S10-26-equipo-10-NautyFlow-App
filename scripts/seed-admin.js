// ─────────────────────────────────────────────────────────────────────────────
// scripts/seed-admin.js — Crea (o actualiza) el usuario ADMINISTRADOR inicial.
// Uso:  npm run db:seed:admin
//
// ¿Por qué un script y no una pantalla de registro? Porque el registro público SOLO crea
// lancheros. Si cualquiera pudiera registrarse como admin, el sistema no tendría seguridad.
// El primer admin se crea desde la terminal, con las credenciales de tu archivo .env.
//
// Es REPETIBLE: si el email ya existe, actualiza su contraseña y lo deja como ADMIN activo.
// (Sirve también para recuperar el acceso si olvidás la clave del admin.)
// ─────────────────────────────────────────────────────────────────────────────

import { env } from '../src/config/env.js';
import { sequelize, User } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';

sequelize.options.logging = false; // no mostramos el SQL, solo nuestros mensajes

try {
  // Las variables son opcionales en env.js (el servidor no las necesita), pero ESTE script sí.
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('Definí ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 10 caracteres) en tu archivo .env');
  }

  const email = env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD); // jamás guardamos la clave en claro

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    // Reiniciamos también el bloqueo, por si se trabó con intentos fallidos.
    await existing.update({ passwordHash, role: 'ADMIN', isActive: true, failedLogins: 0, lockedUntil: null });
    console.log(`🔁 Administrador actualizado: ${email}`);
  } else {
    await User.create({ email, passwordHash, role: 'ADMIN' });
    console.log(`✅ Administrador creado: ${email}`);
  }
} catch (err) {
  console.error('❌ No se pudo crear el administrador:', err.message);
  process.exitCode = 1;
} finally {
  await sequelize.close(); // cerramos el pool; si no, el proceso no termina nunca
}
