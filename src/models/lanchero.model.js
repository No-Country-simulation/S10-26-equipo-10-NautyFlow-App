// ─────────────────────────────────────────────────────────────────────────────
// src/models/lanchero.model.js — Modelo de la tabla "lancheros" (el conductor).
// ─────────────────────────────────────────────────────────────────────────────

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Lanchero = sequelize.define(
    'Lanchero',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      // Clave foránea hacia users. La declaramos para poder leerla/escribirla directamente.
      userId: { type: DataTypes.UUID, allowNull: false },
      fullName: {
        type: DataTypes.STRING(120),
        allowNull: false,
        validate: { len: [2, 120] }, // largo entre 2 y 120 caracteres
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        // Misma regla que el CHECK de la base: solo 10 a 15 dígitos. Validar en las dos
        // capas da mensajes de error claros (JS) y protección final (base).
        validate: { is: /^[0-9]{10,15}$/ },
      },
      consentDataAt: { type: DataTypes.DATE, allowNull: false }, // DATE en Sequelize = timestamp
    },
    { tableName: 'lancheros' },
  );

  return Lanchero;
};
