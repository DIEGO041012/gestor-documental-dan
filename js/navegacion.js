// ── SIDEBAR (mobile/tablet off-canvas) ──────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-scrim').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-scrim').classList.remove('open');
}

// Escritorio: contrae el menú a una barra de íconos (no lo oculta del todo)
const SIDEBAR_COLLAPSED_KEY = 'gd-sidebar-collapsed';

function setSidebarCollapsed(collapsed) {
  const layout = document.querySelector('.layout');
  if(!layout) return;
  layout.classList.toggle('sidebar-collapsed', collapsed);
  const btn = document.getElementById('sidebar-collapse-btn');
  if(btn) {
    const label = collapsed ? 'Expandir menú' : 'Contraer menú';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.querySelector('i').className = 'ti ' + (collapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse');
    btn.querySelector('.nav-label').textContent = label;
  }
  try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch(e) {}
}

function toggleSidebarCollapse() {
  setSidebarCollapsed(!document.querySelector('.layout').classList.contains('sidebar-collapsed'));
}

document.addEventListener('DOMContentLoaded', () => {
  let saved = false;
  try { saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch(e) {}
  if(saved) setSidebarCollapsed(true);
});

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function showSection(s) {
  currentSection = s;
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('section-' + s).classList.add('active');
  const activeNav = document.querySelector(`.nav-item[data-mod="${s}"]`);
  if(activeNav) activeNav.classList.add('active');
  closeSidebar();
  window.scrollTo({top:0, behavior:'smooth'});
  if(s==='dashboard') loadDashboard();
  else if(s==='general') { loadGeneral(); }
  else if(s==='bodega_primavera') { loadBodegaPrimavera(); }
  else if(s==='gestion') loadGestion();
  else if(s==='presidencia') { loadPresidencia(); populateSeccionFilter(); }
  else if(s==='radicados') { radicadosPage = 0; loadRadicados(); populateRadicadosFilters(); }
  else if(s==='envios') loadShipments();
  else if(s==='iron_mountain') { ironMountainPage = 0; loadIronMountain(); }
  else if(s==='prestamos') loadPrestamos();
  else if(s==='destruccion') loadDestruccion();
  else if(s==='tareas') loadTasksModule();
  else if(s==='reportes') loadReportes();
}
