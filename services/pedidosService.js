'use strict';

const { get, all, run, transaction, getDb } = require('../db/database');
const { getStock, adjustStock } = require('./stockService');

/**
 * Detect insumos that need ordering:
 * - stock <= stock_minimo (low stock)
 * - stock < 0 (real deficit)
 */
function detectarFaltantes() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT i.id AS insumo_id, i.nombre, i.tipo, i.stock_minimo, i.proveedor_id,
           p.nombre AS proveedor_nombre,
           s.talle, s.stock
    FROM insumos i
    JOIN insumo_stock s ON s.insumo_id = i.id
    LEFT JOIN proveedores p ON p.id = i.proveedor_id
    WHERE COALESCE(s.stock,0) <= i.stock_minimo
    ORDER BY i.proveedor_id, i.nombre, s.talle
  `).all();

  return rows.map(r => ({
    ...r,
    sugerido: r.stock < 0
      ? r.stock_minimo + Math.abs(r.stock)
      : r.stock_minimo - r.stock + Math.ceil(r.stock_minimo * 0.2),
    tipo_alerta: r.stock < 0 ? 'faltante' : 'stock_bajo',
  }));
}

/**
 * Devuelve todos los insumos con su stock actual, agrupados por tipo.
 * Usado por el frontend para mostrar stock al armar un pedido.
 */
function getInsumosConStock() {
  const db = getDb();
  return db.prepare(`
    SELECT i.id AS insumo_id, i.nombre, i.tipo, i.color,
           i.stock_minimo, i.proveedor_id,
           p.nombre AS proveedor_nombre,
           s.talle, s.stock
    FROM insumos i
    JOIN insumo_stock s ON s.insumo_id = i.id
    LEFT JOIN proveedores p ON p.id = i.proveedor_id
    ORDER BY i.tipo, i.nombre, s.talle
  `).all();
}

/**
 * Create a pedido draft.
 * lineas = [{insumo_id, talle, cantidad}]
 */
function crearPedido(proveedor_id, lineas) {
  let pedidoId;
  transaction(() => {
    const r = run('INSERT INTO pedidos_proveedor (proveedor_id) VALUES (?)', [proveedor_id]);
    pedidoId = r.lastInsertRowid;
    for (const l of lineas) {
      run(
        'INSERT INTO detalle_pedido_proveedor (pedido_id, insumo_id, talle, cantidad) VALUES (?,?,?,?)',
        [pedidoId, l.insumo_id, l.talle || null, l.cantidad]
      );
    }
    const msg = generarMensajeWA(pedidoId);
    run('UPDATE pedidos_proveedor SET mensaje_whatsapp=? WHERE id=?', [msg, pedidoId]);
  });
  return pedidoId;
}

/**
 * Genera el mensaje de WhatsApp desglosado por talle (siempre).
 */
function generarMensajeWA(pedidoId) {
  const pedido = get(
    'SELECT pp.*, pr.nombre AS proveedor_nombre FROM pedidos_proveedor pp JOIN proveedores pr ON pr.id=pp.proveedor_id WHERE pp.id=?',
    [pedidoId]
  );
  const detalles = all(`
    SELECT d.*, i.nombre AS insumo_nombre, i.tipo
    FROM detalle_pedido_proveedor d
    JOIN insumos i ON i.id = d.insumo_id
    WHERE d.pedido_id = ?
    ORDER BY i.nombre, d.talle
  `, [pedidoId]);

  let msg = `Hola ${pedido.proveedor_nombre}, necesitamos los siguientes insumos:\n\n`;
  for (const d of detalles) {
    const talleStr = d.talle ? ` (talle ${d.talle})` : '';
    msg += `• ${d.insumo_nombre}${talleStr}: ${d.cantidad} unidades\n`;
  }
  msg += `\nFecha: ${new Date().toLocaleDateString('es-AR')}`;
  return msg;
}

function listarPedidos() {
  return all(`
    SELECT pp.*, pr.nombre AS proveedor_nombre,
           COUNT(d.id) AS lineas,
           SUM(d.cantidad) AS total_unidades
    FROM pedidos_proveedor pp
    JOIN proveedores pr ON pr.id = pp.proveedor_id
    LEFT JOIN detalle_pedido_proveedor d ON d.pedido_id = pp.id
    GROUP BY pp.id
    ORDER BY pp.created_at DESC
  `);
}

function getPedido(id) {
  const pedido = get(
    'SELECT pp.*, pr.nombre AS proveedor_nombre FROM pedidos_proveedor pp JOIN proveedores pr ON pr.id=pp.proveedor_id WHERE pp.id=?',
    [id]
  );
  if (!pedido) return null;
  pedido.detalles = all(`
    SELECT d.*, i.nombre AS insumo_nombre, i.tipo, i.color
    FROM detalle_pedido_proveedor d
    JOIN insumos i ON i.id = d.insumo_id
    WHERE d.pedido_id = ?
    ORDER BY i.nombre, d.talle
  `, [id]);
  return pedido;
}

/**
 * Actualizar estado del pedido.
 * Estados válidos: borrador → enviado → recibido | cancelado
 * Al marcar 'recibido' se suma stock automáticamente respetando talles.
 */
function actualizarEstado(id, estado) {
  if (!['borrador', 'enviado', 'recibido', 'cancelado'].includes(estado)) {
    throw new Error('Estado inválido');
  }
  if (estado === 'recibido') {
    recibirPedido(id);
  } else {
    run('UPDATE pedidos_proveedor SET estado=? WHERE id=?', [estado, id]);
  }
}

function recibirPedido(pedidoId) {
  const pedido = get('SELECT * FROM pedidos_proveedor WHERE id=?', [pedidoId]);
  if (!pedido) throw new Error('Pedido no encontrado');
  if (pedido.estado === 'recibido') throw new Error('El pedido ya fue recibido');
  if (pedido.estado === 'cancelado') throw new Error('No se puede recibir un pedido cancelado');

  const detalles = all('SELECT * FROM detalle_pedido_proveedor WHERE pedido_id=?', [pedidoId]);

  transaction(() => {
    for (const d of detalles) {
      // talle puede ser NULL (cierres, hebillas) o un valor (plantillas, fondos)
      adjustStock(d.insumo_id, d.talle || null, d.cantidad, 'ingreso_pedido', 'pedido', pedidoId);
    }
    run(
      `UPDATE pedidos_proveedor SET estado='recibido', recibido_at=datetime('now','localtime') WHERE id=?`,
      [pedidoId]
    );
  });
}

module.exports = {
  detectarFaltantes,
  getInsumosConStock,
  crearPedido,
  listarPedidos,
  getPedido,
  actualizarEstado,
  generarMensajeWA,
};
