'use strict';

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/insumos',     require('./routes/insumos'));
app.use('/api/productos',   require('./routes/productos'));
app.use('/api/ordenes',     require('./routes/ordenes'));
app.use('/api/pedidos',     require('./routes/pedidos'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/movimientos', require('./routes/movimientos'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🥾 Calzado Gestión corriendo en http://localhost:${PORT}`);
});
