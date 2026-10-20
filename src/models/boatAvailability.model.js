// ─────────────────────────────────────────────────────────────────────────────
// src/models/boatAvailability.model.js — Modelo de "boat_availability" (horarios).
// ─────────────────────────────────────────────────────────────────────────────

import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const BoatAvailability = sequelize.define(
    'BoatAvailability',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      boatId: { type: DataTypes.UUID, allowNull: false },
      // 0 = domingo ... 6 = sábado (igual que PostgreSQL).
      dayOfWeek: { type: DataTypes.SMALLINT, allowNull: false, validate: { min: 0, max: 6 } },
      // TIME llega desde PostgreSQL como texto "08:00:00" (con segundos).
      // En la respuesta de la API lo recortamos a "08:00".
      startTime: { type: DataTypes.TIME, allowNull: false },
      endTime: { type: DataTypes.TIME, allowNull: false },
    },
    {
      tableName: 'boat_availability',
      timestamps: false, // la tabla no tiene created_at / updated_at
    },
  );

  return BoatAvailability;
};
