// ── GESTIÓN HUMANA ─────────────────────────────────────────────────────────
function setGestionTab(tab) {
  gestionTab = tab;
  document.querySelectorAll('.tabs .tab').forEach((b,i) => b.classList.toggle('active', (i===0&&tab==='activos')||(i===1&&tab==='inactivos')));
  loadGestion();
}

async function loadGestion() {
  const q = document.getElementById('search-gestion').value.trim();
  const table = gestionTab === 'activos' ? 'personal_activo' : 'personal_inactivo';
  let query = sb.from(table).select('*').order('nombre');
  if(q) query = query.or(`nombre.ilike.%${q}%,cedula.ilike.%${q}%`);
  const { data, error } = await query;
  const wrap = document.getElementById('table-gestion-wrap');
  if(error || !data || data.length === 0) {
    wrap.innerHTML = `<div class="empty"><i class="ti ti-users"></i><p>Sin registros.</p></div>`;
    return;
  }
  const thead = gestionTab === 'activos'
    ? `<tr><th>#</th><th>Foto</th><th>Nombre completo</th><th>Cédula</th><th>Año</th><th>Mes</th><th>Día</th><th>Acciones</th></tr>`
    : `<tr><th>#</th><th>Foto</th><th>Nombre completo</th><th>Cédula</th><th>Fecha inicio</th><th>Fecha final</th><th>Ubicación</th><th>Acciones</th></tr>`;
  const tbody = data.map((r,i) => {
    const foto = r.foto_url ? `<img src="${r.foto_url}" class="foto-preview" style="width:30px;height:30px">` : `<div class="avatar">${r.nombre.charAt(0)}</div>`;
    const dbTable = gestionTab === 'activos' ? 'personal_activo' : 'personal_inactivo';
    const editType = gestionTab === 'activos' ? 'gestion_activos' : 'gestion_inactivos';
    if(gestionTab === 'activos') {
      return `<tr><td>${i+1}</td><td>${foto}</td><td>${r.nombre}</td><td>${r.cedula}</td><td>${r.año}</td><td>${MESES[r.mes-1]||r.mes}</td><td>${r.dia}</td><td><button class="btn btn-warning" onclick="openBajaModal('${r.id}')" title="Mover a Personal inactivo"><i class="ti ti-user-x"></i> Dar de baja</button><button class="btn btn-edit" onclick="editRecord('${editType}','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('${dbTable}','${r.id}','gestion')">Eliminar</button></td></tr>`;
    } else {
      return `<tr><td>${i+1}</td><td>${foto}</td><td>${r.nombre}</td><td>${r.cedula}</td><td>${r.fecha_inicio}</td><td>${r.fecha_final||'-'}</td><td>${r.ubicacion||'-'}</td><td><button class="btn btn-edit" onclick="editRecord('${editType}','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('${dbTable}','${r.id}','gestion')">Eliminar</button></td></tr>`;
    }
  }).join('');
  wrap.innerHTML = `<div class="table-wrap"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div>`;
}

// ── DAR DE BAJA (mover activo -> inactivo) ──────────────────────────────────
async function openBajaModal(id) {
  const { data, error } = await sb.from('personal_activo').select('*').eq('id', id).single();
  if(error || !data) { toast('Error al cargar el registro', 'error'); return; }
  currentModal = 'baja_activo';
  editingId = id;
  bajaRecordData = data;
  const fechaIngreso = `${data.año}-${String(data.mes).padStart(2,'0')}-${String(data.dia).padStart(2,'0')}`;
  const hoy = new Date().toISOString().slice(0,10);
  document.getElementById('modal-title').textContent = `Dar de baja: ${data.nombre}`;
  document.getElementById('modal-body').innerHTML = `<div class="form-grid">
    <div class="form-field full">
      <p style="font-size:13px;color:var(--text-2);line-height:1.5">Este registro se moverá de <strong>Personal activo</strong> a <strong>Personal inactivo</strong>. Puedes dejar la ubicación en blanco y agregarla después manualmente editando el registro inactivo.</p>
    </div>
    <div class="form-field"><label>Cédula</label><input value="${data.cedula}" disabled></div>
    <div class="form-field"><label>Fecha de ingreso</label><input value="${fechaIngreso}" disabled></div>
    <div class="form-field full"><label>Fecha de salida (renuncia)</label><input type="date" id="f-baja-fecha_final" value="${hoy}"></div>
    <div class="form-field full"><label>Ubicación (caja) — opcional</label><input id="f-baja-ubicacion" placeholder="Ej: G-01, la puedes agregar luego"></div>
  </div>`;
  document.getElementById('btn-save').innerHTML = '<i class="ti ti-check"></i> Confirmar baja';
  document.getElementById('modal-overlay').classList.add('open');
}

