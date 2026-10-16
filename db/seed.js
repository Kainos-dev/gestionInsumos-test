'use strict';

const { getDb, transaction } = require('./database');

function seed() {
  const db = getDb();

  // Clear in reverse FK order
  db.exec(`
    DELETE FROM movimientos_stock;
    DELETE FROM detalle_pedido_proveedor;
    DELETE FROM pedidos_proveedor;
    DELETE FROM detalle_orden;
    DELETE FROM ordenes_produccion;
    DELETE FROM producto_accesorios;
    DELETE FROM producto_talles;
    DELETE FROM productos;
    DELETE FROM insumo_stock;
    DELETE FROM insumos;
    DELETE FROM proveedores;
  `);

  transaction(() => {
    // --- PROVEEDORES ---
    const provs = [
      { nombre: 'Distribuidora El Cuero', contacto: '+54 11 4555-1234' },
      { nombre: 'Materiales Ortiz', contacto: '+54 11 4888-5678' },
      { nombre: 'Cierres y Accesorios SA', contacto: '+54 11 4777-9012' },
    ];
    const provIds = {};
    for (const p of provs) {
      const r = db.prepare('INSERT INTO proveedores (nombre, contacto) VALUES (?, ?)').run(p.nombre, p.contacto);
      provIds[p.nombre] = r.lastInsertRowid;
    }

    const pCuero = provIds['Distribuidora El Cuero'];
    const pOrtiz = provIds['Materiales Ortiz'];
    const pCierres = provIds['Cierres y Accesorios SA'];

    // --- INSUMOS ---
    const insumos = [
      { nombre: 'Plantilla Standard', tipo: 'plantilla', color: null, stock_minimo: 30, proveedor_id: pCuero },
      { nombre: 'Plantilla Sport', tipo: 'plantilla', color: null, stock_minimo: 20, proveedor_id: pCuero },
      { nombre: 'Plantilla Cuero Premium', tipo: 'plantilla', color: 'marrón', stock_minimo: 15, proveedor_id: pCuero },
      { nombre: 'Fondo Goma Negro', tipo: 'fondo', color: 'negro', stock_minimo: 25, proveedor_id: pOrtiz },
      { nombre: 'Fondo Eva Blanco', tipo: 'fondo', color: 'blanco', stock_minimo: 20, proveedor_id: pOrtiz },
      { nombre: 'Fondo Goma Marrón', tipo: 'fondo', color: 'marrón', stock_minimo: 15, proveedor_id: pOrtiz },
      { nombre: 'Cierre Plástico Marrón 20cm', tipo: 'cierre', color: 'marrón', stock_minimo: 50, proveedor_id: pCierres },
      { nombre: 'Cierre Plástico Marrón 30cm', tipo: 'cierre', color: 'marrón', stock_minimo: 40, proveedor_id: pCierres },
      { nombre: 'Cierre Metal Negro 25cm', tipo: 'cierre', color: 'negro', stock_minimo: 30, proveedor_id: pCierres },
      { nombre: 'Hebilla Dorada Simple', tipo: 'hebilla', color: 'dorado', stock_minimo: 60, proveedor_id: pCierres },
      { nombre: 'Hebilla Plateada Doble', tipo: 'hebilla', color: 'plateado', stock_minimo: 40, proveedor_id: pCierres },
    ];

    const insumoIds = {};
    for (const ins of insumos) {
      const r = db.prepare(
        'INSERT INTO insumos (nombre, tipo, color, stock_minimo, proveedor_id) VALUES (?,?,?,?,?)'
      ).run(ins.nombre, ins.tipo, ins.color, ins.stock_minimo, ins.proveedor_id);
      insumoIds[ins.nombre] = r.lastInsertRowid;
    }

    // --- INSUMO_STOCK ---
    const talles = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
    const plantillaFondoInsumos = [
      'Plantilla Standard', 'Plantilla Sport', 'Plantilla Cuero Premium',
      'Fondo Goma Negro', 'Fondo Eva Blanco', 'Fondo Goma Marrón'
    ];

    const stockData = {
      'Plantilla Standard':     [12, 25, 30, 40, 38, 32, 28, 20, 15, 10, 5, 3],
      'Plantilla Sport':        [8,  18, 22, 28, 30, 25, 20, 15, 10, 8,  4, 2],
      'Plantilla Cuero Premium':[5,  10, 15, 18, 20, 18, 14, 10, 7,  5,  2, 0],
      'Fondo Goma Negro':       [10, 20, 28, 35, 35, 30, 25, 18, 12, 8,  4, 2],
      'Fondo Eva Blanco':       [8,  15, 20, 30, 32, 28, 22, 16, 10, 6,  3, 1],
      'Fondo Goma Marrón':      [4,  10, 14, 18, 20, 16, 12, 8,  5,  3,  1, 0],
    };

    for (const nombre of plantillaFondoInsumos) {
      const id = insumoIds[nombre];
      const stocks = stockData[nombre];
      for (let i = 0; i < talles.length; i++) {
        db.prepare('INSERT INTO insumo_stock (insumo_id, talle, stock) VALUES (?,?,?)').run(id, talles[i], stocks[i]);
      }
    }

    // Cierres y hebillas — stock general (talle null)
    const generalStock = {
      'Cierre Plástico Marrón 20cm': 45,
      'Cierre Plástico Marrón 30cm': 38,
      'Cierre Metal Negro 25cm': 22,
      'Hebilla Dorada Simple': 55,
      'Hebilla Plateada Doble': 30,
    };
    for (const [nombre, stock] of Object.entries(generalStock)) {
      db.prepare('INSERT INTO insumo_stock (insumo_id, talle, stock) VALUES (?,NULL,?)').run(insumoIds[nombre], stock);
    }

    // --- PRODUCTOS ---
    const productos = [
      {
        nombre: 'Bota Clásica',
        plantilla: 'Plantilla Cuero Premium',
        fondo: 'Fondo Goma Marrón',
        talles: ['36','37','38','39','40','41','42'],
        accesorios: [
          { insumo: 'Cierre Plástico Marrón 30cm', cantidad_por_par: 2 },
        ],
      },
      {
        nombre: 'Zapatilla Sport',
        plantilla: 'Plantilla Sport',
        fondo: 'Fondo Eva Blanco',
        talles: ['36','37','38','39','40','41','42','43','44'],
        accesorios: [],
      },
      {
        nombre: 'Zapato Standard',
        plantilla: 'Plantilla Standard',
        fondo: 'Fondo Goma Negro',
        talles: ['35','36','37','38','39','40','41','42','43','44'],
        accesorios: [
          { insumo: 'Hebilla Dorada Simple', cantidad_por_par: 2 },
        ],
      },
      {
        nombre: 'Sandalia Verano',
        plantilla: 'Plantilla Standard',
        fondo: 'Fondo Eva Blanco',
        talles: ['35','36','37','38','39','40','41'],
        accesorios: [
          { insumo: 'Hebilla Plateada Doble', cantidad_por_par: 4 },
        ],
      },
    ];

    for (const prod of productos) {
      const r = db.prepare(
        'INSERT INTO productos (nombre, plantilla_id, fondo_id) VALUES (?,?,?)'
      ).run(prod.nombre, insumoIds[prod.plantilla], insumoIds[prod.fondo]);
      const prodId = r.lastInsertRowid;

      for (const t of prod.talles) {
        db.prepare('INSERT INTO producto_talles (producto_id, talle) VALUES (?,?)').run(prodId, t);
      }
      for (const acc of prod.accesorios) {
        db.prepare(
          'INSERT INTO producto_accesorios (producto_id, insumo_id, cantidad_por_par) VALUES (?,?,?)'
        ).run(prodId, insumoIds[acc.insumo], acc.cantidad_por_par);
      }
    }
  });

  console.log('✅ Seed completado correctamente.');
}

seed();
