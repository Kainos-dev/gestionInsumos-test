// ============================================================
// router.js — Hash-based SPA router
// ============================================================

const PAGES = {
  dashboard:   { title: 'Dashboard',              render: (id) => renderDashboard(id) },
  insumos:     { title: 'Insumos',                render: (id) => renderInsumos(id) },
  productos:   { title: 'Productos',              render: (id) => renderProductos(id) },
  ordenes:     { title: 'Órdenes de Producción',  render: (id) => renderOrdenes(id) },
  pedidos:     { title: 'Pedidos a Proveedores',  render: (id) => renderPedidos(id) },
  proveedores: { title: 'Proveedores',            render: (id) => renderProveedores(id) },
  movimientos: { title: 'Movimientos de Stock',   render: (id) => renderMovimientos(id) },
};

const router = {
  current: null,

  go(page, id) {
    window.location.hash = id ? `${page}/${id}` : page;
  },

  parse(hash) {
    const clean = (hash || '').replace(/^#\/?/, '');
    const parts = clean.split('/');
    return { page: parts[0] || 'dashboard', id: parts[1] || null };
  },

  async navigate() {
    const { page, id } = this.parse(window.location.hash);
    const p = PAGES[page] || PAGES.dashboard;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === (page || 'dashboard'));
    });

    this.current = page;

    try {
      await p.render(id);
    } catch (e) {
      console.error(e);
      document.getElementById('pageBody').innerHTML = `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state-icon">⚠</div>
            <div class="empty-state-text text-red">${escHtml(e.message)}</div>
          </div>
        </div>`;
      toast('Error al cargar la página', 'error');
    }
  }
};

// Nav click handlers
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    router.go(el.dataset.page);
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  });
});

window.addEventListener('hashchange', () => router.navigate());
window.addEventListener('DOMContentLoaded', () => router.navigate());
