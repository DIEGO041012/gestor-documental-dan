// ── IMPORTAR ────────────────────────────────────────────────────────────────
function openImportModal() {
  importRows=[]; importTab='activos';
  document.getElementById('file-input').value='';
  document.getElementById('import-preview').style.display='none';
  document.getElementById('btn-import-confirm').style.display='none';
  document.getElementById('imp-tab-act').classList.add('active');
  document.getElementById('imp-tab-ina').classList.remove('active');
  setImportHint();
  document.getElementById('import-overlay').classList.add('open');
}
function closeImport() { document.getElementById('import-overlay').classList.remove('open'); }
function closeImportOutside(e) { if(e.target===document.getElementById('import-overlay')) closeImport(); }

function setImportTab(tab) {
  importTab=tab; importRows=[];
  document.getElementById('file-input').value='';
  document.getElementById('import-preview').style.display='none';
  document.getElementById('btn-import-confirm').style.display='none';
  document.getElementById('imp-tab-act').classList.toggle('active', tab==='activos');
  document.getElementById('imp-tab-ina').classList.toggle('active', tab==='inactivos');
  setImportHint();
}
function setImportHint() {
  document.getElementById('imp-hint').innerHTML = importTab==='activos'
    ? '<strong>Columnas requeridas:</strong> Nombre completo, Cédula, Año, Mes, Día'
    : '<strong>Columnas requeridas:</strong> Nombre completo, Cédula, Fecha inicio, Fecha final (opcional), Ubicación (opcional)';
}

function handleFileImport(e) {
  const file = e.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      importRows = XLSX.utils.sheet_to_json(ws).map(normalizeImportRow);
      showImportPreview(importRows);
    } catch(err) { toast('Error al leer el archivo', 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

function normalizeImportRow(row) {
  const normalized = {};
  const mapKey = key => String(key||'')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ñ/g, 'n');

  const canonical = {
    'nombre completo': 'Nombre completo',
    'nombre': 'Nombre completo',
    'cedula': 'Cédula',
    'cédula': 'Cédula',
    'fecha inicio': 'Fecha inicio',
    'fecha de inicio': 'Fecha inicio',
    'fecha_inicio': 'Fecha inicio',
    'fecha_inicio': 'Fecha inicio',
    'fecha_final': 'Fecha final',
    'fecha final': 'Fecha final',
    'fecha_final': 'Fecha final',
    'ubicacion': 'Ubicación',
    'ubicación': 'Ubicación',
    'año': 'Año',
    'ano': 'Año',
    'mes': 'Mes',
    'dia': 'Día',
    'dí­a': 'Día',
    'inicio': 'Fecha inicio',
    'inicio fecha': 'Fecha inicio',
    'fecha inicio': 'Fecha inicio',
    'fecha inicial': 'Fecha inicio'
  };

  Object.entries(row).forEach(([key, value]) => {
    const nk = mapKey(key);
    const canon = canonical[nk] || key;
    normalized[canon] = value;
  });
  return normalized;
}

function showImportPreview(rows) {
  const prev = document.getElementById('import-preview');
  if(!rows.length) { prev.innerHTML='<p style="color:var(--danger);font-size:12px">El archivo está vacío.</p>'; prev.style.display='block'; return; }
  const valid = rows.filter(r => r['Nombre completo'] && r['Cédula']);
  const headers = Object.keys(rows[0]);
  const required = importTab==='activos'
    ? ['Nombre completo','Cédula','Año','Mes','Día']
    : ['Nombre completo','Cédula','Fecha inicio'];
  const missing = required.filter(f => !headers.includes(f));
  let invalidInfo = '';
  let invalidStartRows = [];
  if (importTab==='inactivos' && !missing.length) {
    invalidStartRows = rows.map((r,i) => ({value: r['Fecha inicio'], index: i+1}))
      .filter(x => !parseExcelDate(x.value));
    if (invalidStartRows.length) {
      invalidInfo = `<p style="margin:0.5rem 0 0;color:var(--danger)">Fecha inicio inválida en filas: ${invalidStartRows.map(x => x.index).join(', ')}</p>`;
    }
  }
  prev.innerHTML = `<div style="padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);font-size:12px">
    <strong>${rows.length} filas encontradas · ${valid.length} válidas</strong>
    ${missing.length ? `<p style="margin:0.5rem 0 0;color:var(--danger)">Faltan columnas requeridas: ${missing.join(', ')}</p>` : ''}
    ${invalidInfo}
    <div style="margin-top:8px;overflow-x:auto"><table style="font-size:11px;border-collapse:collapse">
      <tr>${headers.map(k=>`<th style="padding:4px 8px;background:var(--surface2);border:1px solid var(--border)">${k}</th>`).join('')}</tr>
      ${rows.slice(0,3).map(r=>`<tr>${headers.map(h=>`<td style="padding:4px 8px;border:1px solid var(--border)">${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}
    </table></div>
  </div>`;
  prev.style.display='block';
  document.getElementById('btn-import-confirm').style.display = (valid.length>0 && missing.length===0 && invalidStartRows.length===0) ? 'inline-flex' : 'none';
}


async function confirmImport() {
  const table = importTab==='activos' ? 'personal_activo' : 'personal_inactivo';
  const records = importRows.filter(r=>r['Nombre completo']&&r['Cédula']).map(r => {
    const nombre = String(r['Nombre completo']).trim();
    const cedula = String(r['Cédula']||'').trim();
    if(importTab==='activos') {
      return { nombre, cedula, año: parseInt(getField(r, 'Año','ano'))||new Date().getFullYear(), mes: Math.min(Math.max(parseInt(getField(r, 'Mes','mes'))||1,1),12), dia: parseInt(getField(r, 'Día','Dia','dia'))||1 };
    } else {
      return {
        nombre,
        cedula,
        fecha_inicio: parseExcelDate(getField(r, 'Fecha inicio','Fecha de inicio','fecha_inicio','Inicio','Inicio fecha')),
        fecha_final: parseExcelDate(getField(r, 'Fecha final','Fecha de final','fecha_final')),
        ubicacion: String(getField(r, 'Ubicación','Ubicacion','ubicacion')) .trim() || null
      };
    }
  });
  const invalidStart = records.map((r,i) => ({r,i})).filter(x => !x.r.fecha_inicio);
  if(invalidStart.length > 0) {
    const rowIndexes = invalidStart.map(x => x.i + 1).join(', ');
    toast(`${invalidStart.length} registro(s) sin fecha de inicio válida (filas: ${rowIndexes}), revisa el archivo`, 'error');
    return;
  }
  const { error } = await sb.from(table).insert(records);
  if(error) { toast('Error al importar: ' + error.message, 'error'); return; }
  toast(`${records.length} registros importados`);
  closeImport();
  setGestionTab(importTab);
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  if(importTab==='activos') {
    const ws = XLSX.utils.aoa_to_sheet([['Nombre completo','Cédula','Año','Mes','Día'],['Apellido Nombre Ejemplo','12345678',2024,1,15]]);
    XLSX.utils.book_append_sheet(wb, ws, 'Personal Activo');
    XLSX.writeFile(wb, 'plantilla_personal_activo.xlsx');
  } else {
    const ws = XLSX.utils.aoa_to_sheet([['Nombre completo','Cédula','Fecha inicio','Fecha final','Ubicación'],['Apellido Nombre Ejemplo','12345678','2020-01-15','2024-06-30','G-01']]);
    XLSX.utils.book_append_sheet(wb, ws, 'Personal Inactivo');
    XLSX.writeFile(wb, 'plantilla_personal_inactivo.xlsx');
  }
  toast('Plantilla descargada');
}

