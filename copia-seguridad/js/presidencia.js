// ── PRESIDENCIA ────────────────────────────────────────────────────────────
async function loadPresidencia() {
  const q = document.getElementById('search-presidencia').value.trim();
  const yr = document.getElementById('filter-presidencia-year').value;
  let query = sb.from('presidencia').select('*').order('año', {ascending:false});
  if(yr) query = query.eq('año', yr);
  if(q) query = query.or(`nombre.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-presidencia');
  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="4"><div class="empty"><i class="ti ti-building"></i><p>Sin registros.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${i+1}</td><td><span class="mono">${r.año}</span></td><td>${r.nombre}</td>
    <td><button class="btn btn-edit" onclick="editRecord('presidencia','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('presidencia','${r.id}','presidencia')">Eliminar</button></td>
  </tr>`).join('');
}

