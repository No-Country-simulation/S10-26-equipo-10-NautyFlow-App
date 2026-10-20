// ─────────────────────────────────────────────────────────────────────────────
// src/models/boat.model.js — Modelo de la tabla "boats" (las lanchas).
// ─────────────────────────────────────────────────────────────────────────────

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Boat = sequelize.define(
    'Boat',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      lancheroId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.STRING(80), allowNull: false, validate: { len: [2, 80] } },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      registrationNumber: { type: DataTypes.STRING(40) }, // sin allowNull: false → opcional
      capacity: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        validate: { min: 1, max: 60 }, // igual que el CHECK de la base
      },
      description: { type: DataTypes.TEXT },
      yearBuilt: { type: DataTypes.SMALLINT, validate: { min: 1950, max: 2100 } },
      verificationStatus: {
        type: DataTypes.ENUM('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      verificationNote: { type: DataTypes.TEXT },
      verifiedAt: { type: DataTypes.DATE },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // DECIMAL llega como TEXTO desde PostgreSQL ("4.85") para no perder precisión.
      // Más adelante lo convertiremos a número al responder la API.
      ratingAvg: { type: DataTypes.DECIMAL(3, 2) },
      ratingCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'boats' },
  );

  return Boat;
};
