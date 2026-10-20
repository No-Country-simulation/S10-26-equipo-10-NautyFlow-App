// ─────────────────────────────────────────────────────────────────────────────
// tests/models.test.js — Prueba que los modelos y sus relaciones funcionan.
// Es un test de APRENDIZAJE: te muestra cómo se crean y se consultan los datos.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, afterAll } from 'vitest';
import { sequelize, User, Lanchero, Boat, Zone } from '../src/models/index.js';

afterAll(async () => {
  await sequelize.close();
});

describe('Modelos y relaciones', () => {
  it('crea usuario → lanchero → lancha → zonas y las lee con include', async () => {
    // Una transacción que NUNCA confirmamos (rollback al final): el test usa la base
    // de verdad pero no deja datos sucios. Es una técnica muy útil.
    const t = await sequelize.transaction();
    try {
      const user = await User.create(
        { email: 'Carlos@Test.com', passwordHash: 'hash-de-prueba' },
        { transaction: t },
      );
      const lanchero = await Lanchero.create(
        { userId: user.id, fullName: 'Carlos Pérez', phone: '5491155551234', consentDataAt: new Date() },
        { transaction: t },
      );
      const boat = await Boat.create(
        { lancheroId: lanchero.id, name: 'Delfín del Delta', slug: 'delfin-del-delta', capacity: 8 },
        { transaction: t },
      );

      // setZones (método que Sequelize genera por el belongsToMany) llena la tabla boat_zones.
      const zones = await Zone.findAll({ where: { slug: ['primera-seccion', 'canal-arias'] }, transaction: t });
      await boat.setZones(zones, { transaction: t });

      // include = JOIN: traemos la lancha con su lanchero y sus zonas en una consulta.
      const found = await Boat.findByPk(boat.id, {
        include: [
          { model: Lanchero, as: 'lanchero' },
          { model: Zone, as: 'zones', attributes: ['slug'] },
        ],
        transaction: t,
      });

      expect(found.verificationStatus).toBe('DRAFT');     // valor por defecto
      expect(found.lanchero.fullName).toBe('Carlos Pérez');
      expect(found.zones.map((z) => z.slug).sort()).toEqual(['canal-arias', 'primera-seccion']);
      expect(user.email).toBe('Carlos@Test.com');          // citext conserva lo escrito...
      expect(user.passwordHash).toBe('hash-de-prueba');    // (en create sí vemos el hash)

      // ...pero al consultar por defecto el hash NO viene (defaultScope):
      const reloaded = await User.findByPk(user.id, { transaction: t });
      expect(reloaded.passwordHash).toBeUndefined();
    } finally {
      await t.rollback(); // deshace TODO lo que hizo el test
    }
  });

  it('la base rechaza una capacidad fuera de rango', async () => {
    // validate (en el modelo) corta antes de llegar a la base, con un mensaje claro.
    await expect(
      Boat.build({ lancheroId: crypto.randomUUID(), name: 'X lancha', slug: 'x', capacity: 99 }).validate(),
    ).rejects.toThrow(/capacity/i);
  });

  it('el email no distingue mayúsculas (citext): no permite duplicados', async () => {
    const t = await sequelize.transaction();
    try {
      await User.create({ email: 'dup@test.com', passwordHash: 'x' }, { transaction: t });
      // Segundo intento con otras mayúsculas: debe fallar por UNIQUE.
      await expect(
        User.create({ email: 'DUP@TEST.COM', passwordHash: 'y' }, { transaction: t }),
      ).rejects.toThrow();
    } finally {
      await t.rollback();
    }
  });
});
