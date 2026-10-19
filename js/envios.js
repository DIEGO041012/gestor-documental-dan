const SHIPMENT_STATUSES = {
  programado: 'Programado',
  recogido: 'Recogido',
  en_transito: 'En tránsito',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  novedad: 'Novedad',
  devuelto: 'Devuelto',
  cancelado: 'Cancelado'
};

let shipmentRouteId = null;
let shipmentListenersAttached = false;
let shipmentPage = 0;
let shipmentTotal = 0;
let shipmentLoadSequence = 0;
const SHIPMENT_PAGE_SIZE = 50;

function initShipmentModule() {
  if(shipmentListenersAttached) return;
  shipmentListenersAttached = true;

  document.getElementById('shipment-form').addEventListener('submit', saveShipment);
  document.getElementById('shipment-event-form').addEventListener('submit', saveShipmentEvent);
  document.getElementById('table-envios').addEventListener('click', event => {
    const button = event.target.closest('[data-shipment-action="route"]');
    if(button) openShipmentRoute(button.dataset.shipmentId);
  });
}

function shipmentEscape(value) {
  const entities = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
}

function shipmentStatusLabel(status) {
  return SHIPMENT_STATUSES[status] || status || 'Sin estado';
}

function shipmentDate(value) {
  if(!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function shipmentLocalDateTime(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function loadShipments() {
  const requestSequence = ++shipmentLoadSequence;
  const table = document.getElementById('table-envios');
  table.innerHTML = '<tr><td colspan="6"><div class="loading"><i class="ti ti-loader"></i> Cargando envíos...</div></td></tr>';

  let query = sb.from('shipments').select('*', {count:'exact'}).order('scheduled_pickup_at', {ascending:false});
  const status = document.getElementById('filter-envios-status').value;
  const rawSearch = document.getElementById('search-envios').value.trim();
  if(status) query = query.eq('status', status);

  const search = rawSearch.replace(/[^0-9a-zA-ZÀ-ÿ\s@_-]/g, ' ').trim();
  if(search) {
    const pattern = `%${search}%`;
    query = query.or(`reference.ilike.${pattern},guide_number.ilike.${pattern},recipient_name.ilike.${pattern},recipient_city.ilike.${pattern},sender_name.ilike.${pattern}`);
  }

  const from = shipmentPage * SHIPMENT_PAGE_SIZE;
  const {data, count, error} = await query.range(from, from + SHIPMENT_PAGE_SIZE - 1);
  if(requestSequence !== shipmentLoadSequence) return;
  if(error) {
    shipmentTotal = 0;
    updateShipmentPagination(0, 0);
    table.innerHTML = '<tr><td colspan="6"><div class="empty"><i class="ti ti-alert-triangle"></i><p>No se pudieron cargar los envíos. Verifica la migración y tus permisos.</p></div></td></tr>';
    return;
  }
  shipmentTotal = count || 0;
  updateShipmentPagination(from, data?.length || 0);
  if(!data?.length) {
    table.innerHTML = '<tr><td colspan="6"><div class="empty"><i class="ti ti-truck-delivery"></i><p>No hay envíos que coincidan con la búsqueda.</p></div></td></tr>';
    return;
  }

  table.innerHTML = data.map(shipment => `
    <tr>
      <td><span class="mono">${shipmentEscape(shipmentDate(shipment.scheduled_pickup_at))}</span></td>
      <td><strong>${shipmentEscape(shipment.reference)}</strong><br><span class="mono">${shipmentEscape(shipment.guide_number || 'Sin guía')}</span></td>
      <td>${shipmentEscape(shipment.recipient_name)}<br><span class="mono">${shipmentEscape(shipment.recipient_phone)}</span></td>
      <td>${shipmentEscape(shipment.recipient_city)}</td>
      <td><span class="badge ${shipment.status === 'entregado' ? 'badge-ok' : shipment.status === 'novedad' || shipment.status === 'devuelto' ? 'badge-warn' : shipment.status === 'cancelado' ? 'badge-danger' : 'badge-blue'}">${shipmentEscape(shipmentStatusLabel(shipment.status))}</span></td>
      <td><div class="shipment-actions"><button class="btn btn-secondary btn-sm" type="button" data-shipment-action="route" data-shipment-id="${shipmentEscape(shipment.id)}"><i class="ti ti-route"></i> Ruta e historial</button></div></td>
    </tr>`).join('');
}

function updateShipmentPagination(from, pageLength) {
  const start = shipmentTotal ? from + 1 : 0;
  const end = Math.min(from + pageLength, shipmentTotal);
  document.getElementById('shipment-page-info').textContent = shipmentTotal
    ? `Mostrando ${start}–${end} de ${shipmentTotal}`
    : '';
}

function shipmentPrevPage() {
  if(shipmentPage === 0) return;
  shipmentPage--;
  loadShipments();
}

function shipmentNextPage() {
  if((shipmentPage + 1) * SHIPMENT_PAGE_SIZE >= shipmentTotal) return;
  shipmentPage++;
  loadShipments();
}

function openShipmentModal() {
  const form = document.getElementById('shipment-form');
  form.reset();
  document.getElementById('shipment-form-error').textContent = '';
  document.getElementById('shipment-pickup').min = shipmentLocalDateTime(new Date());
  document.getElementById('shipment-form-overlay').classList.add('open');
}

function closeShipmentModal() {
  document.getElementById('shipment-form-overlay').classList.remove('open');
}

function closeShipmentModalOutside(event) {
  if(event.target.id === 'shipment-form-overlay') closeShipmentModal();
}

async function saveShipment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if(!form.reportValidity()) return;
  const button = document.getElementById('shipment-save');
  const errorEl = document.getElementById('shipment-form-error');
  const pickupValue = document.getElementById('shipment-pickup').value;
  const pickup = new Date(pickupValue);
  if(Number.isNaN(pickup.getTime()) || pickup.getTime() <= Date.now()) {
    errorEl.textContent = 'Selecciona una fecha y hora futura para la recolección.';
    return;
  }

  const weightValue = document.getElementById('shipment-weight').value;
  const record = {
    carrier: 'Coordinadora',
    status: 'programado',
    scheduled_pickup_at: pickup.toISOString(),
    guide_number: val('shipment-guide') || null,
    sender_name: val('shipment-sender'),
    sender_phone: val('shipment-sender-phone'),
    origin_address: val('shipment-origin-address'),
    origin_city: val('shipment-origin-city'),
    recipient_name: val('shipment-recipient'),
    recipient_phone: val('shipment-recipient-phone'),
    recipient_address: val('shipment-destination-address'),
    recipient_city: val('shipment-destination-city'),
    recipient_email: val('shipment-recipient-email') || null,
    package_type: val('shipment-package-type'),
    package_description: val('shipment-description'),
    weight_kg: weightValue ? Number(weightValue) : null
  };

  button.disabled = true;
  errorEl.textContent = '';
  const {error} = await sb.from('shipments').insert(record);
  button.disabled = false;
  if(error) {
    errorEl.textContent = 'No se pudo guardar el envío: ' + error.message;
    return;
  }
  closeShipmentModal();
  toast('Envío programado');
  await loadShipments();
}

async function openShipmentRoute(id) {
  shipmentRouteId = id;
  document.getElementById('shipment-route-title').textContent = 'Ruta e historial del envío';
  document.getElementById('shipment-route-events').innerHTML = '<div class="loading"><i class="ti ti-loader"></i> Cargando historial...</div>';
  document.getElementById('shipment-event-form').reset();
  document.getElementById('shipment-event-error').textContent = '';
  document.getElementById('shipment-route-overlay').classList.add('open');

  const {data: shipment, error: shipmentError} = await sb.from('shipments')
    .select('id, reference, guide_number')
    .eq('id', id)
    .single();
  if(shipmentError) {
    document.getElementById('shipment-route-events').innerHTML = '<p class="shipment-empty-events">No se pudo cargar la información del envío.</p>';
    return;
  }
  document.getElementById('shipment-route-title').textContent = `${shipment.reference}${shipment.guide_number ? ' · Guía ' + shipment.guide_number : ''}`;
  document.getElementById('shipment-event-guide').value = shipment.guide_number || '';

  const {data: events, error} = await sb.from('shipment_events')
    .select('status, description, location, source, occurred_at')
    .eq('shipment_id', id)
    .order('occurred_at', {ascending:false});
  if(error) {
    document.getElementById('shipment-route-events').innerHTML = '<p class="shipment-empty-events">No se pudo cargar la ruta del envío.</p>';
    return;
  }
  const eventList = document.getElementById('shipment-route-events');
  if(!events?.length) {
    eventList.innerHTML = '<p class="shipment-empty-events">Aún no hay actualizaciones para este envío.</p>';
    return;
  }
  eventList.innerHTML = events.map(item => `
    <article class="shipment-event">
      <div class="shipment-event-title">${shipmentEscape(shipmentStatusLabel(item.status))}</div>
      <div class="shipment-event-meta">${shipmentEscape(shipmentDate(item.occurred_at))} · ${item.source === 'coordinadora' ? 'Coordinadora' : 'Actualización manual'}${item.location ? ' · ' + shipmentEscape(item.location) : ''}</div>
      <div class="shipment-event-description">${shipmentEscape(item.description)}</div>
    </article>`).join('');
}

function closeShipmentRoute() {
  document.getElementById('shipment-route-overlay').classList.remove('open');
  shipmentRouteId = null;
}

function closeShipmentRouteOutside(event) {
  if(event.target.id === 'shipment-route-overlay') closeShipmentRoute();
}

async function saveShipmentEvent(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if(!shipmentRouteId || !form.reportValidity()) return;
  const button = document.getElementById('shipment-event-save');
  const errorEl = document.getElementById('shipment-event-error');
  button.disabled = true;
  errorEl.textContent = '';

  const {error} = await sb.rpc('register_shipment_event', {
    p_shipment_id: shipmentRouteId,
    p_status: val('shipment-event-status') || null,
    p_description: val('shipment-event-description'),
    p_location: val('shipment-event-location') || null,
    p_guide_number: val('shipment-event-guide') || null
  });
  button.disabled = false;
  if(error) {
    errorEl.textContent = 'No se pudo registrar la actualización: ' + error.message;
    return;
  }
  const id = shipmentRouteId;
  await openShipmentRoute(id);
  await loadShipments();
  toast('Actualización registrada');
}
