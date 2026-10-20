// ─────────────────────────────────────────────────────────────────────────────
// src/modules/auth/auth.service.js — La LÓGICA de negocio de registro y login.
//
// ¿Por qué un "service" aparte del controller? Separamos responsabilidades:
//   controller → habla HTTP (lee req, escribe res, cookies, códigos de estado)
//   service    → reglas del negocio (qué significa registrarse o loguearse)
// Así el service se puede probar y reutilizar sin saber nada de HTTP.
// ─────────────────────────────────────────────────────────────────────────────

import { UniqueConstraintError } from 'sequelize';
import { sequelize, User, Lanchero } from '../../models/index.js';
import { hashPassword, verifyPassword, DUMMY_HASH } from '../../utils/password.js';
import { AppError, conflict, unauthorized } from '../../utils/AppError.js';

// Reglas del bloqueo por intentos fallidos.
const MAX_FAILED_LOGINS = 5;  // al 5º error seguido, se bloquea la cuenta
const LOCK_MINUTES = 15;      // por 15 minutos

// Devuelve SOLO los campos de usuario que es seguro mostrar. Es una "lista blanca":
// si mañana agregamos una columna sensible a User, no se filtra por accidente.
export const publicUser = (user) => ({ id: user.id, email: user.email, role: user.role });

// ───────── REGISTRO ─────────
export async function registerLanchero({ email, password, fullName, phone }) {
  // Hasheamos ANTES de abrir la transacción: el hash es lento y no queremos mantener
  // la base ocupada mientras tanto.
  const passwordHash = await hashPassword(password);

  try {
    // TRANSACCIÓN: crear el usuario y su perfil son DOS inserts que deben ir juntos.
    // Si el segundo falla, el primero se deshace: nunca quedan usuarios "a medias".
    return await sequelize.transaction(async (t) => {
      const user = await User.create({ email, passwordHash, role: 'LANCHERO' }, { transaction: t });
      const lanchero = await Lanchero.create(
        { userId: user.id, fullName, phone, consentDataAt: new Date() }, // guardamos CUÁNDO aceptó
        { transaction: t },
      );
      return { user, lanchero }; // lo que devuelve la función del callback sale de transaction()
    });
  } catch (err) {
    // La base rechazó el email por estar repetido (restricción UNIQUE) → 409 Conflict.
    // Nota: avisar "ya existe" permite saber si un email está registrado. Para esta app
    // interna es un compromiso aceptable porque ayuda mucho al lanchero real.
    if (err instanceof UniqueConstraintError) throw conflict('Ya existe una cuenta con ese email');
    throw err; // cualquier otro error sube tal cual
  }
}

// ───────── LOGIN ─────────
export async function loginUser({ email, password }) {
  // scope('withPassword') es el que sí trae passwordHash (el modelo lo oculta por defecto).
  // citext hace que la búsqueda ignore mayúsculas/minúsculas.
  const user = await User.scope('withPassword').findOne({ where: { email } });

  // ¿Cuenta bloqueada? Cortamos antes de verificar nada. 429 = "Too Many Requests".
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(429, 'ACCOUNT_LOCKED', 'Demasiados intentos fallidos. Probá de nuevo en unos minutos.');
  }

  // Verificamos SIEMPRE una contraseña, exista o no el usuario (ver DUMMY_HASH en password.js).
  // `user?.passwordHash ?? DUMMY_HASH` = usa el hash real; si no hay usuario, el señuelo.
  const passwordOk = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  // Un solo mensaje para "email inexistente", "clave incorrecta" y "cuenta desactivada":
  // no le damos pistas a quien intenta adivinar.
  if (!user || !user.isActive || !passwordOk) {
    if (user) await registerFailedAttempt(user); // solo contamos fallos de cuentas reales
    throw unauthorized('Email o contraseña incorrectos');
  }

  // Login correcto: limpiamos el contador de fallos y anotamos la fecha.
  await user.update({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() });
  return user;
}

// Suma un fallo y, al llegar al máximo, bloquea la cuenta.
async function registerFailedAttempt(user) {
  const failed = user.failedLogins + 1;

  if (failed >= MAX_FAILED_LOGINS) {
    // Bloqueamos y reiniciamos el contador: al terminar el bloqueo vuelve a tener 5 intentos
    // (si no, el primer error posterior lo bloquearía otra vez).
    await user.update({
      failedLogins: 0,
      lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000), // ahora + 15 min en ms
    });
  } else {
    await user.update({ failedLogins: failed });
  }
}
