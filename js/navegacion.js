// ── SIDEBAR (mobile/tablet off-canvas) ──────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-scrim').classList.add('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-scrim').classList.remove('open');
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function showSection(s) {
  currentSection = s;
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('section-' + s).classList.add('active');
  const navItems = document.querySelectorAll('.nav-item');
  const map = {dashboard:0,general:1,gestion:2,presidencia:3,radicados:4,prestamos:5,reportes:6};
  if(navItems[map[s]]) navItems[map[s]].classList.add('active');
  closeSidebar();
  window.scrollTo({top:0, behavior:'smooth'});
  if(s==='dashboard') loadDashboard();
  else if(s==='general') { loadGeneral(); }
  else if(s==='gestion') loadGestion();
  else if(s==='presidencia') { loadPresidencia(); populateSeccionFilter(); }
  else if(s==='radicados') { radicadosPage = 0; loadRadicados(); populateRadicadosFilters(); }
  else if(s==='prestamos') loadPrestamos();
  else if(s==='reportes') loadReportes();
}

