// ============================================================
// pages/proveedores.js
// ============================================================

async function renderProveedores() {
  setPageTitle('Proveedores');
  setTopbarActions(`<button class="btn btn-primary" onclick="modalCrearProveedor()">+ Nuevo Proveedor</button>`);
  loading();

  const proveedores = await API.proveedores.list();

  if (!proveedores.length) {
    document.getElementById('pageBody').innerHTML = `<div class="card">${emptyState('Sin proveedores')}</div>`;
    return;
  }

  const html = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Nombre</th><th>Contacto</th><th>Insumos</th><th>Fecha alta</th><th>Acciones</th></tr></thead>
    <tbody>
      ${proveedores.map(p => `<tr>
        <td><strong>${escHtml(p.nombre)}</strong></td>
        <td>${escHtml(p.contacto || '—')}</td>
        <td>${p.total_insumos || 0}</td>
        <td class="text-muted">${formatDate(p.created_at)}</td>
        <td>
          <div class="flex-gap">
            <button class="btn btn-sm" onclick="modalEditarProveedor(${p.id})">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="eliminarProveedor(${p.id})">Eliminar</button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div></div>`;

  document.getElementById('pageBody').innerHTML = html;
}

function buildProveedorForm(p = null) {
  return `
    <div class="form-group">
      <label class="form-label">Nombre *</label>
      <input class="form-input" id="pvNombre" value="${escHtml(p?.nombre || '')}" placeholder="Nombre del proveedor" />
    </div>
    <div class="form-group">
      <label class="form-label">Contacto / Teléfono</label>
      <input class="form-input" id="pvContacto" value="${escHtml(p?.contacto || '')}" placeholder="+54 11 ..." />
    </div>
  `;
}

function modalCrearProveedor() {
  Modal.open('Nuevo Proveedor', buildProveedorForm() + `
    <div class="modal-footer">
      <button class="btn" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarProveedor(null)">Crear</button>
    </div>`);
}

async function modalEditarProveedor(id) {
  const p = await API.proveedores.get(id);
  Modal.open(`Editar — ${p.nombre}`, buildProveedorForm(p) + `
    <div class="modal-footer">
      <button class="btn" onclick="Modal.close()">Cancelar</button>
      <button class="btn btn-primary" onclick="guardarProveedor(${id})">Guardar</button>
    </div>`);
}

async function guardarProveedor(id) {
  const nombre   = document.getElementById('pvNombre').value.trim();
  const contacto = document.getElementById('pvContacto').value.trim() || null;
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  try {
    if (id) await API.proveedores.update(id, { nombre, contacto });
    else    await API.proveedores.create({ nombre, contacto });
    toast(id ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
    Modal.close();
    renderProveedores();
  } catch (e) { toast(e.message, 'error'); }
}

async function eliminarProveedor(id) {
  if (!confirmAction('¿Eliminar este proveedor?')) return;
  try {
    await API.proveedores.delete(id);
    toast('Proveedor eliminado', 'success');
    renderProveedores();
  } catch (e) { toast(e.message, 'error'); }
}
