// ── BODEGA PRIMAVERA Y TRASLADOS ───────────────────────────────────────────
let transferGeneralRecord = null;

async function loadBodegaPrimavera() {
  const q = document.getElementById('search-bodega-primavera').value.trim().replace(/[,%()]/g,' ');
  let query = sb.from('bodega_primavera').select('*').order('created_at',{ascending:false});
  if(q) query=query.or(`area.ilike.%${q}%,contenido.ilike.%${q}%,año.ilike.%${q}%,numero_caja.ilike.%${q}%,ubicacion.ilike.%${q}%`);
  const {data,error}=await query;
  const tb=document.getElementById('table-bodega-primavera');
  if(error||!data?.length){tb.innerHTML=`<tr><td colspan="9"><div class="empty"><i class="ti ti-building-warehouse"></i><p>${error?ironEscape(error.message):'Sin registros.'}</p></div></td></tr>`;return;}
  tb.innerHTML=data.map((r,i)=>`<tr><td>${i+1}</td><td class="mono">${ironEscape(r.año||'-')}</td><td>${ironEscape(r.numero_caja||'-')}</td><td>${ironEscape(r.ubicacion||'-')}</td><td>${r.mes?(MESES[r.mes-1]||r.mes):'-'}</td><td>${ironEscape(r.area||'-')}</td><td style="max-width:200px">${ironEscape(r.contenido||'-')}</td><td>${r.estado?`<span class="badge ${r.estado==='Disponible'?'badge-ok':r.estado==='Prestado'?'badge-warn':'badge-blue'}">${ironEscape(r.estado)}</span>`:'-'}</td><td><button class="btn btn-edit" onclick="editRecord('bodega_primavera','${r.id}')">Editar</button><button class="btn btn-danger" onclick="deleteRecord('bodega_primavera','${r.id}','bodega_primavera')">Eliminar</button></td></tr>`).join('');
}

async function openGeneralTransfer(id) {
  const {data,error}=await sb.from('archivo_general').select('*').eq('id',id).single();
  if(error||!data){toast('No se pudo cargar la caja','error');return;}
  transferGeneralRecord=data;
  document.getElementById('transfer-destination').value='bodega_primavera';
  document.getElementById('transfer-record-summary').innerHTML=`<strong>Caja ${ironEscape(data.numero_caja||'sin número')}</strong><br>${ironEscape(data.area||'Sin área')} · ${ironEscape(data.año||'Sin año')} · ${ironEscape(data.contenido||'Sin contenido')}`;
  updateTransferHint();
  document.getElementById('transfer-overlay').classList.add('open');
}
function updateTransferHint(){const iron=document.getElementById('transfer-destination').value==='iron_mountain';document.getElementById('transfer-hint').textContent=iron?'Se creará una caja en Iron Mountain. El número de caja debe existir y no estar repetido.':'Se conservarán todos los campos originales en Bodega Primavera.';}
function closeTransferModal(){document.getElementById('transfer-overlay').classList.remove('open');transferGeneralRecord=null;}
function closeTransferOutside(e){if(e.target===document.getElementById('transfer-overlay'))closeTransferModal();}

async function confirmGeneralTransfer(){
  const r=transferGeneralRecord,destination=document.getElementById('transfer-destination').value,btn=document.getElementById('btn-transfer-confirm');
  if(!r)return;
  if(destination==='iron_mountain'&&!r.numero_caja){toast('La caja necesita un número para trasladarse a Iron Mountain','error');return;}
  if(!confirm(`¿Confirmas trasladar la caja a ${destination==='iron_mountain'?'Iron Mountain':'Bodega Primavera'}? Dejará de aparecer en Documentación general.`))return;
  btn.disabled=true;
  let targetTable,targetData;
  if(destination==='bodega_primavera'){
    targetTable='bodega_primavera';targetData={año:r.año,numero_caja:r.numero_caja,ubicacion:r.ubicacion,mes:r.mes,area:r.area,contenido:r.contenido,estado:r.estado,origen_id:r.id,fecha_traslado:new Date().toISOString()};
  }else{
    targetTable='iron_mountain_cajas';targetData={caja:r.numero_caja,cliente:'COMESTIBLES DAN S.A',codigo_alterno:null,registro_inicial:r.año,estado:r.estado==='Prestado'?'EN PRESTAMO':'EN CUSTODIA',descripcion:[r.area,r.contenido,r.ubicacion].filter(Boolean).join(' — '),sucursal:'MEDELLIN'};
  }
  const {error:insertError}=await sb.from(targetTable).insert([targetData]);
  if(insertError){toast('No se realizó el traslado: '+insertError.message,'error');btn.disabled=false;return;}
  const {error:deleteError}=await sb.from('archivo_general').delete().eq('id',r.id);
  if(deleteError){toast('Se copió al destino, pero no se pudo retirar del archivo general: '+deleteError.message,'error');btn.disabled=false;return;}
  toast(`Caja trasladada a ${destination==='iron_mountain'?'Iron Mountain':'Bodega Primavera'}`);closeTransferModal();btn.disabled=false;loadGeneral();loadDashboard();
}
