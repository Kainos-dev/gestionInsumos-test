'use strict';

const express = require('express');
const router = express.Router();
const { all, get, run, transaction } = require('../db/database');

router.get('/', (req, res) => {
  const rows = all(`
    SELECT p.*, i1.nombre AS plantilla_nombre, i2.nombre AS fondo_nombre
    FROM productos p
    JOIN insumos i1 ON i1.id=p.plantilla_id
    JOIN insumos i2 ON i2.id=p.fondo_id
    ORDER BY p.nombre
  `);
  for (const row of rows) {
    row.talles = all('SELECT talle FROM producto_talles WHERE producto_id=? ORDER BY talle', [row.id]).map(r => r.talle);
    row.accesorios = all(`
      SELECT pa.*, i.nombre AS insumo_nombre, i.tipo
      FROM producto_accesorios pa
      JOIN insumos i ON i.id=pa.insumo_id
      WHERE pa.producto_id=?
    `, [row.id]);
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = get(`
    SELECT p.*, i1.nombre AS plantilla_nombre, i2.nombre AS fondo_nombre
    FROM productos p
    JOIN insumos i1 ON i1.id=p.plantilla_id
    JOIN insumos i2 ON i2.id=p.fondo_id
    WHERE p.id=?
  `, [req.params.id]);
  if (!row) return res.status(404).json({ error: 'No encontrado' });
  row.talles = all('SELECT talle FROM producto_talles WHERE producto_id=? ORDER BY talle', [row.id]).map(r => r.talle);
  row.accesorios = all(`
    SELECT pa.*, i.nombre AS insumo_nombre, i.tipo
    FROM producto_accesorios pa
    JOIN insumos i ON i.id=pa.insumo_id
    WHERE pa.producto_id=?
  `, [row.id]);
  res.json(row);
});

router.post('/', (req, res) => {
  const { nombre, plantilla_id, fondo_id, talles, accesorios } = req.body;
  if (!nombre || !plantilla_id || !fondo_id) {
    return res.status(400).json({ error: 'nombre, plantilla_id y fondo_id son requeridos' });
  }
  let newId;
  transaction(() => {
    const r = run(
      'INSERT INTO productos (nombre, plantilla_id, fondo_id) VALUES (?,?,?)',
      [nombre, plantilla_id, fondo_id]
    );
    newId = r.lastInsertRowid;
    if (talles && Array.isArray(talles)) {
      for (const t of talles) {
        run('INSERT OR IGNORE INTO producto_talles (producto_id, talle) VALUES (?,?)', [newId, t]);
      }
    }
    if (accesorios && Array.isArray(accesorios)) {
      for (const acc of accesorios) {
        run(
          'INSERT OR REPLACE INTO producto_accesorios (producto_id, insumo_id, cantidad_por_par) VALUES (?,?,?)',
          [newId, acc.insumo_id, acc.cantidad_por_par || 1]
        );
      }
    }
  });
  res.json({ id: newId });
});

router.put('/:id', (req, res) => {
  const { nombre, plantilla_id, fondo_id, talles, accesorios } = req.body;
  transaction(() => {
    run('UPDATE productos SET nombre=?, plantilla_id=?, fondo_id=? WHERE id=?',
      [nombre, plantilla_id, fondo_id, req.params.id]);
    run('DELETE FROM producto_talles WHERE producto_id=?', [req.params.id]);
    run('DELETE FROM producto_accesorios WHERE producto_id=?', [req.params.id]);
    if (talles && Array.isArray(talles)) {
      for (const t of talles) {
        run('INSERT OR IGNORE INTO producto_talles (producto_id, talle) VALUES (?,?)', [req.params.id, t]);
      }
    }
    if (accesorios && Array.isArray(accesorios)) {
      for (const acc of accesorios) {
        run(
          'INSERT OR REPLACE INTO producto_accesorios (producto_id, insumo_id, cantidad_por_par) VALUES (?,?,?)',
          [req.params.id, acc.insumo_id, acc.cantidad_por_par || 1]
        );
      }
    }
  });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM productos WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
