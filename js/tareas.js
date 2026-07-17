// ── TAREAS Y CITAS (Supabase) ─────────────────────────────────────────────
const TASKS_STORAGE_KEY = 'gestor_documental_tareas_v1';
const APPOINTMENTS_STORAGE_KEY = 'gestor_documental_citas_v1';
const TASKS_MIGRATION_KEY = 'gestor_documental_tareas_migradas_supabase_v1';
const TASK_STATUSES = ['asignacion', 'proceso', 'terminado'];
let taskModalMode = null;
let taskEditingId = null;
let tasksCache = [];
let appointmentsCache = [];

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch (_) { return []; }
}
function escapeTaskHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function localDateTimeValue(date) {
  const d = new Date(date); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}

async function migrateLocalTasksToSupabase() {
  if(localStorage.getItem(TASKS_MIGRATION_KEY) === 'ok') return;
  const oldTasks = readLocalList(TASKS_STORAGE_KEY);
  const oldAppointments = readLocalList(APPOINTMENTS_STORAGE_KEY);
  let failed = false;

  if(oldTasks.length) {
    const records = oldTasks.map(t => ({
      titulo:t.titulo, descripcion:t.descripcion||null, responsable:t.responsable||null,
      fecha_limite:t.fechaLimite||null, prioridad:t.prioridad||'media', estado:t.estado||'asignacion'
    }));
    const { error } = await sb.from('tareas').insert(records);
    if(error) { console.error('No se migraron las tareas locales:', error.message); failed = true; }
    else localStorage.removeItem(TASKS_STORAGE_KEY);
  }
  if(oldAppointments.length) {
    const records = oldAppointments.map(c => ({
      titulo:c.titulo, fecha:new Date(c.fecha).toISOString(), lugar:c.lugar||null,
      notas:c.notas||null, recordatorio:Number(c.recordatorio)||0, notificada:Boolean(c.notificada)
    }));
    const { error } = await sb.from('citas').insert(records);
    if(error) { console.error('No se migraron las citas locales:', error.message); failed = true; }
    else localStorage.removeItem(APPOINTMENTS_STORAGE_KEY);
  }
  if(!failed) {
    localStorage.setItem(TASKS_MIGRATION_KEY, 'ok');
    if(oldTasks.length || oldAppointments.length) toast('Datos anteriores migrados a Supabase');
  }
}

async function loadTasksModule() {
  const board = document.getElementById('kanban-board');
  if(board) board.innerHTML = '<div class="loading"><i class="ti ti-loader"></i> Cargando tareas...</div>';
  await migrateLocalTasksToSupabase();
  const [tasksResult, appointmentsResult] = await Promise.all([
    sb.from('tareas').select('*').order('created_at', {ascending:false}),
    sb.from('citas').select('*').order('fecha', {ascending:true})
  ]);
  if(tasksResult.error || appointmentsResult.error) {
    toast('No se pudieron cargar tareas o citas desde Supabase', 'error');
    console.error(tasksResult.error || appointmentsResult.error);
  }
  tasksCache = (tasksResult.data || []).map(t => ({...t, fechaLimite:t.fecha_limite}));
  appointmentsCache = appointmentsResult.data || [];
  renderKanban(); renderAppointments(); checkAppointmentNotifications();
}

function renderKanban() {
  const columns = [
    {id:'asignacion', title:'Asignación de tarea', icon:'clipboard-list'},
    {id:'proceso', title:'En proceso', icon:'loader-2'},
    {id:'terminado', title:'Terminado', icon:'circle-check'}
  ];
  document.getElementById('task-summary').innerHTML = columns.map(c => `<div class="task-summary-item"><strong>${tasksCache.filter(t=>t.estado===c.id).length}</strong>${c.title}</div>`).join('');
  document.getElementById('kanban-board').innerHTML = columns.map(c => {
    const rows = tasksCache.filter(t => t.estado === c.id);
    return `<section class="kanban-column" data-status="${c.id}" ondragover="taskDragOver(event)" ondragleave="taskDragLeave(event)" ondrop="taskDrop(event)">
      <div class="kanban-column-header"><span><i class="ti ti-${c.icon}"></i> ${c.title}</span><span class="kanban-count">${rows.length}</span></div>
      <div class="kanban-list">${rows.length ? rows.map(renderTaskCard).join('') : '<div class="empty"><p>Sin tareas</p></div>'}</div>
    </section>`;
  }).join('');
}
function renderTaskCard(t) {
  const due=t.fechaLimite?new Date(`${t.fechaLimite}T23:59:59`):null;
  const overdue=due&&due<new Date()&&t.estado!=='terminado';
  return `<article class="task-card priority-${escapeTaskHtml(t.prioridad)}" draggable="true" data-id="${escapeTaskHtml(t.id)}" ondragstart="taskDragStart(event)">
    <div class="task-card-title">${escapeTaskHtml(t.titulo)}</div>${t.descripcion?`<div class="task-card-description">${escapeTaskHtml(t.descripcion)}</div>`:''}
    <div class="task-card-meta"><span class="badge ${t.prioridad==='alta'?'badge-danger':t.prioridad==='media'?'badge-warn':'badge-ok'}">${escapeTaskHtml(t.prioridad)}</span>${t.responsable?`<span><i class="ti ti-user"></i> ${escapeTaskHtml(t.responsable)}</span>`:''}${t.fechaLimite?`<span style="${overdue?'color:var(--danger);font-weight:700':''}"><i class="ti ti-calendar"></i> ${escapeTaskHtml(t.fechaLimite)}</span>`:''}</div>
    <div class="task-card-actions"><select class="task-status-select" aria-label="Cambiar estado" onchange="moveTask('${escapeTaskHtml(t.id)}',this.value)">${TASK_STATUSES.map(s=>`<option value="${s}" ${t.estado===s?'selected':''}>${s==='asignacion'?'Asignación':s==='proceso'?'En proceso':'Terminado'}</option>`).join('')}</select><button class="btn btn-edit btn-sm" onclick="editTask('${escapeTaskHtml(t.id)}')"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-sm" onclick="deleteTask('${escapeTaskHtml(t.id)}')"><i class="ti ti-trash"></i></button></div>
  </article>`;
}

function openTaskModal(record) {
  taskModalMode='task'; taskEditingId=record?.id||null;
  document.getElementById('task-modal-title').textContent=record?'Editar tarea':'Nueva tarea';
  document.getElementById('task-modal-body').innerHTML=`<div class="form-grid">
    <div class="form-field full"><label>Título *</label><input id="f-task-title" value="${escapeTaskHtml(record?.titulo||'')}" maxlength="120"></div>
    <div class="form-field full"><label>Descripción</label><textarea id="f-task-description">${escapeTaskHtml(record?.descripcion||'')}</textarea></div>
    <div class="form-field"><label>Responsable</label><input id="f-task-owner" value="${escapeTaskHtml(record?.responsable||'')}"></div>
    <div class="form-field"><label>Fecha límite</label><input type="date" id="f-task-date" value="${escapeTaskHtml(record?.fechaLimite||'')}"></div>
    <div class="form-field"><label>Prioridad</label><select id="f-task-priority">${['baja','media','alta'].map(p=>`<option value="${p}" ${record?.prioridad===p?'selected':''}>${p[0].toUpperCase()+p.slice(1)}</option>`).join('')}</select></div>
    <div class="form-field"><label>Estado</label><select id="f-task-status">${TASK_STATUSES.map(s=>`<option value="${s}" ${record?.estado===s?'selected':''}>${s==='asignacion'?'Asignación de tarea':s==='proceso'?'En proceso':'Terminado'}</option>`).join('')}</select></div></div>`;
  document.getElementById('task-overlay').classList.add('open');
}
function openAppointmentModal(record) {
  taskModalMode='appointment'; taskEditingId=record?.id||null;
  document.getElementById('task-modal-title').textContent=record?'Editar cita':'Programar cita';
  document.getElementById('task-modal-body').innerHTML=`<div class="form-grid">
    <div class="form-field full"><label>Asunto *</label><input id="f-appointment-title" value="${escapeTaskHtml(record?.titulo||'')}" maxlength="120"></div>
    <div class="form-field full"><label>Fecha y hora *</label><input type="datetime-local" id="f-appointment-date" value="${record?.fecha?localDateTimeValue(record.fecha):localDateTimeValue(Date.now()+3600000)}"></div>
    <div class="form-field full"><label>Lugar o enlace</label><input id="f-appointment-place" value="${escapeTaskHtml(record?.lugar||'')}"></div>
    <div class="form-field"><label>Recordar</label><select id="f-appointment-reminder">${[0,5,10,15,30,60].map(m=>`<option value="${m}" ${Number(record?.recordatorio??10)===m?'selected':''}>${m===0?'A la hora de la cita':m+' minutos antes'}</option>`).join('')}</select></div>
    <div class="form-field full"><label>Notas</label><textarea id="f-appointment-notes">${escapeTaskHtml(record?.notas||'')}</textarea></div></div>`;
  document.getElementById('task-overlay').classList.add('open');
}

async function saveTaskOrAppointment() {
  let error;
  if(taskModalMode==='task') {
    const titulo=val('f-task-title'); if(!titulo) return toast('Escribe el título de la tarea','error');
    const record={titulo,descripcion:val('f-task-description')||null,responsable:val('f-task-owner')||null,fecha_limite:val('f-task-date')||null,prioridad:val('f-task-priority'),estado:val('f-task-status')};
    if(taskEditingId) ({error}=await sb.from('tareas').update(record).eq('id',taskEditingId)); else ({error}=await sb.from('tareas').insert([record]));
  } else {
    const titulo=val('f-appointment-title'), fecha=val('f-appointment-date'); if(!titulo||!fecha) return toast('Completa el asunto, la fecha y la hora','error');
    const record={titulo,fecha:new Date(fecha).toISOString(),lugar:val('f-appointment-place')||null,recordatorio:Number(val('f-appointment-reminder')),notas:val('f-appointment-notes')||null,notificada:false};
    if(taskEditingId) ({error}=await sb.from('citas').update(record).eq('id',taskEditingId)); else ({error}=await sb.from('citas').insert([record]));
  }
  if(error) return toast('Error al guardar: '+error.message,'error');
  toast(taskEditingId?'Registro actualizado':'Registro guardado'); closeTaskModal(); await loadTasksModule();
}
function closeTaskModal(){document.getElementById('task-overlay').classList.remove('open');taskEditingId=null;taskModalMode=null;}
function closeTaskModalOutside(e){if(e.target===document.getElementById('task-overlay'))closeTaskModal();}
function editTask(id){openTaskModal(tasksCache.find(t=>t.id===id));}
async function deleteTask(id){if(!confirm('¿Eliminar esta tarea?'))return;const{error}=await sb.from('tareas').delete().eq('id',id);if(error)return toast('Error al eliminar','error');toast('Tarea eliminada');loadTasksModule();}
async function moveTask(id,status){if(!TASK_STATUSES.includes(status))return;const{error}=await sb.from('tareas').update({estado:status}).eq('id',id);if(error)return toast('No se pudo mover la tarea','error');const row=tasksCache.find(t=>t.id===id);if(row)row.estado=status;renderKanban();}
function taskDragStart(e){e.dataTransfer.setData('text/plain',e.currentTarget.dataset.id);e.dataTransfer.effectAllowed='move';}
function taskDragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function taskDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function taskDrop(e){e.preventDefault();e.currentTarget.classList.remove('drag-over');moveTask(e.dataTransfer.getData('text/plain'),e.currentTarget.dataset.status);}

function renderAppointments(){const container=document.getElementById('appointments-list');if(!appointmentsCache.length){container.innerHTML='<div class="empty"><i class="ti ti-calendar-off"></i><p>No hay citas programadas.</p></div>';return;}container.innerHTML=appointmentsCache.map(r=>`<div class="appointment-item"><div class="appointment-date">${new Date(r.fecha).toLocaleString('es-CO',{dateStyle:'medium',timeStyle:'short'})}</div><div class="appointment-info"><strong>${escapeTaskHtml(r.titulo)}</strong><span>${escapeTaskHtml(r.lugar||r.notas||'Sin información adicional')}</span></div><div><button class="btn btn-edit btn-sm" onclick="editAppointment('${escapeTaskHtml(r.id)}')"><i class="ti ti-edit"></i></button><button class="btn btn-danger btn-sm" onclick="deleteAppointment('${escapeTaskHtml(r.id)}')"><i class="ti ti-trash"></i></button></div></div>`).join('');}
function editAppointment(id){openAppointmentModal(appointmentsCache.find(r=>r.id===id));}
async function deleteAppointment(id){if(!confirm('¿Eliminar esta cita?'))return;const{error}=await sb.from('citas').delete().eq('id',id);if(error)return toast('Error al eliminar','error');toast('Cita eliminada');loadTasksModule();}

async function requestTaskNotifications(showMessage=true){if(!('Notification'in window)){if(showMessage)toast('Este navegador no permite notificaciones','error');return;}const permission=await Notification.requestPermission();if(showMessage)toast(permission==='granted'?'Notificaciones activadas':'No se concedió permiso para notificaciones',permission==='granted'?'ok':'error');}
async function checkAppointmentNotifications(){if(!('Notification'in window)||Notification.permission!=='granted')return;const now=Date.now();for(const r of appointmentsCache){const eventTime=new Date(r.fecha).getTime(),alertAt=eventTime-(Number(r.recordatorio)||0)*60000;if(!r.notificada&&now>=alertAt&&now<eventTime+3600000){new Notification('Cita: '+r.titulo,{body:`${new Date(r.fecha).toLocaleString('es-CO')}${r.lugar?' · '+r.lugar:''}`,icon:'assets/logo-dan.png'});r.notificada=true;const{error}=await sb.from('citas').update({notificada:true}).eq('id',r.id);if(error)console.error('No se actualizó la notificación:',error.message);}}}
setInterval(checkAppointmentNotifications,30000);
