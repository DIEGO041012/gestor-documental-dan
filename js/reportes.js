// ── REPORTES ───────────────────────────────────────────────────────────────
async function loadReportes() {
  const [g, a, i, p, pr, prv, rad, ironCajas, ironCarpetas, primavera] = await Promise.all([
    sb.from('archivo_general').select('id', {count:'exact', head:true}),
    sb.from('personal_activo').select('id', {count:'exact', head:true}),
    sb.from('personal_inactivo').select('id', {count:'exact', head:true}),
    sb.from('presidencia').select('id', {count:'exact', head:true}),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','activo'),
    sb.from('prestamos').select('id', {count:'exact', head:true}).eq('estado','devuelto'),
    sb.from('radicados').select('id', {count:'exact', head:true}),
    sb.from('iron_mountain_cajas').select('id', {count:'exact', head:true}),
    sb.from('iron_mountain_carpetas').select('id', {count:'exact', head:true}),
    sb.from('bodega_primavera').select('id', {count:'exact', head:true}),
  ]);
  const { data: areaData } = await sb.from('archivo_general').select('area');
  const { data: yearData } = await sb.from('archivo_general').select('año');
  const { data: presResumenData } = await sb.from('presidencia').select('resumen');
  const { data: radAreaData } = await sb.from('radicados').select('area');
  const { data: radTipoData } = await sb.from('radicados').select('tipo');

  // Supabase limita cada respuesta a 1.000 filas. Se pagina para que la gráfica
  // represente las 30.600 carpetas y no solamente la primera página.
  const ironRows = [];
  for(let from=0; from<(ironCarpetas.count||0); from+=1000) {
    const {data,error} = await sb.from('iron_mountain_carpetas')
      .select('descripcion,fecha_desde,estado').range(from,from+999);
    if(error) break;
    ironRows.push(...(data||[]));
  }

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

  const ironTotal = (ironCajas.count||0)+(ironCarpetas.count||0);
  const total = (g.count||0)+(a.count||0)+(i.count||0)+(p.count||0)+(rad.count||0)+ironTotal+(primavera.count||0);
  const ironCustodia = ironRows.filter(r=>r.estado==='EN CUSTODIA').length;
  const ironPrestamo = ironRows.filter(r=>r.estado==='EN PRESTAMO').length;

  const ironByAreaYear = {};
  ironRows.forEach(r => {
    const area = (r.descripcion||'Sin descripción').trim().toUpperCase();
    const match = String(r.fecha_desde||'').match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
    if(!match) return;
    const year = match[1];
    ironByAreaYear[area] ||= {};
    ironByAreaYear[area][year] = (ironByAreaYear[area][year]||0)+1;
  });
  const ironCandles = Object.entries(ironByAreaYear).map(([area,years]) => {
    const ordered = Object.entries(years).sort((x,y)=>Number(x[0])-Number(y[0]));
    const values = ordered.map(x=>x[1]);
    return {area, total:values.reduce((s,n)=>s+n,0), min:Math.min(...values), max:Math.max(...values), open:ordered[0][1], close:ordered.at(-1)[1], first:ordered[0][0], last:ordered.at(-1)[0]};
  }).sort((x,y)=>y.total-x.total).slice(0,10);
  const candleMax = Math.max(...ironCandles.map(x=>x.max),1);
  const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const candle = c => {
    const low = c.min/candleMax*100, high = c.max/candleMax*100;
    const bodyLow = Math.min(c.open,c.close)/candleMax*100, bodyHigh = Math.max(c.open,c.close)/candleMax*100;
    const rising = c.close>=c.open;
    return `<div class="candle-track" title="${esc(c.first)}: ${c.open} · ${esc(c.last)}: ${c.close} · mínimo: ${c.min} · máximo: ${c.max}"><span class="candle-wick" style="left:${low}%;width:${Math.max(high-low,0.5)}%"></span><span class="candle-body ${rising?'rising':'falling'}" style="left:${bodyLow}%;width:${Math.max(bodyHigh-bodyLow,1)}%"></span></div>`;
  };

  document.getElementById('reportes-content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-files"></i></div><div class="stat-value">${total.toLocaleString('es-CO')}</div><div class="stat-label">Total documentos</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-mail"></i></div><div class="stat-value">${(rad.count||0).toLocaleString('es-CO')}</div><div class="stat-label">Radicados</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="ti ti-arrows-left-right"></i></div><div class="stat-value">${pr.count||0}</div><div class="stat-label">Préstamos activos</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="ti ti-check"></i></div><div class="stat-value">${prv.count||0}</div><div class="stat-label">Préstamos devueltos</div></div>
      <div class="stat-card"><div class="stat-icon blue"><i class="ti ti-users"></i></div><div class="stat-value">${a.count||0}</div><div class="stat-label">Personal activo</div></div>
      <div class="stat-card"><div class="stat-icon yellow"><i class="ti ti-building-warehouse"></i></div><div class="stat-value">${ironTotal.toLocaleString('es-CO')}</div><div class="stat-label">Registros Iron Mountain</div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="ti ti-building-warehouse"></i></div><div class="stat-value">${(primavera.count||0).toLocaleString('es-CO')}</div><div class="stat-label">Bodega Primavera</div></div>
    </div>
    <div class="report-card">
      <div class="report-title"><i class="ti ti-building-warehouse" style="color:var(--m-iron)"></i> Iron Mountain — resumen</div>
      <div class="iron-summary-grid">
        <div><strong>${(ironCarpetas.count||0).toLocaleString('es-CO')}</strong><span>Carpetas</span></div>
        <div><strong>${(ironCajas.count||0).toLocaleString('es-CO')}</strong><span>Cajas</span></div>
        <div><strong>${ironCustodia.toLocaleString('es-CO')}</strong><span>Carpetas en custodia</span></div>
        <div><strong>${ironPrestamo.toLocaleString('es-CO')}</strong><span>Carpetas en préstamo</span></div>
      </div>
    </div>
    ${ironCandles.length?`<div class="report-card">
      <div class="report-title"><i class="ti ti-chart-candle" style="color:var(--m-iron)"></i> Iron Mountain por área documental y año</div>
      <p class="report-note">La descripción se usa como área documental. Mecha: mínimo–máximo anual · Cuerpo: primer–último año · Verde: aumentó · Rojo: disminuyó.</p>
      <div class="candle-header"><span>Área documental</span><span>Registros por año</span><span>Total</span></div>
      ${ironCandles.map(c=>`<div class="candle-row"><div class="candle-label" title="${esc(c.area)}">${esc(c.area)}</div>${candle(c)}<div class="candle-total">${c.total.toLocaleString('es-CO')}</div></div>`).join('')}
    </div>`:''}
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
      ${[['Doc. general',g.count||0,''],['Bodega Primavera',primavera.count||0,'green'],['Personal activo',a.count||0,'green'],['Personal inactivo',i.count||0,'red'],['Presidencia',p.count||0,''],['Radicados',rad.count||0,'yellow'],['Iron Mountain',ironTotal,'yellow']].map(([label,cnt,cls])=>{const max=Math.max(g.count||0,primavera.count||0,a.count||0,i.count||0,p.count||0,rad.count||0,ironTotal,1);return`<div class="bar-row"><div class="bar-label">${label}</div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.round(cnt/max*100)}%"></div></div><div class="bar-val">${cnt.toLocaleString('es-CO')}</div></div>`}).join('')}
    </div>
  `;
}
