// ── IMPORTAR — RADICADOS ────────────────────────────────────────────────────
// El formato oficial "P4_042_R04" tiene encabezados fusionados en 2 filas
// (fila 5 y 6) y arranca los datos en la fila 7, así que en vez de leer por
// nombre de columna, leemos por POSICIÓN — igual como está armada la
// plantilla real, sin importar si cambia el texto del encabezado.
//
// Columnas (0-indexadas desde A): 0 Consecutivo, 1 Fecha de recibido,
// 2 Documentos, 3 Tipo=Personal (marca "X"), 4 Tipo=Corporativo (marca "X"),
// 5 Hora de recibido, 6 Remitente, 7 Área, 8 Destinatario,
// 9 Responsable que recibe, 10 Soporte/observaciones.
//
// El archivo puede traer varias hojas (una por año, por ejemplo) — se leen
// todas y se combinan en una sola importación.

let importRowsRadicados = [];
const RADICADOS_IMPORT_BATCH = 1000;

function openImportRadicadosModal() {
  importRowsRadicados = [];
  document.getElementById('file-input-radicados').value = '';
  document.getElementById('import-preview-radicados').style.display = 'none';
  document.getElementById('import-progress-radicados').style.display = 'none';
  document.getElementById('btn-import-radicados-confirm').style.display = 'none';
  document.getElementById('import-radicados-overlay').classList.add('open');
}
function closeImportRadicados() {
  document.getElementById('import-radicados-overlay').classList.remove('open');
}
function closeImportRadicadosOutside(e) {
  if(e.target === document.getElementById('import-radicados-overlay')) closeImportRadicados();
}

function handleFileImportRadicados(e) {
  const file = e.target.files[0]; if(!file) return;
  const prev = document.getElementById('import-preview-radicados');
  prev.style.display = 'block';
  prev.innerHTML = `<div class="loading"><i class="ti ti-loader"></i> Leyendo archivo...</div>`;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, {type:'array', cellDates:true});
      let rows = [];
      wb.SheetNames.forEach(name => {
        const ws = wb.Sheets[name];
        const arr = XLSX.utils.sheet_to_json(ws, {header:1, range:6, defval:null});
        rows = rows.concat(arr);
      });
      importRowsRadicados = rows
        .filter(row => (row[0] !== null && row[0] !== '') || (row[2] !== null && row[2] !== ''))
        .map(normalizeRadicadoRow);
      showImportPreviewRadicados(importRowsRadicados);
    } catch(err) { prev.innerHTML = '<p style="color:var(--danger);font-size:12px">Error al leer el archivo.</p>'; toast('Error al leer el archivo', 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function formatFechaRadicado(v) {
  if(v === undefined || v === null || v === '') return null;
  if(v instanceof Date) {
    if(isNaN(v.getTime())) return null;
    return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
  }
  if(typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    if(parsed) return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
    return null;
  }
  let s = String(v).trim();
  if(!s) return null;
  s = s.replace(/\/{2,}/g, '/'); // corrige typos como "18//11/2025"
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) { const [,d,mo,y] = m; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(m) { const [,y,mo,d] = m; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  const dt = new Date(s);
  if(!isNaN(dt.getTime())) return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return null;
}

function formatHoraRadicado(v) {
  if(v === undefined || v === null || v === '') return null;
  if(v instanceof Date) {
    let h = v.getHours(), m = v.getMinutes();
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    let h12 = h % 12; if(h12 === 0) h12 = 12;
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  }
  return String(v).trim() || null;
}

function clean(v) {
  if(v === undefined || v === null) return null;
  const s = String(v).trim().replace(/\s+/g, ' ');
  return s || null;
}

function normalizeRadicadoRow(row) {
  const marcaPersonal = row[3] !== null && row[3] !== undefined && String(row[3]).trim() !== '';
  const marcaCorporativo = row[4] !== null && row[4] !== undefined && String(row[4]).trim() !== '';
  return {
    consecutivo: clean(row[0]),
    fecha_recibido: formatFechaRadicado(row[1]),
    documento: clean(row[2]),
    tipo: marcaCorporativo ? 'Corporativo' : (marcaPersonal ? 'Personal' : null),
    hora_recibido: formatHoraRadicado(row[5]),
    remitente: clean(row[6]),
    area: clean(row[7]),
    destinatario: clean(row[8]),
    responsable_recibe: clean(row[9]),
    soporte: clean(row[10])
  };
}

function showImportPreviewRadicados(rows) {
  const prev = document.getElementById('import-preview-radicados');
  if(!rows.length) { prev.innerHTML = '<p style="color:var(--danger);font-size:12px">No se encontraron filas de datos a partir de la fila 7.</p>'; return; }
  const sinFecha = rows.filter(r => !r.fecha_recibido).length;
  prev.innerHTML = `<div style="padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);font-size:12px">
    <strong>${rows.length.toLocaleString('es-CO')} filas encontradas (todas las hojas combinadas)</strong>
    ${sinFecha ? `<p style="margin:0.5rem 0 0;color:var(--warning)">${sinFecha} fila(s) sin una fecha reconocible — se importarán igual con la fecha en blanco.</p>` : ''}
    ${rows.length > 3000 ? `<p style="margin:0.5rem 0 0;color:var(--text-2)">Es un archivo grande — la importación se hace en lotes y puede tardar uno o dos minutos, no cierres esta ventana.</p>` : ''}
    <div style="margin-top:8px;overflow-x:auto"><table style="font-size:11px;border-collapse:collapse">
      <tr>${['Consecutivo','Fecha','Documento','Tipo','Hora','Remitente','Área','Destinatario','Responsable','Soporte'].map(k=>`<th style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border)">${k}</th>`).join('')}</tr>
      ${rows.slice(0,3).map(r=>`<tr>${['consecutivo','fecha_recibido','documento','tipo','hora_recibido','remitente','area','destinatario','responsable_recibe','soporte'].map(k=>`<td style="padding:4px 8px;border:1px solid var(--border)">${r[k] ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></div>
  </div>`;
  document.getElementById('btn-import-radicados-confirm').style.display = 'inline-flex';
}

async function confirmImportRadicados() {
  const records = importRowsRadicados;
  if(!records.length) { toast('No hay filas para importar', 'error'); return; }

  document.getElementById('btn-import-radicados-confirm').disabled = true;
  document.getElementById('btn-import-radicados-confirm').style.opacity = '0.6';
  const progressWrap = document.getElementById('import-progress-radicados');
  const fill = document.getElementById('import-progress-fill');
  const count = document.getElementById('import-progress-count');
  progressWrap.style.display = 'block';

  let done = 0, failed = 0;
  for(let i = 0; i < records.length; i += RADICADOS_IMPORT_BATCH) {
    const batch = records.slice(i, i + RADICADOS_IMPORT_BATCH);
    const { error } = await sb.from('radicados').insert(batch);
    if(error) { failed += batch.length; console.error('Lote falló:', error.message); }
    else { done += batch.length; }
    const progress = Math.round(((i + batch.length) / records.length) * 100);
    fill.style.width = progress + '%';
    count.textContent = `${(i + batch.length).toLocaleString('es-CO')} / ${records.length.toLocaleString('es-CO')}`;
  }

  document.getElementById('btn-import-radicados-confirm').disabled = false;
  document.getElementById('btn-import-radicados-confirm').style.opacity = '1';

  if(failed > 0) toast(`${done.toLocaleString('es-CO')} importados, ${failed.toLocaleString('es-CO')} fallaron — revisa la consola`, 'error');
  else toast(`${done.toLocaleString('es-CO')} radicados importados`);

  closeImportRadicados();
  radicadosPage = 0;
  loadRadicados();
  populateRadicadosFilters();
  loadDashboard();
}
