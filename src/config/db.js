// ─────────────────────────────────────────────────────────────────────────────
// src/config/db.js — Crea la conexión a PostgreSQL con Sequelize.
//
// Sequelize es un ORM (Object-Relational Mapper): te deja trabajar con la base
// usando objetos JavaScript (User.findAll()) en vez de escribir SQL a mano.
// Aquí creamos UNA instancia (`sequelize`) que toda la app comparte.
// ─────────────────────────────────────────────────────────────────────────────

import { Sequelize } from 'sequelize'; // La clase principal de la librería.
import { env } from './env.js';        // Nuestras variables ya validadas.

// "new Sequelize(url, opciones)" abre un POOL de conexiones (varias conexiones
// reutilizables, para no abrir una nueva por cada consulta).
export const sequelize = new Sequelize(env.DATABASE_URL, {
  dialect: 'postgres', // Le decimos qué motor usamos (usa el paquete "pg" por debajo).

  // logging decide si Sequelize imprime cada SQL que ejecuta.
  // Es MUY útil para aprender: ves el SQL real. Lo apagamos en test y producción.
  // Un truco: usamos `false` o una función; `console.log` imprime cada consulta.
  logging: env.NODE_ENV === 'development' ? console.log : false,

  // "define" son opciones por defecto para TODOS los modelos:
  define: {
    underscored: true, // En JS escribimos createdAt, en la base la columna es created_at.
    timestamps: true,  // Agrega y mantiene solos created_at y updated_at.
  },

  // En Render, si te conectás desde fuera de su red, la base exige SSL (conexión cifrada).
  // `...(condición ? {a} : {})` es un truco para agregar una propiedad solo si se cumple.
  ...(env.NODE_ENV === 'production'
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {}),
});
