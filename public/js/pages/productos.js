// ============================================================
// pages/productos.js
// Fixes:
// - Selector de fondo muestra "Nombre (Color)" en todos los lugares
// ============================================================

let _productos = [];
let _insumosCache = [];

// Helper: label para fondo con color
function fondoLabel(insumo) {
  if (insumo.color) return `${insumo.nombre} (${insumo.color})`;
  return insumo.nombre;
}

async function renderProductos(subId) {
  setPageTitle('Productos');
  setTopbarActions(`<button class="btn btn-primary" onclick="modalCrearProducto()">+ Nuevo Producto</button>`);
  loading();

  [_productos, _insumosCache] = await Promise.all([API.productos.list(), API.insumos.list()]);

  if (!_productos.length) {
    document.getElementById('pageBody').innerHTML = `<div class="card">${emptyState('Sin productos creados')}</div>`;
    return;
  }

  const html = `<div class="card"><div class="table-wrap"><table>
    <thead><tr>
      <th>Nombre</th><th>Plantilla</th><th>Fondo</th><th>Talles</th><th>Accesorios</th><th>Acciones</th>
    </tr></thead>
    <tbody>
      ${_productos.map(p => {
        // Buscar el insumo de fondo para mostrar color
        const fondoInsumo = _insumosCache.find(i => i.id === p.fondo_id);
        const fondoDisplay = fondoInsumo ? fondoLabel(fondoInsumo) : p.fondo_nombre;
        return `
        <tr>
          <td><strong>${escHtml(p.nombre)}</strong></td>
          <td><span class="badge badge-blue">${escHtml(p.plantilla_nombre)}</span></td>
          <td><span class="badge badge-gold">${escHtml(fondoDisplay)}</span></td>
          <td style="max-width:200px;word-break:break-word">${p.talles.join(', ') || '—'}</td>
          <td>
            ${(p.accesorios || []).map(a => `<span class="badge badge-gray">${escHtml(a.insumo_nombre)} ×${a.cantidad_por_par}</span>`).join(' ') || '—'}
          </td>
          <td>
            <div class="flex-gap">
              <button class="btn btn-sm" onclick="modalEditarProducto(${p.id})">Editar</button>
              <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})">Eliminar</button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div></div>`;

  document.getElementById('pageBody').innerHTML = html;
}

function buildProductoForm(prod = null) {
  const plantillas = _insumosCache.filter(i => i.tipo === 'plantilla');
  const fondos     = _insumosCache.filter(i => i.tipo === 'fondo');

  const selectedTalles = prod?.talles || [];
  const selectedAccs   = prod?.accesorios || [];

  return `
    <div class="form-group">
      <label class="form-label">Nombre del Producto *</label>
      <input class="form-input" id="pNombre" value="${escHtml(prod?.nombre || '')}" placeholder="Ej: Bota Clásica" />
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Plantilla *</label>
        <select class="form-select" id="pPlantilla">
          <option value="">— Seleccionar —</option>
          ${plantillas.map(i => `<option value="${i.id}" ${prod?.plantilla_id == i.id ? 'selected' : ''}>${escHtml(i.nombre)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Fondo *</label>
        <select class="form-select" id="pFondo">
          <option value="">— Seleccionar —</option>
          ${fondos.map(i => `<option value="${i.id}" ${prod?.fondo_id == i.id ? 'selected' : ''}>${escHtml(fondoLabel(i))}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Talles disponibles</label>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
        ${TALLES_CALZADO.map(t => `
          <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:4px 10px;border:1px solid var(--border2);border-radius:3px;font-size:13px;user-select:none"
            id="talleLbl_${t}">
            <input type="checkbox" value="${t}" id="talle_${t}" ${selectedTalles.includes(t) ? 'checked' : ''}
              onchange="highlightTalle('${t}',this.checked)" />
            ${t}
          </label>
        `).join('')}
      </div>
    </div>

    <hr class="divider" />
    <div class="form-group">
      <label class="form-label">Accesorios (opcional)</label>
      <div id="accesoriosList">
        ${selectedAccs.map((a, i) => buildAccRow(a, i)).join('')}
      </div>
      <button class="btn btn-sm mt-8" onclick="addAccRow()">+ Agregar accesorio</button>
    </div>
  `;
}

function buildAccRow(sel = null, idx = 0) {
  const allAccs = _insumosCache.filter(i => i.tipo === 'cierre' || i.tipo === 'hebilla');
  return `<div class="form-row acc-row" style="margin-bottom:8px" data-idx="${idx}">
    <div class="form-group" style="margin:0">
      <select class="form-select" name="acc_insumo">
        <option value="">— Seleccionar —</option>
        ${allAccs.map(i => `<option value="${i.id}" ${sel?.insumo_id == i.id ? 'selected' : ''}>${escHtml(i.nombre)} (${escHtml(i.tipo)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin:0;max-width:130px">
      <input class="form-input" type="number" name="acc_cantidad" value="${sel?.cantidad_por_par ?? 2}" min="1" placeholder="Cant/par" />
    </div>
    <button class="btn btn-sm btn-danger" onclick="this.parentElement.remove()" style="margin-top:0;align-self:center">✕</button>
  </div>`;
}

function addAccRow() {
  const list = document.getElementById('accesoriosList');
  const idx = list.querySelectorAll('.acc-row').length;
  list.insertAdjacentHTML('beforeend', buildAccRow(null, idx));
}

function highlightTalle(t, checked) {
  const lbl = document.getElementById(`talleLbl_${t}`);
  if (lbl) lbl.style.background = checked ? 'rgba(255,68,51,.15)' : '';
}

function readProductoForm() {
  const nombre       = document.getElementById('pNombre').value.trim();
  const plantilla_id = parseInt(document.getElementById('pPlantilla').value);
  const fondo_id     = parseInt(document.getElementById('pFondo').value);

  const talles = TALLES_CALZADO.filter(t => document.getElementById(`talle_${t}`)?.checked);

  const accRows = document.querySelectorAll('.acc-row');
  const accesorios = [];
  for (const row of accRows) {
    const insumo_id       = parseInt(row.querySelector('[name=acc_insumo]').value);
    const cantidad_por_par = parseInt(row.querySelector('[name=acc_cantidad]').value) || 1;
    if (insumo_id) accesorios.push({ insumo_id, cantidad_por_par });
  }

  return { nombre, plantilla_id, fondo_id, talles, accesorios };
}

function modalCrearProducto() {
  Modal.open('Nuevo Producto', buildProductoForm(), {
    onOpen: body => {
      TALLES_CALZADO.forEach(t => {
        const cb = document.getElementById(`talle_${t}`);
        if (cb?.checked) highlightTalle(t, true);
      });
      body.insertAdjacentHTML('beforeend', `
        <div class="modal-footer">
          <button class="btn" onclick="Modal.close()">Cancelar</button>
          <button class="btn btn-primary" onclick="guardarProducto(null)">Crear</button>
        </div>`);
    }
  });
}

async function modalEditarProducto(id) {
  const prod = await API.productos.get(id);
  Modal.open(`Editar — ${prod.nombre}`, buildProductoForm(prod), {
    onOpen: body => {
      TALLES_CALZADO.forEach(t => {
        const cb = document.getElementById(`talle_${t}`);
        if (cb?.checked) highlightTalle(t, true);
      });
      body.insertAdjacentHTML('beforeend', `
        <div class="modal-footer">
          <button class="btn" onclick="Modal.close()">Cancelar</button>
          <button class="btn btn-primary" onclick="guardarProducto(${id})">Guardar</button>
        </div>`);
    }
  });
}

async function guardarProducto(id) {
  const data = readProductoForm();
  if (!data.nombre)        { toast('El nombre es requerido', 'error'); return; }
  if (!data.plantilla_id)  { toast('Seleccionar una plantilla', 'error'); return; }
  if (!data.fondo_id)      { toast('Seleccionar un fondo', 'error'); return; }

  try {
    if (id) await API.productos.update(id, data);
    else    await API.productos.create(data);
    toast(id ? 'Producto actualizado' : 'Producto creado', 'success');
    Modal.close();
    renderProductos();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function eliminarProducto(id) {
  if (!confirmAction('¿Eliminar este producto?')) return;
  try {
    await API.productos.delete(id);
    toast('Producto eliminado', 'success');
    renderProductos();
  } catch (e) {
    toast(e.message, 'error');
  }
}
