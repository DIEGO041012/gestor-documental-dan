// ── GENERAL ────────────────────────────────────────────────────────────────
async function loadGeneral() {
  const q = document.getElementById('search-general').value.trim();
  const yr = document.getElementById('filter-general-year').value;
  let query = sb.from('archivo_general').select('*').order('created_at', {ascending:false});
  if(yr) query = query.eq('año', yr);
  if(q) query = query.or(`area.ilike.%${q}%,contenido.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-general');
  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="7"><div class="empty"><i class="ti ti-archive"></i><p>Sin registros.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${i+1}</td><td><span class="mono">${r.año}</span></td><td>${MESES[r.mes-1]||r.mes}</td><td>${r.area}</td>
    <td style="max-width:200px">${r.contenido}</td>
    <td><span class="badge ${r.estado==='Disponible'?'badge-ok':r.estado==='Prestado'?'badge-warn':'badge-blue'}">${r.estado}</span></td>
    <td><button class="btn btn-edit" onclick="editRecord('general','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('archivo_general','${r.id}','general')">Eliminar</button></td>
  </tr>`).join('');
}

async function populateYearFilter(type) {
  const table = type === 'general' ? 'archivo_general' : 'presidencia';
  const { data } = await sb.from(table).select('año').order('año', {ascending:false});
  if(!data) return;
  const years = [...new Set(data.map(r=>r.año))];
  const sel = document.getElementById(`filter-${type}-year`);
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todos los años</option>' + years.map(y=>`<option value="${y}" ${y==cur?'selected':''}>${y}</option>`).join('');
}

