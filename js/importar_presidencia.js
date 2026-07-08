// ── IMPORTAR — PRESIDENCIA ──────────────────────────────────────────────────
// Esquema real del archivo físico de presidencia: Estante, Sección, Módulo,
// Resumen (tema), Tipo de documento, Fecha (texto libre: a veces es una fecha
// exacta, a veces solo un año, a veces un rango como "2018-2021"), Contenido.

let importRowsPresidencia = [];

function openImportPresidenciaModal() {
  importRowsPresidencia = [];
  document.getElementById('file-input-presidencia').value = '';
  document.getElementById('import-preview-presidencia').style.display = 'none';
  document.getElementById('btn-import-presidencia-confirm').style.display = 'none';
  document.getElementById('import-presidencia-overlay').classList.add('open');
}
function closeImportPresidencia() {
  document.getElementById('import-presidencia-overlay').classList.remove('open');
}
function closeImportPresidenciaOutside(e) {
  if(e.target === document.getElementById('import-presidencia-overlay')) closeImportPresidencia();
}

function handleFileImportPresidencia(e) {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      importRowsPresidencia = XLSX.utils.sheet_to_json(ws).map(normalizePresidenciaRow);
      showImportPreviewPresidencia(importRowsPresidencia);
    } catch(err) { toast('Error al leer el archivo', 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function normalizePresidenciaRow(row) {
  const normalized = {};
  const mapKey = key => String(key||'')
    .normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n');
  const canonical = {
    'estante': 'Estante',
    'seccion': 'Sección',
    'modulo': 'Módulo',
    'resumen': 'Resumen',
    'tipo': 'Tipo',
    'fecha': 'Fecha',
    'contenido': 'Contenido'
  };
  Object.entries(row).forEach(([key, value]) => {
    const canon = canonical[mapKey(key)] || key;
    normalized[canon] = value;
  });
  return normalized;
}

// Convierte el valor crudo de la columna Fecha (fecha real, año suelto, o
// rango de años en texto) a un texto legible, sin forzar una fecha inválida.
function formatFechaPresidencia(v) {
  if(v === undefined || v === null || v === '') return null;
  if(v instanceof Date) {
    if(isNaN(v.getTime())) return null;
    const yyyy = v.getFullYear(), mm = String(v.getMonth()+1).padStart(2,'0'), dd = String(v.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if(typeof v === 'number') {
    if(v >= 1900 && v <= 2100 && Number.isInteger(v)) return String(v); // es un año suelto, no una fecha
    const parsed = XLSX.SSF.parse_date_code(v);
    if(parsed) return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`;
    return String(v);
  }
  return String(v).trim() || null;
}

function showImportPreviewPresidencia(rows) {
  const prev = document.getElementById('import-preview-presidencia');
  if(!rows.length) { prev.innerHTML = '<p style="color:var(--danger);font-size:12px">El archivo está vacío.</p>'; prev.style.display = 'block'; return; }
  const required = ['Estante','Sección','Módulo','Resumen'];
  const headers = Object.keys(rows[0]);
  const missing = required.filter(f => !headers.includes(f));
  const valid = rows.filter(r => required.every(f => r[f] !== undefined && r[f] !== null && String(r[f]).trim() !== ''));

  prev.innerHTML = `<div style="padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);font-size:12px">
    <strong>${rows.length} filas encontradas · ${valid.length} válidas</strong>
    ${missing.length ? `<p style="margin:0.5rem 0 0;color:var(--danger)">Faltan columnas requeridas: ${missing.join(', ')}</p>` : ''}
    ${(!missing.length && valid.length < rows.length) ? `<p style="margin:0.5rem 0 0;color:var(--warning)">${rows.length - valid.length} fila(s) sin Estante/Sección/Módulo/Resumen no se importarán.</p>` : ''}
    <div style="margin-top:8px;overflow-x:auto"><table style="font-size:11px;border-collapse:collapse">
      <tr>${headers.map(k=>`<th style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border)">${k}</th>`).join('')}</tr>
      ${rows.slice(0,3).map(r=>`<tr>${headers.map(h=>`<td style="padding:4px 8px;border:1px solid var(--border)">${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></div>
  </div>`;
  prev.style.display = 'block';
  document.getElementById('btn-import-presidencia-confirm').style.display = (valid.length > 0 && missing.length === 0) ? 'inline-flex' : 'none';
}

async function confirmImportPresidencia() {
  const required = ['Estante','Sección','Módulo','Resumen'];
  const records = importRowsPresidencia
    .filter(r => required.every(f => r[f] !== undefined && r[f] !== null && String(r[f]).trim() !== ''))
    .map(r => ({
      estante: String(r['Estante']).trim().replace(/\.0$/, ''),
      seccion: String(r['Sección']).trim().toUpperCase(),
      modulo: String(r['Módulo']).trim(),
      resumen: String(r['Resumen']).trim(),
      tipo: r['Tipo'] ? String(r['Tipo']).trim() : null,
      fecha: formatFechaPresidencia(r['Fecha']),
      contenido: r['Contenido'] ? String(r['Contenido']).trim() : null
    }));
  if(!records.length) { toast('No hay filas válidas para importar', 'error'); return; }
  const { error } = await sb.from('presidencia').insert(records);
  if(error) { toast('Error al importar: ' + error.message, 'error'); return; }
  toast(`${records.length} documentos importados a Presidencia`);
  closeImportPresidencia();
  loadPresidencia();
  populateSeccionFilter();
  loadDashboard();
}
