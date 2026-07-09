// ── GENERAL ────────────────────────────────────────────────────────────────
// "año" es texto libre (una caja puede abarcar varios años, ej: "2018-2022")
async function loadGeneral() {
  const q = document.getElementById('search-general').value.trim();
  let query = sb.from('archivo_general').select('*').order('created_at', {ascending:false});
  if(q) query = query.or(`area.ilike.%${q}%,contenido.ilike.%${q}%,año.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-general');
  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="7"><div class="empty"><i class="ti ti-archive"></i><p>Sin registros.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${i+1}</td><td><span class="mono">${r.año||'-'}</span></td><td>${r.mes ? (MESES[r.mes-1]||r.mes) : '-'}</td><td>${r.area||'-'}</td>
    <td style="max-width:200px">${r.contenido||'-'}</td>
    <td>${r.estado ? `<span class="badge ${r.estado==='Disponible'?'badge-ok':r.estado==='Prestado'?'badge-warn':'badge-blue'}">${r.estado}</span>` : '-'}</td>
    <td><button class="btn btn-edit" onclick="editRecord('general','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('archivo_general','${r.id}','general')">Eliminar</button></td>
  </tr>`).join('');
}
