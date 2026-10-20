// ─────────────────────────────────────────────────────────────────────────────
// scripts/migrate.js — Ejecuta las migraciones SQL pendientes.
// Uso:  npm run db:migrate
//
// Lógica: 1) crea una tabla "schema_migrations" que anota qué archivos ya corrieron.
//         2) lee db/migrations/*.sql en orden alfabético (001, 002...).
//         3) ejecuta solo los que faltan, cada uno dentro de una TRANSACCIÓN.
// ─────────────────────────────────────────────────────────────────────────────

import { readdir, readFile } from 'node:fs/promises'; // Leer carpetas/archivos (versión con promesas).
import path from 'node:path';                         // Armar rutas de archivo sin errores de "/" o "\".
import { fileURLToPath } from 'node:url';             // Convierte la URL del módulo en ruta de disco.
import { sequelize } from '../src/config/db.js';

// En ES Modules no existe __dirname (la carpeta de este archivo). Lo reconstruimos:
// import.meta.url = dirección de este archivo; dirname = su carpeta.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// path.join une partes: scripts/../db/migrations → db/migrations
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

// El SQL de una migración puede ser larguísimo; apagamos el log de Sequelize acá
// para ver solo nuestros mensajes ✅/⏭️.
sequelize.options.logging = false;

try {
  // 1) Tabla de control. IF NOT EXISTS = no falla si ya existe.
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  // 2) Preguntamos qué migraciones ya se aplicaron. query() devuelve [filas, metadata].
  const [rows] = await sequelize.query('SELECT name FROM schema_migrations');
  // Un Set es una lista sin repetidos y con búsqueda rápida: applied.has('001_...').
  const applied = new Set(rows.map((r) => r.name));

  // 3) Listamos los .sql y los ordenamos (por eso se numeran 001, 002...).
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭️  ya aplicada: ${file}`);
      continue; // salta a la siguiente
    }

    // Leemos el contenido del archivo SQL como texto UTF-8.
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

    // TRANSACCIÓN: o se aplica TODO el archivo + se anota, o no se aplica NADA.
    // Si el SQL falla a la mitad, la base vuelve a como estaba (rollback automático).
    await sequelize.transaction(async (t) => {
      await sequelize.query(sql, { transaction: t });
      await sequelize.query('INSERT INTO schema_migrations (name) VALUES (:name)', {
        replacements: { name: file }, // :name se reemplaza de forma SEGURA (evita inyección SQL).
        transaction: t,
      });
    });
    console.log(`✅ aplicada: ${file}`);
  }
} catch (err) {
  console.error('❌ Falló la migración:', err.message);
  process.exitCode = 1; // marca error sin cortar de golpe, para que el finally cierre la conexión
} finally {
  await sequelize.close(); // Cerramos el pool; si no, el proceso no termina nunca.
}
