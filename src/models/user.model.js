// ─────────────────────────────────────────────────────────────────────────────
// src/models/user.model.js — Modelo Sequelize de la tabla "users".
//
// Un MODELO es la "traducción" de una tabla a JavaScript: cada columna es una
// propiedad. Gracias a eso podemos hacer User.findOne({ where: { email } }) y
// Sequelize arma el SQL por nosotros.
// ─────────────────────────────────────────────────────────────────────────────

import { DataTypes } from 'sequelize'; // DataTypes = catálogo de tipos (STRING, UUID, BOOLEAN...).

// Exportamos una FUNCIÓN que recibe la conexión y define el modelo.
// Así models/index.js puede registrar todos los modelos con la misma conexión.
export default (sequelize) => {
  // sequelize.define('NombreDelModelo', { columnas }, { opciones })
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,                 // coincide con UUID de PostgreSQL
        defaultValue: DataTypes.UUIDV4,       // si no pasamos id al crear, genera uno aleatorio
        primaryKey: true,                     // es la clave primaria
      },
      email: {
        type: DataTypes.CITEXT,               // texto que ignora mayúsculas (igual que en la migración)
        allowNull: false,                     // obligatorio
        unique: true,                         // no repetido
        validate: { isEmail: true },          // Sequelize valida el formato ANTES de guardar
      },
      passwordHash: {
        type: DataTypes.TEXT,
        allowNull: false,
        // En la base la columna se llama password_hash (underscored: true lo convierte solo).
      },
      role: {
        type: DataTypes.ENUM('ADMIN', 'LANCHERO'), // solo estos dos valores son válidos
        allowNull: false,
        defaultValue: 'LANCHERO',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      // ── NUEVO (Día 2): protección del login ──
      failedLogins: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
      lockedUntil: { type: DataTypes.DATE },   // null = sin bloqueo
      lastLoginAt: { type: DataTypes.DATE },
    },
    {
      tableName: 'users', // nombre EXACTO de la tabla (si no, Sequelize pluraliza por su cuenta)
      // Quita passwordHash de las consultas por defecto: así nunca se filtra por accidente
      // en una respuesta JSON. Cuando lo necesitemos (login) pediremos el scope 'withPassword'.
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withPassword: { attributes: { include: ['passwordHash'] } } },
    },
  );

  return User;
};
