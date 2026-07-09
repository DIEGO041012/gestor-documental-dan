// ── REPORTES ───────────────────────────────────────────────────────────────
async function loadReportes() {
  const [g, a, i, p, pr, prv, rad] = await Promise.all([
    sb.from('archivo_general').select('id', {count:'exact', head:true}),
    sb.from('personal_activo').select('id', {count:'exact', head:true}),
    sb.from('personal_inactivo').select('id', {count:'exact', head:true}),
    sb.from('presidencia').select('id', {count:'exact', head:true}),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','activo'),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','devuelto'),
    sb.from('radicados').select('id', {count:'exact', head:true}),
  ]);
  const { data: areaData } = await sb.from('archivo_general').select('area');
  const { data: yearData } = await sb.from('archivo_general').select('año');
  const { data: presResumenData } = await sb.from('presidencia').select('resumen');
  const { data: radAreaData } = await sb.from('radicados').select('area');
  const { data: radTipoData } = await sb.from('radicados').select('tipo');

  const areaCount = {};
  (areaData||[]).forEach(r => { areaCount[r.area] = (areaCount[r.area]||0)+1; });
  const topAreas = Object.entries(areaCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxA = topAreas[0]?topAreas[0][1]:1;

  const yearCount = {};
  (yearData||[]).forEach(r => { yearCount[r.año] = (yearCount[r.año]||0)+1; });
  const topYears = Object.entries(yearCount).sort((a,b)=>b[0]-a[0]).slice(0,8);
  const maxY = topYears[0]?topYears[0][1]:1;

  const presResumenCount = {};
  (presResumenData||[]).forEach(r => { const k = r.resumen||'(sin tema)'; presResumenCount[k] = (presResumenCount[k]||0)+1; });
  const topPresResumen = Object.entries(presResumenCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxPY = topPresResumen[0]?topPresResumen[0][1]:1;

  const radAreaCount = {};
  (radAreaData||[]).forEach(r => { const k = r.area||'(sin área)'; radAreaCount[k] = (radAreaCount[k]||0)+1; });
  const topRadAreas = Object.entries(radAreaCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxRA = topRadAreas[0]?topRadAreas[0][1]:1;

  const radTipoCount = { Personal:0, Corporativo:0, 'Sin especificar':0 };
  (radTipoData||[]).forEach(r => { const k = r.tipo || 'Sin especificar'; radTipoCount[k] = (radTipoCount[k]||0)+1; });
  const maxRT = Math.max(...Object.values(radTipoCount), 1);

  const total = (g.count||0)+(a.count||0)+(i.count||0)+(p.count||0)+(rad.count||0);

  document.getElementById('reportes-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-files"></i></div><div class="stat-value">${total.toLocaleString('es-CO')}</div><div class="stat-label">Total documentos</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-mail"></i></div><div class="stat-value">${(rad.count||0).toLocaleString('es-CO')}</div><div class="stat-label">Radicados</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="ti ti-arrow-right-left"></i></div><div class="stat-value">${pr.count||0}</div><div class="stat-label">Préstamos activos</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="ti ti-check"></i></div><div class="stat-value">${prv.count||0}</div><div class="stat-label">Préstamos devueltos</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-users"></i></div><div class="stat-value">${a.count||0}</div><div class="stat-label">Personal activo</div></div>
    </div>
    ${topRadAreas.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-mail" style="color:var(--accent)"></i> Radicados por área</div>
      ${topRadAreas.map(([area,cnt])=>`<div class="bar-row"><div class="bar-label">${area}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxRA*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${(rad.count||0)>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-tag" style="color:var(--accent)"></i> Radicados por tipo</div>
      ${Object.entries(radTipoCount).map(([tipo,cnt])=>`<div class="bar-row"><div class="bar-label">${tipo}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxRT*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${topAreas.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-archive" style="color:var(--accent)"></i> Cajas por área — Archivo general</div>
      ${topAreas.map(([area,cnt])=>`<div class="bar-row"><div class="bar-label">${area}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxA*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${topYears.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-calendar" style="color:var(--accent)"></i> Cajas por año — Archivo general</div>
      ${topYears.map(([yr,cnt])=>`<div class="bar-row"><div class="bar-label">${yr}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxY*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    ${topPresResumen.length>0?`<div class="report-card">
      <div class="report-title"><i class="ti ti-building" style="color:var(--accent)"></i> Documentos por tema — Presidencia</div>
      ${topPresResumen.map(([tema,cnt])=>`<div class="bar-row"><div class="bar-label">${tema}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(cnt/maxPY*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`).join('')}
    </div>`:''}
    <div class="report-card">
      <div class="report-title"><i class="ti ti-chart-pie" style="color:var(--accent)"></i> Distribución del archivo</div>
      ${[['Doc. general',g.count||0,''],['Personal activo',a.count||0,'green'],['Personal inactivo',i.count||0,'red'],['Presidencia',p.count||0,''],['Radicados',rad.count||0,'yellow']].map(([label,cnt,cls])=>{const max=Math.max(g.count||0,a.count||0,i.count||0,p.count||0,rad.count||0,1);return`<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.round(cnt/max*100)}%"></div></div><div class="bar-val">${cnt}</div></div>`}).join('')}
    </div>
  `;
}
