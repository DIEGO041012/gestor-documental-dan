// ── DESTRUCCIÓN DOCUMENTAL ─────────────────────────────────────────────────
// Historial de cajas y documentos enviados a destrucción. Los registros llegan
// desde Documentación general ("Enviar a destrucción") o se ingresan a mano.

const DESTRUCCION_ESTADOS = { pendiente:'Pendiente', destruido:'Destruido' };

function destruccionFecha(value) {
  if(!value) return '-';
  const [y, m, d] = String(value).split('-');
  return d ? `${d}/${m}/${y}` : value;
}

async function loadDestruccion() {
  const q = document.getElementById('search-destruccion').value.trim().replace(/[,%()]/g, ' ');
  const estado = document.getElementById('filter-destruccion-estado').value;
  const tipo = document.getElementById('filter-destruccion-tipo').value;
  let query = sb.from('destruccion_documental').select('*').order('fecha_envio', {ascending:false}).order('created_at', {ascending:false});
  if(estado) query = query.eq('estado', estado);
  if(tipo) query = query.eq('tipo', tipo);
  if(q) query = query.or(`numero_caja.ilike.%${q}%,area.ilike.%${q}%,contenido.ilike.%${q}%,año.ilike.%${q}%,motivo.ilike.%${q}%,numero_acta.ilike.%${q}%,responsable.ilike.%${q}%`);
  const { data, error } = await query;
  const tb = document.getElementById('table-destruccion');

  if(error) {
    tb.innerHTML = `<tr><td colspan="11"><div class="empty"><i class="ti ti-alert-circle"></i><p>No se pudo cargar el historial: ${escapeHtml(error.message)}. Verifica que la migración de destrucción documental esté aplicada.</p></div></td></tr>`;
    return;
  }
  loadDestruccionSummary();
  if(!data.length) {
    tb.innerHTML = `<tr><td colspan="11"><div class="empty"><i class="ti ti-file-shredder"></i><p>${q || estado || tipo ? 'No hay registros que coincidan con la búsqueda.' : 'Aún no hay cajas ni documentos enviados a destrucción.'}</p></div></td></tr>`;
    return;
  }

  tb.innerHTML = data.map((r,i) => {
    const label = r.tipo === 'caja' ? 'Caja ' + (r.numero_caja || 'sin número') : (r.contenido || 'documento').slice(0, 60);
    const estadoBadge = r.estado === 'destruido'
      ? `<span class="badge badge-danger">Destruido</span><div class="mono destruccion-sub">${destruccionFecha(r.fecha_destruccion)}</div>`
      : '<span class="badge badge-warn">Pendiente</span>';
    return `<tr>
      <td>${i+1}</td>
      <td>${r.tipo === 'caja' ? 'Caja' : 'Documento'}</td>
      <td>${escapeHtml(r.numero_caja || '-')}</td>
      <td><span class="mono">${escapeHtml(r.año || '-')}</span></td>
      <td>${escapeHtml(r.area || '-')}</td>
      <td style="max-width:220px">${escapeHtml(r.contenido || '-')}</td>
      <td style="max-width:180px">${escapeHtml(r.motivo || '-')}</td>
      <td><span class="mono">${destruccionFecha(r.fecha_envio)}</span>${r.numero_acta ? `<div class="destruccion-sub">Acta ${escapeHtml(r.numero_acta)}</div>` : ''}</td>
      <td>${estadoBadge}</td>
      <td>${r.origen === 'archivo_general' ? '<span class="badge badge-blue">Doc. general</span>' : '<span class="destruccion-sub">Manual</span>'}</td>
      <td>${rowActions([
        {label:'Editar', icon:'edit', onclick:`editRecord('destruccion','${r.id}')`},
        ...(r.estado === 'pendiente' ? [{label:'Marcar como destruido', icon:'file-shredder', onclick:`markDestruido('${r.id}',${jsArg(label)})`}] : []),
        {separator:true},
        {label:'Eliminar del historial', icon:'trash', danger:true, onclick:`deleteRecord('destruccion_documental','${r.id}','destruccion',${jsArg(label)})`}
      ])}</td>
    </tr>`;
  }).join('');
}

async function loadDestruccionSummary() {
  const count = estado => {
    let q = sb.from('destruccion_documental').select('id', {count:'exact', head:true});
    return estado ? q.eq('estado', estado) : q;
  };
  const [total, pendientes, destruidos] = await Promise.all([count(), count('pendiente'), count('destruido')]);
  const el = document.getElementById('destruccion-summary');
  el.innerHTML = [
    ['Total en historial', total.count],
    ['Pendientes de destrucción', pendientes.count],
    ['Destruidos', destruidos.count]
  ].map(([label, n]) => `<div class="task-summary-item"><strong>${(n ?? 0).toLocaleString('es-CO')}</strong>${label}</div>`).join('');
}

// Abre el formulario para trasladar una caja de Documentación general
async function openDestruccionFromGeneral(id) {
  const { data, error } = await sb.from('archivo_general').select('*').eq('id', id).single();
  if(error || !data) { toast('No se pudo cargar la caja', 'error'); return; }
  openModal('destruccion_envio', data);
}

async function markDestruido(id, label) {
  const ok = await confirmDialog({
    title: '¿Marcar como destruido?',
    description: `«${label}» quedará registrado como destruido con fecha de hoy. Puedes cambiar la fecha o el número de acta con "Editar".`,
    confirmLabel: 'Marcar como destruido'
  });
  if(!ok) return;
  const { error } = await sb.from('destruccion_documental').update({ estado:'destruido', fecha_destruccion:localDateValue() }).eq('id', id);
  if(error) { toast('No se pudo actualizar: ' + error.message, 'error'); return; }
  toast('Registro marcado como destruido');
  loadDestruccion();
}
