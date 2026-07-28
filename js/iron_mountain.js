// ── REGISTROS IRON MOUNTAIN ────────────────────────────────────────────────
function ironEscape(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function setIronMountainTab(tab) {
  ironMountainTab = tab;
  ironMountainPage = 0;
  document.getElementById('iron-tab-carpetas').classList.toggle('active', tab === 'carpetas');
  document.getElementById('iron-tab-cajas').classList.toggle('active', tab === 'cajas');
  loadIronMountain();
}

function ironMountainQuery(forCount) {
  const table = ironMountainTab === 'carpetas' ? 'iron_mountain_carpetas' : 'iron_mountain_cajas';
  const search = document.getElementById('search-iron-mountain').value.trim().replace(/[,%()]/g, ' ');
  const estado = document.getElementById('filter-iron-estado').value;
  let query = sb.from(table).select('*', forCount ? {count:'exact', head:true} : undefined);
  if(estado) query = query.eq('estado', estado);
  if(search) {
    const fields = ironMountainTab === 'carpetas'
      ? ['carpeta','alterno','caja','descripcion','sucursal']
      : ['caja','codigo_alterno','descripcion','sucursal'];
    query = query.or(fields.map(field => `${field}.ilike.%${search}%`).join(','));
  }
  return query;
}

async function loadIronMountain() {
  const wrap = document.getElementById('table-iron-mountain-wrap');
  wrap.innerHTML = '<div class="loading"><i class="ti ti-loader"></i> Cargando...</div>';
  const countResult = await ironMountainQuery(true);
  ironMountainTotal = countResult.count || 0;
  const from = ironMountainPage * IRON_MOUNTAIN_PAGE_SIZE;
  const {data, error} = await ironMountainQuery(false).order(ironMountainTab === 'carpetas' ? 'carpeta' : 'caja').range(from, from + IRON_MOUNTAIN_PAGE_SIZE - 1);
  if(error) {
    wrap.innerHTML = `<div class="empty"><i class="ti ti-alert-circle"></i><p>${ironEscape(error.message)}</p></div>`;
    document.getElementById('iron-page-info').textContent = '';
    return;
  }
  if(!data?.length) {
    wrap.innerHTML = '<div class="empty"><i class="ti ti-building-warehouse"></i><p>Sin registros.</p></div>';
  } else if(ironMountainTab === 'carpetas') {
    wrap.innerHTML = `<table><thead><tr><th>#</th><th>Carpeta</th><th>Cliente</th><th>Alterno</th><th>Registro inicial</th><th>Estado</th><th>Caja</th><th>Descripción</th><th>Fecha desde</th><th>Fecha hasta</th><th>Sucursal</th><th>Acciones</th></tr></thead><tbody>${data.map((r,i)=>`<tr><td>${from+i+1}</td><td class="mono">${ironEscape(r.carpeta)}</td><td>${ironEscape(r.cliente)}</td><td class="mono">${ironEscape(r.alterno)}</td><td>${ironEscape(r.registro_inicial)}</td><td><span class="badge ${r.estado==='EN PRESTAMO'?'badge-warn':'badge-ok'}">${ironEscape(r.estado||'-')}</span></td><td class="mono">${ironEscape(r.caja)}</td><td>${ironEscape(r.descripcion)}</td><td class="mono">${ironEscape(r.fecha_desde)}</td><td class="mono">${ironEscape(r.fecha_hasta)}</td><td>${ironEscape(r.sucursal)}</td><td><button class="btn btn-edit" onclick="editRecord('iron_carpetas','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('iron_mountain_carpetas','${r.id}','iron_mountain')">Eliminar</button></td></tr>`).join('')}</tbody></table>`;
  } else {
    wrap.innerHTML = `<table><thead><tr><th>#</th><th>Caja</th><th>Cliente</th><th>Código alterno</th><th>Registro inicial</th><th>Estado</th><th>Descripción</th><th>Sucursal</th><th>Acciones</th></tr></thead><tbody>${data.map((r,i)=>`<tr><td>${from+i+1}</td><td class="mono">${ironEscape(r.caja)}</td><td>${ironEscape(r.cliente)}</td><td class="mono">${ironEscape(r.codigo_alterno)}</td><td>${ironEscape(r.registro_inicial)}</td><td><span class="badge ${r.estado==='EN PRESTAMO'?'badge-warn':'badge-ok'}">${ironEscape(r.estado||'-')}</span></td><td>${ironEscape(r.descripcion)}</td><td>${ironEscape(r.sucursal)}</td><td><button class="btn btn-edit" onclick="editRecord('iron_cajas','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('iron_mountain_cajas','${r.id}','iron_mountain')">Eliminar</button></td></tr>`).join('')}</tbody></table>`;
  }
  const end = Math.min(from + (data?.length || 0), ironMountainTotal);
  document.getElementById('iron-page-info').textContent = `Mostrando ${ironMountainTotal ? from+1 : 0}–${end} de ${ironMountainTotal.toLocaleString('es-CO')}`;
}

function ironMountainPrevPage() { if(ironMountainPage > 0) { ironMountainPage--; loadIronMountain(); } }
function ironMountainNextPage() { if((ironMountainPage+1)*IRON_MOUNTAIN_PAGE_SIZE < ironMountainTotal) { ironMountainPage++; loadIronMountain(); } }
