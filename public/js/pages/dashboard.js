// ============================================================
// pages/dashboard.js
// ============================================================

async function renderDashboard() {
  setPageTitle('Dashboard');
  setTopbarActions(`<button class="btn btn-sm" onclick="renderDashboard()">↻ Actualizar</button>`);
  loading();

  const data = await API.dashboard();

  const { totales, stock_bajo, faltantes, ordenes_recientes, pedidos_pendientes } = data;

  const html = `
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num">${totales.insumos}</div>
        <div class="stat-label">Insumos</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totales.productos}</div>
        <div class="stat-label">Productos</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totales.proveedores}</div>
        <div class="stat-label">Proveedores</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${totales.ordenes_borrador}</div>
        <div class="stat-label">Órdenes borrador</div>
      </div>
      <div class="stat-card">
        <div class="stat-num text-gold">${stock_bajo.length}</div>
        <div class="stat-label">Stock bajo</div>
      </div>
      <div class="stat-card">
        <div class="stat-num text-red">${faltantes.length}</div>
        <div class="stat-label">Faltantes</div>
      </div>
    </div>

    <!-- Quick stock movement -->
    <div class="card mb-16">
      <div class="card-title">⚡ Movimiento Rápido de Stock</div>
      <div class="quick-stock-panel" id="quickStockPanel">
        Cargando insumos...
      </div>
    </div>

    <div class="two-col">
      <!-- Faltantes -->
      <div class="card">
        <div class="card-title">🔴 Insumos Faltantes</div>
        ${faltantes.length === 0
          ? emptyState('Sin faltantes')
          : faltantes.map(a => `
            <div class="alert-row">
              <div class="alert-dot alert-dot-red"></div>
              <div style="flex:1">
                <strong>${escHtml(a.nombre)}</strong>
                ${a.talle ? `<span class="text-muted"> T${a.talle}</span>` : ''}
                <span class="text-muted text-small"> — Prov: ${escHtml(a.proveedor_nombre || '—')}</span>
              </div>
              <span class="text-red bold">${a.stock}</span>
            </div>
          `).join('')
        }
      </div>

      <!-- Stock bajo -->
      <div class="card">
        <div class="card-title">🟡 Stock Bajo</div>
        ${stock_bajo.length === 0
          ? emptyState('Todo en orden')
          : stock_bajo.map(a => `
            <div class="alert-row">
              <div class="alert-dot alert-dot-gold"></div>
              <div style="flex:1">
                <strong>${escHtml(a.nombre)}</strong>
                ${a.talle ? `<span class="text-muted"> T${a.talle}</span>` : ''}
              </div>
              <span class="text-gold bold">${a.stock} / ${a.stock_minimo}</span>
            </div>
          `).join('')
        }
      </div>
    </div>

    <div class="two-col">
      <!-- Órdenes recientes -->
      <div class="card">
        <div class="section-header">
          <div class="card-title">Órdenes Recientes</div>
          <button class="btn btn-sm btn-primary" onclick="router.go('ordenes')">Ver todas</button>
        </div>
        ${ordenes_recientes.length === 0
          ? emptyState('Sin órdenes')
          : `<div class="table-wrap"><table>
            <thead><tr><th>#</th><th>Descripción</th><th>Estado</th><th>Pares</th><th>Fecha</th></tr></thead>
            <tbody>
              ${ordenes_recientes.map(o => `
                <tr style="cursor:pointer" onclick="router.go('ordenes','${o.id}')">
                  <td class="text-muted">#${o.id}</td>
                  <td>${escHtml(o.descripcion || '—')}</td>
                  <td>${estadoBadge(o.estado)}</td>
                  <td>${o.total_pares || 0}</td>
                  <td class="text-muted">${formatDate(o.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>`
        }
      </div>

      <!-- Pedidos pendientes -->
      <div class="card">
        <div class="section-header">
          <div class="card-title">Pedidos Pendientes</div>
          <button class="btn btn-sm btn-primary" onclick="router.go('pedidos')">Ver todos</button>
        </div>
        ${pedidos_pendientes.length === 0
          ? emptyState('Sin pedidos pendientes')
          : `<div class="table-wrap"><table>
            <thead><tr><th>#</th><th>Proveedor</th><th>Estado</th><th>Fecha</th></tr></thead>
            <tbody>
              ${pedidos_pendientes.map(p => `
                <tr style="cursor:pointer" onclick="router.go('pedidos','${p.id}')">
                  <td class="text-muted">#${p.id}</td>
                  <td>${escHtml(p.proveedor_nombre)}</td>
                  <td>${estadoBadge(p.estado)}</td>
                  <td class="text-muted">${formatDate(p.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>`
        }
      </div>
    </div>
  `;

  document.getElementById('pageBody').innerHTML = html;
  await renderQuickStock();
}

async function renderQuickStock() {
  const panel = document.getElementById('quickStockPanel');
  if (!panel) return;
  const insumos = await API.insumos.list();

  panel.innerHTML = `
    <div class="quick-stock-controls">
      <div class="form-group" style="min-width:200px;margin:0">
        <label class="form-label">Insumo</label>
        <select class="form-select" id="qsInsumo" onchange="onQsInsumoChange()">
          <option value="">— Seleccionar —</option>
          ${insumos.map(i => `<option value="${i.id}" data-tipo="${i.tipo}">${escHtml(i.nombre)}</option>`).join('')}
        </select>
      </div>
      <div id="qsTalleWrap" style="display:none;min-width:100px">
        <label class="form-label">Talle</label>
        <select class="form-select" id="qsTalle">
          ${TALLES_CALZADO.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
      <div style="min-width:100px">
        <label class="form-label">Cantidad</label>
        <input class="form-input" type="number" id="qsCantidad" value="1" min="1" />
      </div>
      <div>
        <label class="form-label">Tipo</label>
        <select class="form-select" id="qsTipo">
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
          <option value="ajuste">Ajuste</option>
        </select>
      </div>
      <div style="padding-top:20px">
        <button class="btn btn-primary" onclick="doQuickStock()">Registrar</button>
      </div>
    </div>
  `;
}

function onQsInsumoChange() {
  const sel = document.getElementById('qsInsumo');
  const opt = sel.selectedOptions[0];
  const tipo = opt ? opt.dataset.tipo : '';
  const wrap = document.getElementById('qsTalleWrap');
  wrap.style.display = (tipo === 'plantilla' || tipo === 'fondo') ? 'block' : 'none';
}

async function doQuickStock() {
  const insumo_id = document.getElementById('qsInsumo').value;
  const cantidad = parseInt(document.getElementById('qsCantidad').value);
  const tipo = document.getElementById('qsTipo').value;
  const talleEl = document.getElementById('qsTalle');
  const talleWrap = document.getElementById('qsTalleWrap');
  const talle = talleWrap.style.display !== 'none' ? talleEl.value : null;

  if (!insumo_id || !cantidad) { toast('Completar todos los campos', 'error'); return; }

  try {
    await API.movimientos.rapido({ insumo_id: Number(insumo_id), talle, cantidad, tipo });
    toast('Movimiento registrado', 'success');
    renderDashboard();
  } catch (e) {
    toast(e.message, 'error');
  }
}
