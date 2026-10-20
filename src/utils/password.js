// ─────────────────────────────────────────────────────────────────────────────
// src/utils/password.js — Cómo guardamos y comprobamos contraseñas.
//
// REGLA DE ORO: jamás guardamos la contraseña. Guardamos un HASH: el resultado de
// pasarla por una función matemática de UN SOLO SENTIDO. De la contraseña sale el
// hash, pero del hash no se puede volver a la contraseña. Para comprobar un login,
// hasheamos lo que escribió la persona y comparamos con el hash guardado.
//
// Usamos ARGON2id: está diseñado para ser LENTO y consumir memoria a propósito, así
// que probar millones de contraseñas (fuerza bruta) con un hash robado sale carísimo.
// Además mete una "sal" aleatoria: dos personas con la misma contraseña tienen hashes
// distintos.
// ─────────────────────────────────────────────────────────────────────────────

import argon2 from 'argon2'; // librería con el algoritmo Argon2 (argon2id por defecto).

// Convierte una contraseña en su hash. Devuelve un texto como:
//   $argon2id$v=19$m=65536,t=3,p=4$<sal>$<hash>
// Ese texto ya incluye el algoritmo, sus parámetros y la sal: con eso alcanza para verificar.
export const hashPassword = (plain) => argon2.hash(plain);

// Comprueba si una contraseña coincide con un hash. Devuelve true o false.
// OJO con el orden de los argumentos de argon2: primero el HASH, después la contraseña.
export const verifyPassword = (hash, plain) => argon2.verify(hash, plain);

// Hash "de mentira" que se calcula una vez al arrancar. Lo usa el login cuando el
// email NO existe: así igual hacemos el trabajo de verificar y tardamos lo mismo que
// con un email real. Sin esto, alguien podría medir los tiempos de respuesta y descubrir
// qué emails están registrados (ataque de "enumeración por tiempo").
// "await" a nivel de módulo (top-level await) está permitido en ES Modules.
export const DUMMY_HASH = await argon2.hash('contraseña-falsa-para-igualar-tiempos');
