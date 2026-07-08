// ── PRESIDENCIA ────────────────────────────────────────────────────────────
// Esquema real del archivo físico: Estante / Sección / Módulo / Resumen (tema)
// / Tipo de documento / Fecha / Contenido (descripción del documento)

async function loadPresidencia() {
  const q = document.getElementById('search-presidencia').value.trim();
  const sec = document.getElementById('filter-presidencia-seccion').value;
  let query = sb.from('presidencia').select('*').order('seccion').order('modulo');
  if(sec) query = query.eq('seccion', sec);
  if(q) query = query.or(`resumen.ilike.%${q}%,contenido.ilike.%${q}%,tipo.ilike.%${q}%,modulo.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-presidencia');
  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty"><i class="ti ti-building"></i><p>Sin registros.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${i+1}</td>
    <td><span class="mono">${r.estante ?? '-'}</span></td>
    <td><span class="badge badge-blue">${r.seccion || '-'}</span></td>
    <td><span class="mono">${r.modulo || '-'}</span></td>
    <td>${r.resumen || '-'}</td>
    <td>${r.tipo ? r.tipo.trim() : '-'}</td>
    <td><span class="mono">${r.fecha || '-'}</span></td>
    <td style="max-width:220px">${r.contenido || '-'}</td>
    <td><button class="btn btn-edit" onclick="editRecord('presidencia','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('presidencia','${r.id}','presidencia')">Eliminar</button></td>
  </tr>`).join('');
}

async function populateSeccionFilter() {
  const { data } = await sb.from('presidencia').select('seccion');
  if(!data) return;
  const secciones = [...new Set(data.map(r=>r.seccion).filter(Boolean))].sort();
  const sel = document.getElementById('filter-presidencia-seccion');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las secciones</option>' + secciones.map(s=>`<option value="${s}" ${s===cur?'selected':''}>Sección ${s}</option>`).join('');
}
