// ─────────────────────────────────────────────────────────────────────────────
// src/modules/boats/boats.service.js — Reglas de negocio de las lanchas del lanchero.
//
// REGLA DE ORO DE SEGURIDAD de este archivo:
//   TODA consulta incluye `lancheroId` en el where. Así un lanchero solo puede ver y
//   modificar SUS lanchas, aunque adivine el ID de otra. (Se llama prevenir IDOR:
//   "Insecure Direct Object Reference", un fallo muy común en APIs.)
// Si la lancha existe pero es de otro, respondemos 404 igual que si no existiera:
// no revelamos que ese ID es real.
// ─────────────────────────────────────────────────────────────────────────────

import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize, Boat, Zone, BoatAvailability } from '../../models/index.js';
import { notFound, conflict, badRequest } from '../../utils/AppError.js';
import { slugify, withSuffix } from '../../utils/slug.js';

const MAX_BOATS_PER_LANCHERO = 5; // freno básico contra abusos

// Qué incluir al leer una lancha: sus zonas y sus horarios, ordenados.
const fullInclude = [
  {
    model: Zone,
    as: 'zones',
    attributes: ['id', 'name', 'slug'],
    through: { attributes: [] }, // no traer las columnas de la tabla puente boat_zones
  },
  { model: BoatAvailability, as: 'availability' },
];
const fullOrder = [
  [{ model: Zone, as: 'zones' }, 'sortOrder', 'ASC'],
  [{ model: BoatAvailability, as: 'availability' }, 'dayOfWeek', 'ASC'],
  [{ model: BoatAvailability, as: 'availability' }, 'startTime', 'ASC'],
];

// ───────── Convertir un modelo en la respuesta JSON (lista blanca de campos) ─────────
export const boatDTO = (boat) => ({
  id: boat.id,
  name: boat.name,
  slug: boat.slug,
  registrationNumber: boat.registrationNumber,
  capacity: boat.capacity,
  description: boat.description,
  yearBuilt: boat.yearBuilt,
  verificationStatus: boat.verificationStatus,
  verificationNote: boat.verificationNote,
  isActive: boat.isActive,
  // DECIMAL llega como texto ("4.85"); lo pasamos a número. Sin reseñas queda null.
  ratingAvg: boat.ratingAvg === null ? null : Number(boat.ratingAvg),
  ratingCount: boat.ratingCount,
  zones: (boat.zones ?? []).map((z) => ({ id: z.id, name: z.name, slug: z.slug })),
  availability: (boat.availability ?? []).map((a) => ({
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime.slice(0, 5), // "08:00:00" → "08:00"
    endTime: a.endTime.slice(0, 5),
  })),
});

// ───────── Buscar UNA lancha, verificando que sea del lanchero ─────────
async function findOwnedBoat(lancheroId, boatId, options = {}) {
  const boat = await Boat.findOne({ where: { id: boatId, lancheroId }, ...options });
  if (!boat) throw notFound('Lancha'); // no existe o es de otro: misma respuesta
  return boat;
}

// ───────── Listar mis lanchas ─────────
export async function listMyBoats(lancheroId) {
  const boats = await Boat.findAll({
    where: { lancheroId },
    include: fullInclude,
    order: [['createdAt', 'ASC'], ...fullOrder],
  });
  return boats.map(boatDTO);
}

// ───────── Ver una lancha ─────────
export async function getMyBoat(lancheroId, boatId) {
  const boat = await findOwnedBoat(lancheroId, boatId, { include: fullInclude, order: fullOrder });
  return boatDTO(boat);
}

// ───────── Crear ─────────
export async function createBoat(lancheroId, data) {
  const count = await Boat.count({ where: { lancheroId } });
  if (count >= MAX_BOATS_PER_LANCHERO) {
    throw conflict(`Podés cargar hasta ${MAX_BOATS_PER_LANCHERO} lanchas`);
  }

  // El slug debe ser único. Probamos "delfin-del-delta"; si ya existe, agregamos sufijo.
  let slug = slugify(data.name);
  if (await Boat.findOne({ where: { slug }, attributes: ['id'] })) slug = withSuffix(slug);

  try {
    // Pasamos los campos UNO POR UNO (no `...data`): así controlamos exactamente qué se guarda.
    // verificationStatus NO se toca: nace en 'DRAFT' por el valor por defecto del modelo.
    const boat = await Boat.create({
      lancheroId,
      slug,
      name: data.name,
      capacity: data.capacity,
      description: data.description,
      registrationNumber: data.registrationNumber,
      yearBuilt: data.yearBuilt,
    });
    return getMyBoat(lancheroId, boat.id);
  } catch (err) {
    // Dos pedidos simultáneos pudieron elegir el mismo slug: la restricción UNIQUE lo frena.
    if (err instanceof UniqueConstraintError) throw conflict('Probá de nuevo: ese nombre se usó recién');
    throw err;
  }
}

// ───────── Editar ─────────
// OJO: el slug NO cambia al editar el nombre. Las direcciones públicas ya compartidas
// (WhatsApp, redes) deben seguir funcionando.
export async function updateMyBoat(lancheroId, boatId, data) {
  const boat = await findOwnedBoat(lancheroId, boatId);

  await boat.update({
    name: data.name,
    capacity: data.capacity,
    // `?? null`: si el campo opcional no vino, lo VACIAMOS. PUT reemplaza todo el recurso.
    description: data.description ?? null,
    registrationNumber: data.registrationNumber ?? null,
    yearBuilt: data.yearBuilt ?? null,
  });
  return getMyBoat(lancheroId, boatId);
}

// ───────── Zonas que cubre (reemplaza la lista completa) ─────────
export async function setMyBoatZones(lancheroId, boatId, zoneIds) {
  const boat = await findOwnedBoat(lancheroId, boatId);

  // Comprobamos que TODAS las zonas existan y estén activas. Si pidió 3 y encontramos 2,
  // alguna no es válida.
  const zones = await Zone.findAll({ where: { id: { [Op.in]: zoneIds }, isActive: true } });
  if (zones.length !== zoneIds.length) throw badRequest('Alguna de las zonas no existe');

  // setZones (lo genera Sequelize por la relación muchos-a-muchos) deja EXACTAMENTE esa
  // lista: agrega las nuevas y quita las que sobran.
  await boat.setZones(zones);
  return getMyBoat(lancheroId, boatId);
}

// ───────── Horarios (reemplaza la lista completa) ─────────
export async function setMyBoatAvailability(lancheroId, boatId, slots) {
  await findOwnedBoat(lancheroId, boatId); // solo para verificar que es suya

  // TRANSACCIÓN: borrar las franjas viejas y crear las nuevas deben ocurrir JUNTAS.
  // Si falla la creación, no queremos que se pierdan las viejas.
  await sequelize.transaction(async (t) => {
    await BoatAvailability.destroy({ where: { boatId }, transaction: t });
    // bulkCreate = un solo INSERT con todas las filas (más eficiente que uno por uno).
    await BoatAvailability.bulkCreate(
      slots.map((s) => ({ boatId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })),
      { transaction: t },
    );
  });
  return getMyBoat(lancheroId, boatId);
}

// ───────── Pausar / activar ─────────
// Pausar NO afecta la verificación: la lancha deja de aparecer en búsquedas y vuelve cuando
// se reactiva.
export async function setMyBoatActive(lancheroId, boatId, isActive) {
  const boat = await findOwnedBoat(lancheroId, boatId);
  await boat.update({ isActive });
  return getMyBoat(lancheroId, boatId);
}
