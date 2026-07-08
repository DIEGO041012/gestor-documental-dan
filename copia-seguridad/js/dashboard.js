// ── DASHBOARD ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  const [g, a, i, p, pr] = await Promise.all([
    sb.from('archivo_general').select('id', {count:'exact', head:true}),
    sb.from('personal_activo').select('id', {count:'exact', head:true}),
    sb.from('personal_inactivo').select('id', {count:'exact', head:true}),
    sb.from('presidencia').select('id', {count:'exact', head:true}),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','activo'),
  ]);
  document.getElementById('s-general').textContent = g.count ?? 0;
  document.getElementById('s-activos').textContent = a.count ?? 0;
  document.getElementById('s-inactivos').textContent = i.count ?? 0;
  document.getElementById('s-presidencia').textContent = p.count ?? 0;
  document.getElementById('s-prestamos').textContent = pr.count ?? 0;

  const { data: loans } = await sb.from('prestamos').select('*').eq('estado','activo').order('fecha_devolucion');
  const hoy = new Date();
  const el = document.getElementById('dashboard-loans');
  if(!loans || loans.length === 0) {
    el.innerHTML = '<p style="color:var(--text-3);font-size:13px">No hay préstamos activos.</p>';
    return;
  }
  el.innerHTML = loans.map(p => {
    const venc = new Date(p.fecha_devolucion) < hoy;
    return `<div class="loan-card ${venc?'overdue':''}">
      <div><div class="loan-title">${p.documento}</div><div class="loan-meta">Solicitante: <strong>${p.solicitante}</strong> · ${p.archivo} · Dev. esperada: <span class="mono">${p.fecha_devolucion}</span></div></div>
      <span class="badge ${venc?'badge-danger':'badge-warn'}">${venc?'Vencido':'Activo'}</span>
    </div>`;
  }).join('');
}

