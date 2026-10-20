-- ─────────────────────────────────────────────────────────────────────────────
-- 002_users_login_security.sql
-- Agrega a "users" las columnas para proteger el login contra adivinadores de claves.
--
-- ¿Por qué una migración NUEVA y no editar la 001? Porque la 001 ya se aplicó en tu base
-- (y en la de cualquier otro). Las migraciones aplicadas NUNCA se modifican: se agregan
-- nuevas encima. Así todos los entornos llegan al mismo estado final.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  -- Cuántas contraseñas incorrectas seguidas lleva. SMALLINT = entero chico (alcanza de sobra).
  ADD COLUMN failed_logins  SMALLINT    NOT NULL DEFAULT 0,
  -- Si tiene fecha futura, la cuenta está bloqueada hasta ese momento. NULL = no bloqueada.
  ADD COLUMN locked_until   TIMESTAMPTZ,
  -- Cuándo inició sesión por última vez (útil para soporte y auditoría).
  ADD COLUMN last_login_at  TIMESTAMPTZ;
