'use strict';

const express = require('express');
const router = express.Router();
const { all, get, run } = require('../db/database');

router.get('/', (req, res) => {
  const rows = all(`
    SELECT p.*, COUNT(i.id) AS total_insumos
    FROM proveedores p
    LEFT JOIN insumos i ON i.proveedor_id = p.id
    GROUP BY p.id
    ORDER BY p.nombre
  `);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = get('SELECT * FROM proveedores WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  row.insumos = all('SELECT * FROM insumos WHERE proveedor_id=?', [row.id]);
  res.json(row);
});

router.post('/', (req, res) => {
  const { nombre, contacto } = req.body;
  if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
  const r = run('INSERT INTO proveedores (nombre, contacto) VALUES (?,?)', [nombre, contacto || null]);
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { nombre, contacto } = req.body;
  run('UPDATE proveedores SET nombre=?, contacto=? WHERE id=?', [nombre, contacto || null, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM proveedores WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
