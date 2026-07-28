// ── IMPORTAR IRON MOUNTAIN ─────────────────────────────────────────────────
let importIronCarpetas = [];
let importIronCajas = [];

function openImportIronMountainModal() {
  importIronCarpetas = [];
  importIronCajas = [];
  document.getElementById('file-input-iron').value = '';
  document.getElementById('import-preview-iron').style.display = 'none';
  document.getElementById('import-progress-iron').style.display = 'none';
  document.getElementById('btn-import-iron-confirm').style.display = 'none';
  document.getElementById('import-iron-overlay').classList.add('open');
}
function closeImportIronMountainModal() { document.getElementById('import-iron-overlay').classList.remove('open'); }
function closeImportIronMountainOutside(e) { if(e.target === document.getElementById('import-iron-overlay')) closeImportIronMountainModal(); }
function cleanIronValue(v) { return v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim(); }

function handleFileImportIronMountain(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array', cellDates:true});
      const carpetasSheet = wb.Sheets[wb.SheetNames.find(n => n.trim().toUpperCase() === 'CARPETAS')];
      const cajasSheet = wb.Sheets[wb.SheetNames.find(n => n.trim().toUpperCase() === 'CAJAS')];
      if(!carpetasSheet || !cajasSheet) throw new Error('El archivo debe contener las hojas CARPETAS y CAJAS.');
      // La fila 8 contiene encabezados; los registros comienzan en la fila 9.
      const carpetas = XLSX.utils.sheet_to_json(carpetasSheet, {header:1, range:8, raw:false, defval:null});
      const cajas = XLSX.utils.sheet_to_json(cajasSheet, {header:1, range:8, raw:false, defval:null});
      importIronCarpetas = carpetas.filter(r => cleanIronValue(r[0])).map(r => ({
        carpeta:cleanIronValue(r[0]), cliente:cleanIronValue(r[1]), alterno:cleanIronValue(r[2]), registro_inicial:cleanIronValue(r[3]), estado:cleanIronValue(r[4]), caja:cleanIronValue(r[5]), descripcion:cleanIronValue(r[6]), campo_usuario_1:cleanIronValue(r[7]), campo_usuario_2:cleanIronValue(r[8]), fecha_desde:cleanIronValue(r[9]), fecha_hasta:cleanIronValue(r[10]), consecutivo_desde:cleanIronValue(r[11]), consecutivo_hasta:cleanIronValue(r[12]), alterno_contenedor:cleanIronValue(r[13]), sucursal:cleanIronValue(r[14])
      }));
      importIronCajas = cajas.filter(r => cleanIronValue(r[0])).map(r => ({
        caja:cleanIronValue(r[0]), cliente:cleanIronValue(r[1]), codigo_alterno:cleanIronValue(r[2]), registro_inicial:cleanIronValue(r[3]), estado:cleanIronValue(r[4]), descripcion:cleanIronValue(r[5]), sucursal:cleanIronValue(r[6])
      }));
      const prev = document.getElementById('import-preview-iron');
      prev.innerHTML = `<div class="preview-info"><strong>${importIronCarpetas.length.toLocaleString('es-CO')}</strong> carpetas y <strong>${importIronCajas.length.toLocaleString('es-CO')}</strong> cajas listas para importar.</div>`;
      prev.style.display = 'block';
      document.getElementById('btn-import-iron-confirm').style.display = importIronCarpetas.length || importIronCajas.length ? 'inline-flex' : 'none';
    } catch(err) { toast(err.message || 'No se pudo leer el archivo', 'error'); }
  };
  reader.readAsArrayBuffer(file);
}

async function confirmImportIronMountain() {
  const total = importIronCarpetas.length + importIronCajas.length;
  if(!total) return;
  const btn = document.getElementById('btn-import-iron-confirm');
  const progress = document.getElementById('import-progress-iron');
  const fill = document.getElementById('import-progress-iron-fill');
  const count = document.getElementById('import-progress-iron-count');
  btn.disabled = true;
  progress.style.display = 'block';
  let done = 0;
  try {
    for(const [table, rows, conflict] of [['iron_mountain_cajas', importIronCajas, 'caja'], ['iron_mountain_carpetas', importIronCarpetas, 'carpeta']]) {
      for(let i=0; i<rows.length; i+=500) {
        const batch = rows.slice(i, i+500);
        const {error} = await sb.from(table).upsert(batch, {onConflict:conflict});
        if(error) throw error;
        done += batch.length;
        count.textContent = `${done.toLocaleString('es-CO')} / ${total.toLocaleString('es-CO')}`;
        fill.style.width = `${Math.round(done/total*100)}%`;
      }
    }
    toast(`${done.toLocaleString('es-CO')} registros de Iron Mountain importados`);
    closeImportIronMountainModal();
    ironMountainPage = 0;
    loadIronMountain();
  } catch(err) {
    toast('Error al importar: ' + err.message, 'error');
  } finally { btn.disabled = false; }
}
