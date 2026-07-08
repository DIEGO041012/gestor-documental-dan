// ── MODAL ──────────────────────────────────────────────────────────────────
function openModal(type, record) {
  currentModal = type;
  editingId = record ? record.id : null;
  uploadedFotoUrl = record ? (record.foto_url || null) : null;
  document.getElementById('btn-save').innerHTML = '<i class="ti ti-check"></i> Guardar';
  const titles = {
    general: record ? 'Editar caja' : 'Nueva caja — Archivo general',
    gestion: record ? 'Editar registro' : 'Nuevo registro — Gestión humana',
    gestion_activos: record ? 'Editar personal activo' : 'Nuevo personal activo',
    gestion_inactivos: record ? 'Editar personal inactivo' : 'Nuevo personal inactivo',
    presidencia: record ? 'Editar documento' : 'Nuevo documento — Presidencia',
    prestamo: 'Registrar préstamo'
  };
  document.getElementById('modal-title').textContent = titles[type] || type;
  const r = record || {};
  const yearOpts = Array.from({length:30},(_,i)=>2000+i).map(y=>`<option value="${y}" ${r.año==y?'selected':y===new Date().getFullYear()?'selected':''}>${y}</option>`).join('');
  const mesOpts = MESES.map((m,i)=>`<option value="${i+1}" ${r.mes==i+1?'selected':''}>${m}</option>`).join('');
  const diaOpts = Array.from({length:31},(_,i)=>`<option value="${i+1}" ${r.dia==i+1?'selected':''}>${i+1}</option>`).join('');
  const estadoOpts = ['Disponible','Prestado','En revisión'].map(s=>`<option value="${s}" ${r.estado===s?'selected':''}>${s}</option>`).join('');
  const archOpts = ['Archivo general','Gestión humana — Activos','Gestión humana — Inactivos','Presidencia'].map(a=>`<option>${a}</option>`).join('');

  const fotoBlock = (tipo) => `
    <div class="form-field full">
      <label>Foto (opcional)</label>
      <div style="display:flex;align-items:center;gap:12px">
        ${uploadedFotoUrl ? `<img src="${uploadedFotoUrl}" class="foto-preview" id="foto-prev">` : `<div class="avatar" id="foto-prev" style="width:50px;height:50px;font-size:18px">?</div>`}
        <div>
          <div class="foto-zone" onclick="document.getElementById('foto-input-${tipo}').click()" style="padding:0.6rem 1rem;text-align:left;display:inline-flex;align-items:center;gap:6px">
            <i class="ti ti-upload" style="font-size:15px"></i><span style="font-size:12px">Subir foto</span>
          </div>
          <input type="file" id="foto-input-${tipo}" accept="image/*" style="display:none" onchange="uploadFoto(event,'foto-prev')">
        </div>
      </div>
    </div>`;

  let body = '';
  if(type === 'general') {
    body = `<div class="form-grid">
      <div class="form-field"><label>Año</label><select id="f-año">${yearOpts}</select></div>
      <div class="form-field"><label>Mes</label><select id="f-mes">${mesOpts}</select></div>
      <div class="form-field full"><label>Área</label><input id="f-area" value="${r.area||''}" placeholder="Ej: Contabilidad"></div>
      <div class="form-field full"><label>Contenido</label><textarea id="f-contenido">${r.contenido||''}</textarea></div>
      <div class="form-field"><label>Estado</label><select id="f-estado">${estadoOpts}</select></div>
    </div>`;
  } else if(type === 'gestion' || type === 'gestion_activos') {
    const t = (type === 'gestion') ? gestionTab : 'activos';
    if(t === 'activos') {
      body = `<div class="form-grid">
        <div class="form-field full"><label>Nombre completo</label><input id="f-nombre" value="${r.nombre||''}" placeholder="Apellidos y nombres"></div>
        <div class="form-field full"><label>Cédula</label><input id="f-cedula" value="${r.cedula||''}" placeholder="Número de documento"></div>
        <div class="form-field"><label>Año</label><select id="f-año">${yearOpts}</select></div>
        <div class="form-field"><label>Mes</label><select id="f-mes">${mesOpts}</select></div>
        <div class="form-field"><label>Día</label><select id="f-dia">${diaOpts}</select></div>
        ${fotoBlock('activo')}
      </div>`;
      currentModal = 'gestion_activos';
    } else {
      body = `<div class="form-grid">
        <div class="form-field full"><label>Nombre completo</label><input id="f-nombre" value="${r.nombre||''}" placeholder="Apellidos y nombres"></div>
        <div class="form-field full"><label>Cédula</label><input id="f-cedula" value="${r.cedula||''}" placeholder="Número de documento"></div>
        <div class="form-field"><label>Fecha de inicio</label><input type="date" id="f-fecha_inicio" value="${r.fecha_inicio||''}"></div>
        <div class="form-field"><label>Fecha final</label><input type="date" id="f-fecha_final" value="${r.fecha_final||''}"></div>
        <div class="form-field full"><label>Ubicación (caja)</label><input id="f-ubicacion" value="${r.ubicacion||''}" placeholder="Ej: G-01"></div>
        ${fotoBlock('inactivo')}
      </div>`;
      currentModal = 'gestion_inactivos';
    }
  } else if(type === 'gestion_inactivos') {
    body = `<div class="form-grid">
      <div class="form-field full"><label>Nombre completo</label><input id="f-nombre" value="${r.nombre||''}" placeholder="Apellidos y nombres"></div>
      <div class="form-field full"><label>Cédula</label><input id="f-cedula" value="${r.cedula||''}" placeholder="Número de documento"></div>
      <div class="form-field"><label>Fecha de inicio</label><input type="date" id="f-fecha_inicio" value="${r.fecha_inicio||''}"></div>
      <div class="form-field"><label>Fecha final</label><input type="date" id="f-fecha_final" value="${r.fecha_final||''}"></div>
      <div class="form-field full"><label>Ubicación (caja)</label><input id="f-ubicacion" value="${r.ubicacion||''}" placeholder="Ej: G-01"></div>
      ${fotoBlock('inactivo2')}
    </div>`;
  } else if(type === 'presidencia') {
    body = `<div class="form-grid">
      <div class="form-field"><label>Año del documento</label><select id="f-año">${yearOpts}</select></div>
      <div class="form-field full"><label>Nombre del documento</label><input id="f-nombre" value="${r.nombre||''}" placeholder="Descripción del documento"></div>
    </div>`;
  } else if(type === 'prestamo') {
    body = `<div class="form-grid">
      <div class="form-field full"><label>Archivo</label><select id="f-archivo">${archOpts}</select></div>
      <div class="form-field full"><label>Documento solicitado</label><input id="f-documento" placeholder="Ej: Caja 2024 - Enero - Contabilidad"></div>
      <div class="form-field full"><label>Nombre del solicitante</label><input id="f-solicitante"></div>
      <div class="form-field"><label>Fecha de salida</label><input type="date" id="f-fecha_salida" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="form-field"><label>Fecha devolución esperada</label><input type="date" id="f-fecha_devolucion"></div>
      <div class="form-field full"><label>Observaciones</label><textarea id="f-observaciones" style="min-height:50px"></textarea></div>
    </div>`;
  }
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-overlay').classList.add('open');
}

async function uploadFoto(event, previewId) {
  const file = event.target.files[0];
  if(!file) return;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', 'gestor_documental');
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:fd });
    const data = await res.json();
    uploadedFotoUrl = data.secure_url;
    const prev = document.getElementById(previewId);
    prev.outerHTML = `<img src="${uploadedFotoUrl}" class="foto-preview" id="${previewId}" style="width:50px;height:50px">`;
    toast('Foto cargada');
  } catch(e) { toast('Error al subir la foto', 'error'); }
}


async function saveRecord() {
  const type = currentModal;

  if(type === 'baja_activo') {
    const fechaFinal = val('f-baja-fecha_final');
    if(!fechaFinal) { toast('Ingresa la fecha de salida', 'error'); return; }
    const r = bajaRecordData;
    if(!r) { toast('No se encontró el registro de origen', 'error'); return; }
    const fechaInicio = `${r.año}-${String(r.mes).padStart(2,'0')}-${String(r.dia).padStart(2,'0')}`;
    const nuevoInactivo = {
      nombre: r.nombre,
      cedula: r.cedula,
      fecha_inicio: fechaInicio,
      fecha_final: fechaFinal,
      ubicacion: val('f-baja-ubicacion') || null,
      foto_url: r.foto_url || null
    };
    const { error: insErr } = await sb.from('personal_inactivo').insert([nuevoInactivo]);
    if(insErr) { toast('Error al mover el registro: ' + insErr.message, 'error'); return; }
    const { error: delErr } = await sb.from('personal_activo').delete().eq('id', r.id);
    if(delErr) {
      toast('Se creó en inactivos pero no se pudo quitar de activos: ' + delErr.message, 'error');
      closeModal(); loadGestion(); loadDashboard(); return;
    }
    toast(`${r.nombre} se movió a Personal inactivo`);
    closeModal();
    loadGestion();
    loadDashboard();
    return;
  }

  let data = {};
  let table = '';

  if(type === 'general') {
    if(!val('f-area') || !val('f-contenido')) { toast('Completa área y contenido', 'error'); return; }
    data = { año: parseInt(val('f-año')), mes: parseInt(val('f-mes')), area: val('f-area'), contenido: val('f-contenido'), estado: val('f-estado')||'Disponible' };
    table = 'archivo_general';
  } else if(type === 'gestion_activos') {
    if(!val('f-nombre') || !val('f-cedula')) { toast('Completa nombre y cédula', 'error'); return; }
    data = { nombre: val('f-nombre'), cedula: val('f-cedula'), año: parseInt(val('f-año')), mes: parseInt(val('f-mes')), dia: parseInt(val('f-dia')), foto_url: uploadedFotoUrl };
    table = 'personal_activo';
  } else if(type === 'gestion_inactivos') {
    if(!val('f-nombre') || !val('f-cedula') || !val('f-fecha_inicio')) { toast('Completa nombre, cédula y fecha de inicio', 'error'); return; }
    data = { nombre: val('f-nombre'), cedula: val('f-cedula'), fecha_inicio: val('f-fecha_inicio'), fecha_final: val('f-fecha_final')||null, ubicacion: val('f-ubicacion'), foto_url: uploadedFotoUrl };
    table = 'personal_inactivo';
  } else if(type === 'presidencia') {
    if(!val('f-nombre')) { toast('Completa el nombre del documento', 'error'); return; }
    data = { año: parseInt(val('f-año')), nombre: val('f-nombre') };
    table = 'presidencia';
  } else if(type === 'prestamo') {
    if(!val('f-documento') || !val('f-solicitante') || !val('f-fecha_devolucion')) { toast('Completa los campos obligatorios', 'error'); return; }
    data = { archivo: val('f-archivo'), documento: val('f-documento'), solicitante: val('f-solicitante'), fecha_salida: val('f-fecha_salida'), fecha_devolucion: val('f-fecha_devolucion'), observaciones: val('f-observaciones'), estado: 'activo' };
    table = 'prestamos';
  }

  let error;
  if(editingId) {
    ({ error } = await sb.from(table).update(data).eq('id', editingId));
  } else {
    ({ error } = await sb.from(table).insert([data]));
  }

  if(error) { toast('Error al guardar: ' + error.message, 'error'); return; }
  toast(editingId ? 'Registro actualizado' : 'Registro guardado');
  closeModal();
  if(type==='general') loadGeneral();
  else if(type==='gestion_activos'||type==='gestion_inactivos') loadGestion();
  else if(type==='presidencia') loadPresidencia();
  else if(type==='prestamo') { loadPrestamos(); loadDashboard(); }
}

async function editRecord(type, id) {
  const tableMap = { general:'archivo_general', gestion_activos:'personal_activo', gestion_inactivos:'personal_inactivo', presidencia:'presidencia' };
  const { data, error } = await sb.from(tableMap[type]).select('*').eq('id', id).single();
  if(error || !data) { toast('Error al cargar el registro', 'error'); return; }
  if(type==='gestion_activos') gestionTab='activos';
  if(type==='gestion_inactivos') gestionTab='inactivos';
  openModal(type, data);
}

async function deleteRecord(table, id, section) {
  if(!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const { error } = await sb.from(table).delete().eq('id', id);
  if(error) { toast('Error al eliminar', 'error'); return; }
  toast('Registro eliminado');
  if(section==='general') loadGeneral();
  else if(section==='gestion') loadGestion();
  else if(section==='presidencia') loadPresidencia();
  else if(section==='prestamos') { loadPrestamos(); loadDashboard(); }
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); editingId=null; uploadedFotoUrl=null; bajaRecordData=null; document.getElementById('btn-save').innerHTML = '<i class="ti ti-check"></i> Guardar'; }
function closeModalOutside(e) { if(e.target===document.getElementById('modal-overlay')) closeModal(); }

