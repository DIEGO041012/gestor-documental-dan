// ── PRÉSTAMOS ──────────────────────────────────────────────────────────────
async function loadPrestamos() {
  const { data, error } = await sb.from('prestamos').select('*').order('created_at', {ascending:false});
  const el = document.getElementById('loans-list');
  if(error || !data || data.length === 0) {
    el.innerHTML = `<div class="empty"><i class="ti ti-arrows-left-right"></i><p>No hay préstamos registrados.</p></div>`;
    return;
  }
  el.innerHTML = data.map(p => {
    const venc = loanIsOverdue(p.fecha_devolucion) && p.estado === 'activo';
    const badge = p.estado === 'activo' ? `<span class="badge ${venc?'badge-danger':'badge-warn'}">${venc?'Vencido':'Activo'}</span>` : '<span class="badge badge-ok">Devuelto</span>';
    return `<div class="loan-card ${venc?'overdue':''}">
      <div style="flex:1">
        <div class="loan-title">${escapeHtml(p.documento)}</div>
        <div class="loan-meta">Solicitante: <strong>${escapeHtml(p.solicitante)}</strong> · ${escapeHtml(p.archivo)}<br>Salida: <span class="mono">${escapeHtml(p.fecha_salida)}</span> · Devolución esperada: <span class="mono">${escapeHtml(p.fecha_devolucion)}</span></div>
        ${p.observaciones?`<div class="loan-meta" style="margin-top:4px">Obs: ${escapeHtml(p.observaciones)}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        ${badge}
        ${p.estado==='activo'?`<button class="btn btn-success btn-sm" onclick="returnLoan('${p.id}')"><i class="ti ti-check"></i> Devuelto</button>`:''}
        <button class="btn btn-danger" onclick="deleteRecord('prestamos','${p.id}','prestamos',${jsArg(p.documento)})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

async function returnLoan(id) {
  const { error } = await sb.from('prestamos').update({estado:'devuelto'}).eq('id', id);
  if(error) { toast('No se pudo registrar la devolución: ' + error.message, 'error'); return; }
  toast('Préstamo marcado como devuelto');
  refreshLoanViews();
}

function refreshLoanViews() {
  loadPrestamos();
  loadDashboard();
  const loaders = { general:loadGeneral, bodega_primavera:loadBodegaPrimavera, gestion:loadGestion, presidencia:loadPresidencia };
  loaders[currentSection]?.();
}

function loanIsOverdue(fechaDevolucion) {
  return !!fechaDevolucion && String(fechaDevolucion).slice(0,10) < localDateValue();
}

// ── AVISO DE PRESTADO EN LOS REGISTROS ─────────────────────────────────────
// Si la consulta falla (por ejemplo, sin la migración) las tablas se muestran
// sin aviso en lugar de romperse.
async function loadActiveLoans(table) {
  const { data, error } = await sb.from('prestamos').select('id,registro_id,solicitante,fecha_devolucion').eq('estado','activo').eq('registro_tabla',table);
  if(error) { console.error('No se cargaron los préstamos activos:', error.message); return new Map(); }
  return new Map((data||[]).map(p => [String(p.registro_id), p]));
}

function loanNotice(loan) {
  const venc = loanIsOverdue(loan.fecha_devolucion);
  return `<span class="badge ${venc?'badge-danger':'badge-warn'}"><i class="ti ti-arrows-left-right loan-notice-icon"></i>${venc?'Préstamo vencido':'Prestado'}</span><div class="loan-notice-sub">A ${escapeHtml(loan.solicitante)} · hasta <span class="mono">${escapeHtml(loan.fecha_devolucion)}</span></div>`;
}

function loanMenuItems(archivo, id, loan) {
  return loan
    ? [{label:'Marcar como devuelto', icon:'check', onclick:`returnLoan('${loan.id}')`}]
    : [{label:'Prestar', icon:'arrows-left-right', onclick:`openPrestamoDesdeRegistro(${jsArg(archivo)},'${id}')`}];
}

// ── SELECCIÓN DEL REGISTRO EN EL FORMULARIO DE PRÉSTAMO ────────────────────
const cajaLabel = r => `Caja ${r.numero_caja||'sin número'} — ${r.area||'Sin área'} — ${r.año||'Sin año'}`;
const personaLabel = r => `${r.nombre} — ${r.cedula}`;
const PRESTAMO_FUENTES = {
  'Archivo general': {table:'archivo_general', fields:['numero_caja','area','contenido','año'], label:cajaLabel},
  'Bodega Primavera': {table:'bodega_primavera', fields:['numero_caja','area','contenido','año'], label:cajaLabel},
  'Gestión humana — Activos': {table:'personal_activo', fields:['nombre','cedula'], label:personaLabel},
  'Gestión humana — Inactivos': {table:'personal_inactivo', fields:['nombre','cedula'], label:personaLabel},
  'Presidencia': {table:'presidencia', fields:['resumen','modulo','tipo','contenido'], label:r => `${r.resumen||'Sin resumen'} — Sección ${r.seccion||'-'}, módulo ${r.modulo||'-'}`}
};
let prestamoRegistro = null;
let prestamoResultados = [];
let prestamoBusquedaSeq = 0;

function resetPrestamoRegistro() {
  prestamoRegistro = null;
  prestamoResultados = [];
  prestamoBusquedaSeq++;
  document.getElementById('f-registro-seleccion').hidden = true;
  const input = document.getElementById('f-registro-buscar');
  input.hidden = false;
  input.value = '';
  document.getElementById('f-registro-resultados').innerHTML = '';
}

async function buscarRegistroPrestamo() {
  const fuente = PRESTAMO_FUENTES[val('f-archivo')];
  const q = val('f-registro-buscar').replace(/[,%()]/g, ' ').trim();
  const el = document.getElementById('f-registro-resultados');
  const seq = ++prestamoBusquedaSeq;
  if(!fuente || !q) { el.innerHTML = ''; return; }
  const [{data, error}, loans] = await Promise.all([
    sb.from(fuente.table).select('*').or(fuente.fields.map(f => `${f}.ilike.%${q}%`).join(',')).limit(8),
    loadActiveLoans(fuente.table)
  ]);
  if(seq !== prestamoBusquedaSeq) return;
  if(error) { el.innerHTML = `<p class="loan-picker-empty">No se pudo buscar: ${escapeHtml(error.message)}</p>`; return; }
  if(!data.length) { el.innerHTML = '<p class="loan-picker-empty">No se encontraron registros.</p>'; return; }
  prestamoResultados = data;
  el.innerHTML = data.map((r,i) => {
    const loan = loans.get(String(r.id));
    return `<button type="button" class="loan-picker-item" ${loan?'disabled':''} onclick="seleccionarRegistroPrestamo(${i})">${escapeHtml(fuente.label(r))}${loan?`<span class="loan-picker-busy">Prestado a ${escapeHtml(loan.solicitante)}</span>`:''}</button>`;
  }).join('');
}

function seleccionarRegistroPrestamo(i) {
  const fuente = PRESTAMO_FUENTES[val('f-archivo')];
  const r = prestamoResultados[i];
  if(!fuente || !r) return;
  fijarRegistroPrestamo(fuente, r);
  document.getElementById('f-solicitante').focus();
}

function fijarRegistroPrestamo(fuente, r) {
  const label = fuente.label(r);
  prestamoRegistro = {tabla:fuente.table, id:String(r.id)};
  document.getElementById('f-registro-seleccion-texto').textContent = label;
  document.getElementById('f-registro-seleccion').hidden = false;
  document.getElementById('f-registro-buscar').hidden = true;
  document.getElementById('f-registro-resultados').innerHTML = '';
  document.getElementById('f-documento').value = label;
}

async function openPrestamoDesdeRegistro(archivo, id) {
  const fuente = PRESTAMO_FUENTES[archivo];
  const { data, error } = await sb.from(fuente.table).select('*').eq('id', id).single();
  if(error || !data) { toast('No se pudo cargar el registro', 'error'); return; }
  openModal('prestamo');
  document.getElementById('f-archivo').value = archivo;
  fijarRegistroPrestamo(fuente, data);
}

