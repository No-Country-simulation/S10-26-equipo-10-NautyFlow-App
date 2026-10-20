-- ─────────────────────────────────────────────────────────────────────────────
-- 001_users_lancheros_zones_boats.sql
-- Primera migración: crea las tablas base del sistema.
--
-- ¿Qué es una migración? Un archivo SQL que cambia la estructura de la base de
-- forma ordenada y repetible. Se ejecutan en orden (001, 002, ...) y el script
-- scripts/migrate.js anota cuáles ya corrieron para no repetirlas.
-- ─────────────────────────────────────────────────────────────────────────────

-- Las "extensiones" agregan funciones a PostgreSQL.
-- pgcrypto → nos da gen_random_uuid() para generar IDs únicos.
-- citext   → tipo de texto que ignora mayúsculas/minúsculas (ideal para emails).
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Un tipo ENUM limita una columna a una lista cerrada de valores.
-- Así la base misma impide guardar un rol inventado como 'SUPERMAN'.
CREATE TYPE user_role AS ENUM ('ADMIN', 'LANCHERO');

-- Estados por los que pasa una lancha en el proceso de verificación (ver AppFlow §2).
CREATE TYPE verification_status AS ENUM
  ('DRAFT', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- ───────── users: quién puede iniciar sesión ─────────
CREATE TABLE users (
  -- PRIMARY KEY = identifica de forma única cada fila. UUID = ID largo aleatorio,
  -- más seguro que 1,2,3... porque no se puede adivinar el siguiente.
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE = no puede haber dos usuarios con el mismo email. NOT NULL = obligatorio.
  email          CITEXT NOT NULL UNIQUE,
  -- Guardamos el HASH de la contraseña (huella irreversible), JAMÁS la contraseña.
  password_hash  TEXT NOT NULL,
  role           user_role NOT NULL DEFAULT 'LANCHERO',
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  -- TIMESTAMPTZ = fecha y hora CON zona horaria. now() = el momento actual.
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────── lancheros: datos del conductor (1 a 1 con users) ─────────
CREATE TABLE lancheros (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- REFERENCES = clave foránea: user_id debe existir en users(id).
  -- UNIQUE hace que cada usuario tenga como máximo UN perfil de lanchero.
  -- ON DELETE CASCADE: si se borra el usuario, se borra su perfil también.
  user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name        VARCHAR(120) NOT NULL,
  -- Teléfono en formato internacional sin "+": 5491155551234 (para armar links wa.me).
  phone            VARCHAR(20) NOT NULL,
  -- Cuándo aceptó el tratamiento de datos (Ley 25.326). Obligatorio.
  consent_data_at  TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- CHECK = regla que cada fila debe cumplir. "~" es búsqueda por expresión regular:
  -- aquí exige entre 10 y 15 dígitos, nada más.
  CONSTRAINT chk_lanchero_phone CHECK (phone ~ '^[0-9]{10,15}$')
);

-- ───────── zones: catálogo de zonas del Delta ─────────
CREATE TABLE zones (
  -- SMALLSERIAL = número entero chico que se autoincrementa (1, 2, 3...).
  id          SMALLSERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  -- slug = versión "amigable para URL" del nombre: 'primera-seccion'.
  slug        VARCHAR(80) NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  -- Para ordenar las zonas en los desplegables como quiere la agencia.
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

-- ───────── boats: las embarcaciones ─────────
CREATE TABLE boats (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE RESTRICT: NO deja borrar un lanchero que todavía tiene lanchas.
  lanchero_id          UUID NOT NULL REFERENCES lancheros(id) ON DELETE RESTRICT,
  name                 VARCHAR(80) NOT NULL,
  slug                 VARCHAR(100) NOT NULL UNIQUE,
  registration_number  VARCHAR(40),           -- matrícula (puede faltar al inicio)
  -- Capacidad entre 1 y 60 pasajeros; la base rechaza cualquier otro número.
  capacity             SMALLINT NOT NULL CHECK (capacity BETWEEN 1 AND 60),
  description          TEXT,
  year_built           SMALLINT CHECK (year_built BETWEEN 1950 AND 2100),
  verification_status  verification_status NOT NULL DEFAULT 'DRAFT',
  verification_note    TEXT,                  -- motivo de rechazo o suspensión
  verified_at          TIMESTAMPTZ,
  -- El lanchero puede "pausar" su lancha sin perder la verificación.
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  -- Reputación desnormalizada: la guardamos acá para que la landing y el buscador
  -- sean rápidos. NULL significa "todavía sin reseñas". NUMERIC(3,2) = ej. 4.85
  rating_avg           NUMERIC(3,2),
  rating_count         INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un ÍNDICE acelera las búsquedas, como el índice de un libro.
CREATE INDEX idx_boats_lanchero ON boats(lanchero_id);

-- Índice PARCIAL: solo incluye las lanchas verificadas y activas, que son las únicas
-- que buscamos en el buscador y la landing. Es más chico y más rápido.
CREATE INDEX idx_boats_searchable ON boats(capacity, rating_avg DESC NULLS LAST)
  WHERE verification_status = 'VERIFIED' AND is_active = TRUE;

-- ───────── boat_zones: relación muchos a muchos (lancha ↔ zona) ─────────
-- Una lancha cubre varias zonas y una zona la cubren varias lanchas.
-- Se resuelve con una tabla intermedia que une los dos IDs.
CREATE TABLE boat_zones (
  boat_id  UUID     NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  zone_id  SMALLINT NOT NULL REFERENCES zones(id),
  -- Clave primaria COMPUESTA: la pareja (boat_id, zone_id) no puede repetirse.
  PRIMARY KEY (boat_id, zone_id)
);
CREATE INDEX idx_boat_zones_zone ON boat_zones(zone_id);

-- ───────── Datos iniciales (semilla) ─────────
-- Zonas de ejemplo; la agencia las ajustará (pregunta abierta #1 del PRD).
INSERT INTO zones (name, slug, sort_order) VALUES
  ('Primera Sección', 'primera-seccion', 1),
  ('Segunda Sección', 'segunda-seccion', 2),
  ('Tercera Sección', 'tercera-seccion', 3),
  ('Canal Arias',     'canal-arias',     4),
  ('Río Luján',       'rio-lujan',       5),
  ('Tigre Centro',    'tigre-centro',    6),
  ('San Fernando',    'san-fernando',    7);
