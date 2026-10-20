-- ─────────────────────────────────────────────────────────────────────────────
-- 003_boat_availability.sql
-- Horarios en los que cada lancha dice estar disponible, por día de la semana.
--
-- Ejemplo: una lancha que trabaja de lunes a viernes de 08:00 a 18:00 tiene 5 filas
-- (una por día). Si trabaja "de corrido" un día pero con pausa al mediodía, tiene DOS
-- filas ese día (08:00-12:00 y 14:00-20:00).
--
-- REGLA DE NEGOCIO: una lancha SIN filas = sin restricción horaria (disponible siempre).
-- El buscador del admin (Día 7) la tratará así, y el admin igual confirma por WhatsApp.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE boat_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE CASCADE: si se borra la lancha, se borran sus horarios (no tienen sentido solos).
  boat_id      UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  -- Día de la semana: 0 = domingo, 1 = lunes ... 6 = sábado.
  -- Es la MISMA numeración que usa PostgreSQL en EXTRACT(DOW ...), así el buscador
  -- podrá comparar sin conversiones.
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  -- TIME = hora del día sin fecha ni zona (hora local de Buenos Aires).
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  -- La franja debe terminar DESPUÉS de empezar (no soportamos turnos que cruzan la
  -- medianoche en el MVP; se cargan como dos franjas: hasta 23:59 y desde 00:00).
  CONSTRAINT chk_availability_range CHECK (end_time > start_time)
);

-- Índice para encontrar rápido los horarios de una lancha en un día concreto.
CREATE INDEX idx_availability_boat_day ON boat_availability(boat_id, day_of_week);
