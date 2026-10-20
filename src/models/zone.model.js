// ─────────────────────────────────────────────────────────────────────────────
// src/models/zone.model.js — Modelo de la tabla "zones" (zonas del Delta).
// ─────────────────────────────────────────────────────────────────────────────

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Zone = sequelize.define(
    'Zone',
    {
      id: {
        type: DataTypes.SMALLINT,
        primaryKey: true,
        autoIncrement: true, // la base asigna 1, 2, 3... (SMALLSERIAL)
      },
      name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    },
    {
      tableName: 'zones',
      timestamps: false, // esta tabla NO tiene created_at/updated_at, así que lo apagamos
    },
  );

  return Zone;
};
