// ============================================================
// ui.js — Shared UI utilities
// ============================================================

// ===== MODAL =====
const Modal = {
  open(title, html, opts = {}) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('open');
    if (opts.onOpen) opts.onOpen(document.getElementById('modalBody'));
  },
  close() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modalBody').innerHTML = '';
  },
  setTitle(t) { document.getElementById('modalTitle').textContent = t; }
};

document.getElementById('modalClose').addEventListener('click', Modal.close);
document.getElementById('modalOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modalOverlay')) Modal.close();
});

// ===== TOAST =====
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===== CONFIRM =====
function confirmAction(msg) {
  return window.confirm(msg);
}

// ===== LOADING =====
function loading(html = '<em style="color:var(--text2)">Cargando...</em>') {
  document.getElementById('pageBody').innerHTML = `<div style="padding:40px;text-align:center">${html}</div>`;
}

// ===== HELPERS =====
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function estadoBadge(estado) {
  const map = {
    borrador:   'badge-gray',
    confirmada: 'badge-green',
    cancelada:  'badge-red',
    enviado:    'badge-blue',
    recibido:   'badge-green',
    faltante:   'badge-red',
    stock_bajo: 'badge-gold',
  };
  return `<span class="badge ${map[estado] || 'badge-gray'}">${estado}</span>`;
}

function tipoBadge(tipo) {
  const map = {
    plantilla: 'badge-blue',
    fondo:     'badge-gold',
    cierre:    'badge-gray',
    hebilla:   'badge-gray',
  };
  return `<span class="badge ${map[tipo] || 'badge-gray'}">${tipo}</span>`;
}

function stockColor(stock, minimo) {
  if (stock < 0) return 'text-red';
  if (stock <= minimo) return 'text-gold';
  return 'text-green';
}

function emptyState(msg = 'Sin datos') {
  return `<div class="empty-state">
    <div class="empty-state-icon">◌</div>
    <div class="empty-state-text">${msg}</div>
  </div>`;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== TOPBAR ACTIONS =====
function setTopbarActions(html) {
  document.getElementById('topbarActions').innerHTML = html;
}
function setPageTitle(t) {
  document.getElementById('pageTitle').textContent = t;
}

// ===== MENU TOGGLE =====
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ===== TALLE CONSTANTS =====
const TALLES_CALZADO = ['35','36','37','38','39','40','41','42','43','44','45','46'];

// ===== STOCK TALLES FORM BUILDER =====
function buildStockTallesForm(stockRows = [], talles = TALLES_CALZADO) {
  const stockMap = {};
  for (const r of stockRows) stockMap[r.talle] = r.stock;
  return `<div class="stock-talles-grid">
    ${talles.map(t => `
      <div class="stock-talle-cell">
        <label>${t}</label>
        <input type="number" name="talle_${t}" value="${stockMap[t] ?? 0}" data-talle="${t}" />
      </div>
    `).join('')}
  </div>`;
}

function readStockTallesForm(container) {
  const inputs = container.querySelectorAll('[data-talle]');
  return Array.from(inputs).map(inp => ({
    talle: inp.dataset.talle,
    stock: parseInt(inp.value) || 0,
  }));
}
