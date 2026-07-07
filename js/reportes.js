// ── REPORTES ───────────────────────────────────────────────────────────────
async function loadReportes() {
  const [g, a, i, p, pr, prv] = await Promise.all([
    sb.from('archivo_general').select('id', {count:'exact', head:true}),
    sb.from('personal_activo').select('id', {count:'exact', head:true}),
    sb.from('personal_inactivo').select('id', {count:'exact', head:true}),
    sb.from('presidencia').select('id', {count:'exact', head:true}),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','activo'),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','devuelto'),
  ]);
  const { data: areaData } = await sb.from('archivo_general').select('area');
  const { data: yearData } = await sb.from('archivo_general').select('año');
  const { data: presYearData } = await sb.from('presidencia').select('año');

  const areaCount = {};
  (areaData||[]).forEach(r => { areaCount[r.area] = (areaCount[r.area]||0)+1; });
  const topAreas = Object.entries(areaCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxA = topAreas[0]?topAreas[0][1]:1;

  const yearCount = {};
  (yearData||[]).forEach(r => { yearCount[r.año] = (yearCount[r.año]||0)+1; });
  const topYears = Object.entries(yearCount).sort((a,b)=>b[0]-a[0]).slice(0,8);
  const maxY = topYears[0]?topYears[0][1]:1;

  const presYearCount = {};
  (presYearData||[]).forEach(r => { presYearCount[r.año] = (presYearCount[r.año]||0)+1; });
  const topPresYears = Object.entries(presYearCount).sort((a,b)=>b[0]-a[0]).slice(0,8);
  const maxPY = topPresYears[0]?topPresYears[0][1]:1;

  const total = (g.count||0)+(a.count||0)+(i.count||0)+(p.count||0);

  document.getElementById('reportes-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-files"></i></div><div class="stat-value">${total}</div><div class="stat-label">Total documentos</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="ti ti-arrow-right-left"></i></div><div class="stat-value">${pr.count||0}</div><div class="stat-label">Préstamos activos</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="ti ti-check"></i></div><div class="stat-value">${prv.count||0}</div><div class="stat-label">Préstamos devueltos</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-users"></i></div><div class="stat-value">${a.count||0}</div><div class="stat-label">Personal activo</div></div>
    </div>
    ${topAreas.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-archive" style="color:var(--accent)"></i> Cajas por área — Archivo general</div>
      ${topAreas.map(([area,cnt])=>`<div class="bar-row"><div class="bar-label">${area}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxA*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${topYears.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-calendar" style="color:var(--accent)"></i> Cajas por año — Archivo general</div>
      ${topYears.map(([yr,cnt])=>`<div class="bar-row"><div class="bar-label">${yr}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxY*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${topPresYears.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-building" style="color:var(--accent)"></i> Documentos por año — Presidencia</div>
      ${topPresYears.map(([yr,cnt])=>`<div class="bar-row"><div class="bar-label">${yr}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxPY*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    <div class="report-card">
      <div class="report-title"><i class="ti ti-chart-pie" style="color:var(--accent)"></i> Distribución del archivo</div>
      ${[['Doc. general',g.count||0,''],['Personal activo',a.count||0,'green'],['Personal inactivo',i.count||0,'red'],['Presidencia',p.count||0,'']].map(([label,cnt,cls])=>{const max=Math.max(g.count||0,a.count||0,i.count||0,p.count||0,1);return`<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.round(cnt/max*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`}).join('')}
    </div>
  `;
}

