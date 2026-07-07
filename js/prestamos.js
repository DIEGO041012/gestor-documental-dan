// ── PRÉSTAMOS ──────────────────────────────────────────────────────────────
async function loadPrestamos() {
  const { data, error } = await sb.from('prestamos').select('*').order('created_at', {ascending:false});
  const el = document.getElementById('loans-list');
  if(error || !data || data.length === 0) {
    el.innerHTML = `<div class="empty"><i class="ti ti-arrow-right-left"></i><p>No hay préstamos registrados.</p></div>`;
    return;
  }
  const hoy = new Date();
  el.innerHTML = data.map(p => {
    const venc = new Date(p.fecha_devolucion) < hoy && p.estado === 'activo';
    const badge = p.estado === 'activo' ? `<span class="badge ${venc?'badge-danger':'badge-warn'}">${venc?'Vencido':'Activo'}</span>` : '<span class="badge badge-ok">Devuelto</span>';
    return `<div class="loan-card ${venc?'overdue':''}">
      <div style="flex:1">
        <div class="loan-title">${p.documento}</div>
        <div class="loan-meta">Solicitante: <strong>${p.solicitante}</strong> · ${p.archivo}<br>Salida: ${p.fecha_salida} · Devolución esperada: ${p.fecha_devolucion}</div>
        ${p.observaciones?`<div class="loan-meta" style="margin-top:4px">Obs: ${p.observaciones}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${badge}
        ${p.estado==='activo'?`<button class="btn btn-success btn-sm" onclick="returnLoan('${p.id}')"><i class="ti ti-check"></i> Devuelto</button>`:''}
        <button class="btn btn-danger" onclick="deleteRecord('prestamos','${p.id}','prestamos')">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

async function returnLoan(id) {
  await sb.from('prestamos').update({estado:'devuelto'}).eq('id', id);
  toast('Préstamo marcado como devuelto');
  loadPrestamos();
  loadDashboard();
}

