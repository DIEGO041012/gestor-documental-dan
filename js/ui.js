// ── COMPONENTES DE INTERFAZ ────────────────────────────────────────────────
// Equivalentes en JS sin framework de los patrones de shadcn/ui: Sonner
// (toasts), AlertDialog (confirmaciones), Dialog (Esc y foco en los modales),
// DropdownMenu (acciones por fila) y Skeleton (estados de carga).

// ── TOAST (apilados) ───────────────────────────────────────────────────────
const TOAST_LIMIT = 4;

function toast(msg, type='ok') {
  let stack = document.getElementById('toast-stack');
  if(!stack) {
    stack = document.createElement('div');
    stack.id = 'toast-stack';
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    document.body.appendChild(stack);
  }
  const isError = type === 'error';
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' toast-error' : '');
  el.innerHTML = `<i class="ti ${isError ? 'ti-alert-circle' : 'ti-circle-check'}"></i><span class="toast-msg"></span><button type="button" class="toast-close" aria-label="Cerrar notificación"><i class="ti ti-x"></i></button>`;
  el.querySelector('.toast-msg').textContent = msg;

  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200);
  };
  // Los errores quedan más tiempo en pantalla: suelen traer un mensaje que hay que leer
  const start = () => { timer = setTimeout(dismiss, isError ? 7000 : 3500); };
  el.querySelector('.toast-close').onclick = dismiss;
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', start);

  stack.appendChild(el);
  while(stack.children.length > TOAST_LIMIT) stack.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  start();
}

// ── CONFIRMACIÓN (AlertDialog) ─────────────────────────────────────────────
// Reemplaza a confirm(). Devuelve una promesa que resuelve true si el usuario
// confirma. Con danger:true el foco inicial queda en "Cancelar".
function confirmDialog({title, description='', confirmLabel='Confirmar', cancelLabel='Cancelar', danger=false}) {
  return new Promise(resolve => {
    const returnFocus = document.activeElement;
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm-dialog';
    dlg.setAttribute('role', 'alertdialog');
    dlg.setAttribute('aria-labelledby', 'confirm-dialog-title');
    if(description) dlg.setAttribute('aria-describedby', 'confirm-dialog-description');
    dlg.innerHTML = `<div class="confirm-dialog-content">
      <div class="confirm-dialog-icon${danger ? ' danger' : ''}"><i class="ti ${danger ? 'ti-alert-triangle' : 'ti-help-circle'}"></i></div>
      <h3 id="confirm-dialog-title">${escapeHtml(title)}</h3>
      ${description ? `<p id="confirm-dialog-description">${escapeHtml(description)}</p>` : ''}
      <div class="confirm-dialog-actions">
        <button type="button" class="btn btn-secondary" data-result="cancel">${escapeHtml(cancelLabel)}</button>
        <button type="button" class="btn ${danger ? 'btn-destructive' : 'btn-primary'}" data-result="ok">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;

    let confirmed = false;
    dlg.addEventListener('click', e => {
      const btn = e.target.closest('[data-result]');
      if(btn) { confirmed = btn.dataset.result === 'ok'; dlg.close(); }
      else if(e.target === dlg) dlg.close(); // clic en el fondo
    });
    dlg.addEventListener('close', () => {
      dlg.remove();
      if(returnFocus && document.contains(returnFocus)) returnFocus.focus();
      resolve(confirmed);
    });

    document.body.appendChild(dlg);
    dlg.showModal();
    dlg.querySelector(danger ? '[data-result="cancel"]' : '[data-result="ok"]').focus();
  });
}

// ── MODALES (Dialog): Esc, foco atrapado y foco de regreso ─────────────────
// Los modales existentes se abren y cierran con la clase "open" sobre .overlay;
// aquí se observa ese cambio para no tener que tocar cada función open/close.
const openOverlays = [];
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function visibleFocusables(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter(el => el.getClientRects().length);
}

function syncOverlay(overlay) {
  const isOpen = overlay.classList.contains('open');
  const idx = openOverlays.indexOf(overlay);
  if(isOpen && idx === -1) {
    overlay._returnFocus = document.activeElement;
    openOverlays.push(overlay);
    document.body.classList.add('modal-open');
    // Espera un cuadro: algunos modales rellenan su cuerpo justo después de abrir
    requestAnimationFrame(() => {
      const modal = overlay.querySelector('.modal');
      const body = modal.querySelector('.modal-body');
      const target = visibleFocusables(body || modal).find(el => el.matches('input, select, textarea')) || visibleFocusables(modal)[0];
      if(target) target.focus();
    });
  } else if(!isOpen && idx !== -1) {
    openOverlays.splice(idx, 1);
    if(!openOverlays.length) document.body.classList.remove('modal-open');
    const back = overlay._returnFocus;
    if(back && document.contains(back) && back.getClientRects().length) back.focus();
  }
}

function initOverlays() {
  document.querySelectorAll('.overlay').forEach(overlay => {
    const modal = overlay.querySelector('.modal');
    if(!modal) return;
    const title = modal.querySelector('.modal-header h3');
    if(title && !title.id) title.id = overlay.id + '-title';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    if(title) modal.setAttribute('aria-labelledby', title.id);
    modal.querySelectorAll('.modal-close').forEach(btn => { if(!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', 'Cerrar'); });
    new MutationObserver(() => syncOverlay(overlay)).observe(overlay, {attributes:true, attributeFilter:['class']});
  });
}

// ── MENÚ DE ACCIONES POR FILA (DropdownMenu) ───────────────────────────────
// items: [{label, icon, onclick, danger}] o {separator:true}. "onclick" es el
// código JS del atributo; los textos que vengan de la base de datos deben
// pasarse con jsArg() para que queden escapados.
function rowActions(items) {
  const list = items.map(it => it.separator
    ? '<div class="row-menu-sep" role="separator"></div>'
    : `<button type="button" role="menuitem" tabindex="-1" class="row-menu-item${it.danger ? ' danger' : ''}" onclick="${it.onclick}"><i class="ti ti-${it.icon}"></i>${escapeHtml(it.label)}</button>`
  ).join('');
  return `<div class="row-menu"><button type="button" class="row-menu-trigger" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones" title="Acciones" onclick="toggleRowMenu(this)"><i class="ti ti-dots"></i></button><div class="row-menu-list" role="menu" hidden>${list}</div></div>`;
}

// Convierte un valor en un literal de JS seguro dentro de un atributo onclick="..."
function jsArg(value) {
  return escapeHtml(JSON.stringify(String(value ?? '')));
}

let activeRowMenu = null;

function closeRowMenu(focusTrigger=false) {
  if(!activeRowMenu) return;
  const {trigger, list} = activeRowMenu;
  list.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  activeRowMenu = null;
  if(focusTrigger && document.contains(trigger)) trigger.focus();
}

function toggleRowMenu(trigger) {
  const list = trigger.nextElementSibling;
  if(activeRowMenu && activeRowMenu.trigger === trigger) { closeRowMenu(); return; }
  closeRowMenu();
  list.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  activeRowMenu = {trigger, list};

  // Posición fija para que el menú no quede recortado por el scroll de la tabla
  const r = trigger.getBoundingClientRect();
  const w = list.offsetWidth, h = list.offsetHeight;
  const top = r.bottom + 4 + h > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4;
  list.style.top = top + 'px';
  list.style.left = Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) + 'px';
  list.querySelector('.row-menu-item')?.focus();
}

// Captura: cierra el menú antes de que corra la acción, así el foco vuelve al
// botón "⋯" y los modales/confirmaciones que se abran lo recuerdan.
document.addEventListener('click', e => {
  if(!activeRowMenu) return;
  if(e.target.closest('.row-menu-item')) closeRowMenu(true);
  else if(!e.target.closest('.row-menu')) closeRowMenu();
}, true);
window.addEventListener('resize', () => closeRowMenu());
document.addEventListener('scroll', e => {
  if(activeRowMenu && !activeRowMenu.list.contains(e.target)) closeRowMenu();
}, true);

// ── TECLADO GLOBAL ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(activeRowMenu) {
    const items = [...activeRowMenu.list.querySelectorAll('.row-menu-item')];
    const i = items.indexOf(document.activeElement);
    if(e.key === 'Escape') { e.preventDefault(); closeRowMenu(true); }
    else if(e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if(e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if(e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if(e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if(e.key === 'Tab') closeRowMenu();
    return;
  }
  // Un <dialog> nativo abierto (confirmación) maneja su propio Esc y foco
  if(document.querySelector('dialog[open]')) return;
  const overlay = openOverlays[openOverlays.length - 1];
  if(!overlay) return;
  if(e.key === 'Escape') {
    e.preventDefault();
    overlay.querySelector('.modal-close')?.click();
  } else if(e.key === 'Tab') {
    const items = visibleFocusables(overlay.querySelector('.modal'));
    if(!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if(e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }
});

// ── SKELETON ───────────────────────────────────────────────────────────────
function skeletonRows(cols, rows=6) {
  const row = `<tr class="skeleton-row" aria-hidden="true">${'<td><span class="skeleton"></span></td>'.repeat(cols)}</tr>`;
  return `<tr class="sr-only"><td colspan="${cols}">Cargando…</td></tr>` + row.repeat(rows);
}

function skeletonTable(cols, rows=6) {
  return `<table><tbody>${skeletonRows(cols, rows)}</tbody></table>`;
}

// Sustituye los "Cargando..." iniciales del HTML por filas skeleton del mismo
// número de columnas que la tabla.
function hydrateLoadingPlaceholders() {
  document.querySelectorAll('tbody').forEach(tb => {
    if(tb.rows.length !== 1 || !tb.querySelector('.loading')) return;
    const cols = tb.closest('table').querySelectorAll('thead th').length || 1;
    tb.innerHTML = skeletonRows(cols);
  });
}

// ── BÚSQUEDA CON DEBOUNCE ──────────────────────────────────────────────────
// Evita una consulta a Supabase por cada tecla.
const searchTimers = {};
function debounceSearch(key, fn, ms=300) {
  clearTimeout(searchTimers[key]);
  searchTimers[key] = setTimeout(fn, ms);
}

document.addEventListener('DOMContentLoaded', () => {
  initOverlays();
  hydrateLoadingPlaceholders();
});
