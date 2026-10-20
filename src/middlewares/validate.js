// ─────────────────────────────────────────────────────────────────────────────
// src/middlewares/validate.js — Valida un pedido con un esquema de Zod.
//
// Uso en una ruta:   router.post('/register', validate(registerSchema), controller)
//
// NUNCA confiamos en lo que manda el cliente: cualquiera puede mandar cualquier cosa
// con curl. Validar acá garantiza que el controller reciba datos con la forma correcta.
// Los datos ya limpios quedan en  req.valid.body  (o req.valid.query / req.valid.params).
// ─────────────────────────────────────────────────────────────────────────────

// validate(schema, source) es una función que DEVUELVE otra función (el middleware real).
// Esto se llama "fábrica de middlewares": nos deja personalizar cada uso con su esquema.
//   source = qué parte del pedido validar: 'body' (por defecto), 'query' o 'params'.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  // schema.parse(datos): si son válidos devuelve los datos LIMPIOS (recortados, convertidos
  // por las transformaciones del esquema); si no, lanza un ZodError. Ese error lo captura
  // Express y llega a errorHandler, que lo convierte en una respuesta 400.
  const clean = schema.parse(req[source]);

  // Guardamos el resultado en req.valid en vez de pisar req.body/req.query:
  // en Express 5 req.query es de solo lectura, y así tratamos las tres fuentes igual.
  req.valid = { ...req.valid, [source]: clean };
  next(); // todo bien: seguimos al controller
};
