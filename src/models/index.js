// ─────────────────────────────────────────────────────────────────────────────
// src/models/index.js — Registra todos los modelos y define sus RELACIONES.
//
// Las relaciones le enseñan a Sequelize cómo se conectan las tablas, para poder
// pedir "una lancha con su lanchero y sus zonas" en una sola consulta (include).
// Todo el resto de la app importa los modelos desde ESTE archivo.
// ─────────────────────────────────────────────────────────────────────────────

import { sequelize } from '../config/db.js';
import defineUser from './user.model.js';
import defineLanchero from './lanchero.model.js';
import defineZone from './zone.model.js';
import defineBoat from './boat.model.js';
import defineBoatAvailability from './boatAvailability.model.js';

// Cada archivo exporta una función; acá la ejecutamos pasándole la conexión.
const User = defineUser(sequelize);
const Lanchero = defineLanchero(sequelize);
const Zone = defineZone(sequelize);
const Boat = defineBoat(sequelize);
const BoatAvailability = defineBoatAvailability(sequelize);

// ── Relaciones ──
// hasOne  = "tiene uno":   un User tiene UN Lanchero (perfil).
// belongsTo = "pertenece a": el Lanchero guarda user_id, o sea pertenece a un User.
// Siempre se declaran en ambos sentidos para poder navegar en los dos.
// foreignKey = nombre del atributo (en JS) que guarda el ID del "padre".
User.hasOne(Lanchero, { foreignKey: 'userId', as: 'lanchero', onDelete: 'CASCADE' });
Lanchero.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// hasMany = "tiene muchos": un Lanchero puede tener varias lanchas.
Lanchero.hasMany(Boat, { foreignKey: 'lancheroId', as: 'boats' });
Boat.belongsTo(Lanchero, { foreignKey: 'lancheroId', as: 'lanchero' });

// belongsToMany = muchos a muchos, usando la tabla intermedia "boat_zones".
// through = tabla puente. otherKey = el ID "del otro lado" de la relación.
// timestamps:false porque boat_zones no tiene created_at/updated_at.
Boat.belongsToMany(Zone, {
  through: 'boat_zones', foreignKey: 'boatId', otherKey: 'zoneId', as: 'zones', timestamps: false,
});
Zone.belongsToMany(Boat, {
  through: 'boat_zones', foreignKey: 'zoneId', otherKey: 'boatId', as: 'boats', timestamps: false,
});

// Una lancha tiene VARIAS franjas horarias (lunes 08-12, lunes 14-18, martes...).
// as: 'availability' es el nombre con el que la pediremos en los include.
Boat.hasMany(BoatAvailability, { foreignKey: 'boatId', as: 'availability', onDelete: 'CASCADE' });
BoatAvailability.belongsTo(Boat, { foreignKey: 'boatId', as: 'boat' });

// Exportamos todo junto para importar así: import { Boat, Zone } from '../models/index.js'
export { sequelize, User, Lanchero, Zone, Boat, BoatAvailability };
