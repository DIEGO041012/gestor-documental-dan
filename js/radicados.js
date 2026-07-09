// ── RADICADOS ────────────────────────────────────────────────────────────
// Con miles de registros, esta sección pagina en el servidor en vez de traer
// todo a la vez (a diferencia de las demás secciones, más pequeñas).

function radicadosBuildQuery(forCount) {
  const q = document.getElementById('search-radicados').value.trim();
  const area = document.getElementById('filter-radicados-area').value;
  const tipo = document.getElementById('filter-radicados-tipo').value;
  let query = sb.from('radicados').select('*', forCount ? {count:'exact', head:true} : undefined);
  if(area) query = query.eq('area', area);
  if(tipo) query = query.eq('tipo', tipo);
  if(q) query = query.or(`consecutivo.ilike.%${q}%,documento.ilike.%${q}%,remitente.ilike.%${q}%,destinatario.ilike.%${q}%`);
  return query;
}

async function loadRadicados() {
  const tb = document.getElementById('table-radicados');
  tb.innerHTML = `<tr><td colspan="11"><div class="loading"><i class="ti ti-loader"></i> Cargando...</div></td></tr>`;

  const { count } = await radicadosBuildQuery(true);
  radicadosTotal = count || 0;

  const from = radicadosPage * RADICADOS_PAGE_SIZE;
  const to = from + RADICADOS_PAGE_SIZE - 1;
  const { data, error } = await radicadosBuildQuery(false)
    .order('fecha_recibido', {ascending:false})
    .range(from, Math.max(to,from));

  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="11"><div class="empty"><i class="ti ti-mail"></i><p>Sin registros.</p></div></td></tr>`;
    document.getElementById('radicados-page-info').textContent = radicadosTotal ? `0 de ${radicadosTotal}` : '';
    return;
  }

  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${from+i+1}</td>
    <td><span class="mono">${r.consecutivo||'-'}</span></td>
    <td><span class="mono">${r.fecha_recibido||'-'}</span></td>
    <td><span class="mono">${r.hora_recibido||'-'}</span></td>
    <td style="max-width:220px">${r.documento||'-'}</td>
    <td>${r.tipo ? `<span class="badge badge-blue">${r.tipo}</span>` : '-'}</td>
    <td>${r.remitente||'-'}</td>
    <td>${r.area||'-'}</td>
    <td>${r.destinatario||'-'}</td>
    <td>${r.responsable_recibe||'-'}</td>
    <td><button class="btn btn-edit" onclick="editRecord('radicados','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('radicados','${r.id}','radicados')">Eliminar</button></td>
  </tr>`).join('');

  const showingFrom = radicadosTotal === 0 ? 0 : from + 1;
  const showingTo = Math.min(from + data.length, radicadosTotal);
  document.getElementById('radicados-page-info').textContent = `Mostrando ${showingFrom}–${showingTo} de ${radicadosTotal}`;
}

function radicadosPrevPage() {
  if(radicadosPage === 0) return;
  radicadosPage--;
  loadRadicados();
}
function radicadosNextPage() {
  if((radicadosPage+1) * RADICADOS_PAGE_SIZE >= radicadosTotal) return;
  radicadosPage++;
  loadRadicados();
}

async function populateRadicadosFilters() {
  const { data } = await sb.from('radicados').select('area');
  if(!data) return;
  const areas = [...new Set(data.map(r=>r.area).filter(Boolean))].sort();
  const sel = document.getElementById('filter-radicados-area');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las áreas</option>' + areas.map(a=>`<option value="${a}" ${a===cur?'selected':''}>${a}</option>`).join('');
}
