// ── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, type='ok') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.style.background = type==='error' ? 'var(--danger)' : 'var(--text)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
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
