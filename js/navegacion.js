// ── SIDEBAR (mobile/tablet off-canvas) ──────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-scrim').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-scrim').classList.remove('open');
}

// Toggle collapsed state for desktop: hides sidebar and expands main view
function toggleSidebarCollapse() {
  const layout = document.querySelector('.layout');
  if(!layout) return;
  layout.classList.toggle('sidebar-collapsed');
  const collapsed = layout.classList.contains('sidebar-collapsed');
  // update any inline toggles in headers
  document.querySelectorAll('.toggle-sidebar-inline').forEach(btn => {
    const icon = btn.querySelector('i');
    const txt = btn.querySelector('span');
    if(txt) txt.textContent = collapsed ? 'Mostrar menú' : 'Ocultar menú';
    if(icon) icon.className = collapsed ? 'ti ti-layout-sidebar-right' : 'ti ti-layout-sidebar-left';
  });
}

// Inject an inline toggle button into every .header-actions container
function injectSidebarToggles() {
  document.querySelectorAll('.header-actions').forEach(h => {
    if(h.querySelector('.toggle-sidebar-inline')) return; // already
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toggle-sidebar-inline btn btn-secondary btn-sm';
    btn.setAttribute('aria-label','Ocultar/Mostrar menú');
    btn.onclick = toggleSidebarCollapse;
    btn.innerHTML = '<i class="ti ti-layout-sidebar-left"></i><span>Ocultar menú</span>';
    h.insertBefore(btn, h.firstChild);
  });
  // sync initial state
  const collapsed = document.querySelector('.layout').classList.contains('sidebar-collapsed');
  if(collapsed) toggleSidebarCollapse();
}

document.addEventListener('DOMContentLoaded', injectSidebarToggles);

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function showSection(s) {
  currentSection = s;
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('section-' + s).classList.add('active');
  const navItems = document.querySelectorAll('.nav-item');
  const map = {dashboard:0,general:1,gestion:2,presidencia:3,radicados:4,recepcion_contabilidad:5,prestamos:6,tareas:7,reportes:8};
  if(navItems[map[s]]) navItems[map[s]].classList.add('active');
  closeSidebar();
  window.scrollTo({top:0, behavior:'smooth'});
  if(s==='dashboard') loadDashboard();
  else if(s==='general') { loadGeneral(); }
  else if(s==='gestion') loadGestion();
  else if(s==='presidencia') { loadPresidencia(); populateSeccionFilter(); }
  else if(s==='radicados') { radicadosPage = 0; loadRadicados(); populateRadicadosFilters(); }
  else if(s==='prestamos') loadPrestamos();
  else if(s==='tareas') loadTasksModule();
  else if(s==='reportes') loadReportes();
}
