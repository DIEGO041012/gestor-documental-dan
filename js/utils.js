// Escapa texto de la base de datos antes de insertarlo con innerHTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

// Fecha local de hoy en formato yyyy-mm-dd (toISOString usaría UTC)
function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function parseExcelDate(v) {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth()+1).padStart(2,'0');
    const dd = String(v.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof v === 'number') {
    const parsed = XLSX.SSF.parse_date_code(v);
    if (parsed) {
      const mm = String(parsed.m).padStart(2,'0');
      const dd = String(parsed.d).padStart(2,'0');
      return `${parsed.y}-${mm}-${dd}`;
    }
    return null;
  }
  let s = String(v).trim();
  if (!s) return null;
  // If the string contains time, remove it
  if (s.includes(' ')) s = s.split(' ')[0].trim();
  // Normalize common separators
  s = s.replace(/\./g, '/').replace(/-/g, '/');
  // Try dd/mm/yyyy or dd/mm/yy
  let dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (dmy) {
    const [, d, m, y2] = dmy;
    const year = Number(y2) < 70 ? `20${y2}` : `19${y2}`;
    return `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  // Try ISO format yyyy/mm/dd or yyyy-mm-dd
  const ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymd) {
    const [, y, m, d] = ymd;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  const sISO = s.replace(/\//g, '-');
  const date = new Date(sISO);
  if (!isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth()+1).padStart(2,'0');
    const dd = String(date.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function getField(row, ...keys) {
  return keys.map(k => row[k]).find(v => v !== undefined && v !== null);
}

// Devuelve solamente los registros que todavía no existen. La identidad se
// construye con campos de negocio (no con el id interno de Supabase), y también
// elimina repetidos dentro del mismo archivo Excel.
function importRecordKey(record, fields) {
  return fields.map(field => String(record[field] ?? '').trim().toLowerCase()).join('\u001f');
}

async function filterNewImportRecords(table, records, identityFields) {
  const existingKeys = new Set();
  const pageSize = 1000;

  for(let from = 0; ; from += pageSize) {
    const {data, error} = await sb.from(table)
      .select(identityFields.join(','))
      .order('id', {ascending:true})
      .range(from, from + pageSize - 1);
    if(error) throw error;
    (data || []).forEach(row => existingKeys.add(importRecordKey(row, identityFields)));
    if(!data || data.length < pageSize) break;
  }

  const newRecords = [];
  let skipped = 0;
  records.forEach(record => {
    const key = importRecordKey(record, identityFields);
    if(existingKeys.has(key)) {
      skipped++;
      return;
    }
    existingKeys.add(key);
    newRecords.push(record);
  });
  return {newRecords, skipped};
}
