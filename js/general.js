// ── GENERAL ────────────────────────────────────────────────────────────────
// "año" es texto libre (una caja puede abarcar varios años, ej: "2018-2022")
async function loadGeneral() {
  const q = document.getElementById('search-general').value.trim();
  let query = sb.from('archivo_general').select('*').order('created_at', {ascending:false});
  if(q) query = query.or(`area.ilike.%${q}%,contenido.ilike.%${q}%,año.ilike.%${q}%,numero_caja.ilike.%${q}%,ubicacion.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-general');
  if(error || !data || data.length === 0) {
    tb.innerHTML = `<tr><td colspan="9"><div class="empty"><i class="ti ti-archive"></i><p>Sin registros.</p></div></td></tr>`;
    return;
  }
  tb.innerHTML = data.map((r,i) => `<tr>
    <td>${i+1}</td>
    <td><span class="mono">${escapeHtml(r.año||'-')}</span></td>
    <td>${escapeHtml(r.numero_caja||'-')}</td>
    <td>${escapeHtml(r.ubicacion||'-')}</td>
    <td>${r.mes ? (MESES[r.mes-1]||escapeHtml(r.mes)) : '-'}</td>
    <td>${escapeHtml(r.area||'-')}</td>
    <td style="max-width:200px">${escapeHtml(r.contenido||'-')}</td>
    <td>${r.estado ? `<span class="badge ${r.estado==='Disponible'?'badge-ok':r.estado==='Prestado'?'badge-warn':'badge-blue'}">${escapeHtml(r.estado)}</span>` : '-'}</td>
    <td>${rowActions([
      {label:'Editar', icon:'edit', onclick:`editRecord('general','${r.id}')`},
      {label:'Trasladar', icon:'truck-delivery', onclick:`openGeneralTransfer('${r.id}')`},
      {label:'Enviar a destrucción', icon:'file-shredder', onclick:`openDestruccionFromGeneral('${r.id}')`},
      {separator:true},
      {label:'Eliminar', icon:'trash', danger:true, onclick:`deleteRecord('archivo_general','${r.id}','general',${jsArg('Caja '+(r.numero_caja||'sin número'))})`}
    ])}</td>
  </tr>`).join('');
}
