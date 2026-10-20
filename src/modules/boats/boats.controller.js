// ─────────────────────────────────────────────────────────────────────────────
// src/modules/boats/boats.controller.js — La capa HTTP del portal de lanchas.
//
// Cada función: toma los datos ya validados (req.valid.*), llama al service con el ID del
// perfil del lanchero (req.lanchero.id, que dejó requireLanchero) y responde en JSON.
// ─────────────────────────────────────────────────────────────────────────────

import * as boats from './boats.service.js'; // "* as boats" = importa todas las funciones bajo un nombre

// GET /api/v1/me/boats
export async function list(req, res) {
  res.json({ data: await boats.listMyBoats(req.lanchero.id) });
}

// POST /api/v1/me/boats
export async function create(req, res) {
  const boat = await boats.createBoat(req.lanchero.id, req.valid.body);
  res.status(201).json({ data: boat }); // 201 = creado
}

// GET /api/v1/me/boats/:id
export async function get(req, res) {
  res.json({ data: await boats.getMyBoat(req.lanchero.id, req.valid.params.id) });
}

// PUT /api/v1/me/boats/:id
export async function update(req, res) {
  res.json({ data: await boats.updateMyBoat(req.lanchero.id, req.valid.params.id, req.valid.body) });
}

// PUT /api/v1/me/boats/:id/zones
export async function setZones(req, res) {
  res.json({ data: await boats.setMyBoatZones(req.lanchero.id, req.valid.params.id, req.valid.body.zoneIds) });
}

// PUT /api/v1/me/boats/:id/availability
export async function setAvailability(req, res) {
  res.json({ data: await boats.setMyBoatAvailability(req.lanchero.id, req.valid.params.id, req.valid.body.slots) });
}

// PATCH /api/v1/me/boats/:id/active
export async function setActive(req, res) {
  res.json({ data: await boats.setMyBoatActive(req.lanchero.id, req.valid.params.id, req.valid.body.isActive) });
}
