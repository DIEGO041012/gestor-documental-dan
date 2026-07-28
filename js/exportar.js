// ── EXPORTAR EXCEL ──────────────────────────────────────────────────────────
async function exportExcel(type) {
  const wb = XLSX.utils.book_new();
  if(type==='general') {
    const { data } = await sb.from('archivo_general').select('*').order('año');
    const rows = (data||[]).map((r,i)=>({'#':i+1,'Año':r.año,'Mes':MESES[r.mes-1]||r.mes,'Área':r.area,'Contenido':r.contenido,'Estado':r.estado}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length?rows:[{}]), 'Archivo General');
    XLSX.writeFile(wb, 'inventario_archivo_general.xlsx');
  } else if(type==='bodega_primavera') {
    const {data,error}=await sb.from('bodega_primavera').select('*').order('año');
    if(error){toast('Error al exportar: '+error.message,'error');return;}
    const rows=(data||[]).map((r,i)=>({'#':i+1,'Año':r.año,'Número caja':r.numero_caja,'Ubicación':r.ubicacion,'Mes':MESES[r.mes-1]||r.mes,'Área':r.area,'Contenido':r.contenido,'Estado':r.estado,'Fecha traslado':r.fecha_traslado||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{}]),'Bodega Primavera');
    XLSX.writeFile(wb,'inventario_bodega_primavera.xlsx');
  } else if(type==='gestion') {
    const { data: da } = await sb.from('personal_activo').select('*').order('nombre');
    const { data: di } = await sb.from('personal_inactivo').select('*').order('nombre');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((da||[]).map((r,i)=>({'#':i+1,'Nombre':r.nombre,'Cédula':r.cedula,'Año':r.año,'Mes':MESES[r.mes-1]||r.mes,'Día':r.dia}))), 'Personal Activo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((di||[]).map((r,i)=>({'#':i+1,'Nombre':r.nombre,'Cédula':r.cedula,'Fecha inicio':r.fecha_inicio,'Fecha final':r.fecha_final,'Ubicación':r.ubicacion}))), 'Personal Inactivo');
    XLSX.writeFile(wb, 'inventario_gestion_humana.xlsx');
  } else if(type==='presidencia') {
    const { data } = await sb.from('presidencia').select('*').order('seccion').order('modulo');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data||[]).map((r,i)=>({'#':i+1,'Estante':r.estante,'Sección':r.seccion,'Módulo':r.modulo,'Resumen':r.resumen,'Tipo':r.tipo,'Fecha':r.fecha,'Contenido':r.contenido}))), 'Presidencia');
    XLSX.writeFile(wb, 'inventario_presidencia.xlsx');
  } else if(type==='prestamos') {
    const { data } = await sb.from('prestamos').select('*').order('created_at');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data||[]).map((r,i)=>({'#':i+1,'Archivo':r.archivo,'Documento':r.documento,'Solicitante':r.solicitante,'Salida':r.fecha_salida,'Devolución':r.fecha_devolucion,'Estado':r.estado,'Observaciones':r.observaciones||''}))), 'Préstamos');
    XLSX.writeFile(wb, 'inventario_prestamos.xlsx');
  } else if(type==='radicados') {
    toast('Preparando exportación, puede tardar unos segundos...');
    const { data } = await sb.from('radicados').select('*').order('fecha_recibido');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data||[]).map((r,i)=>({'#':i+1,'Consecutivo':r.consecutivo,'Fecha de recibido':r.fecha_recibido,'Hora':r.hora_recibido,'Documento':r.documento,'Tipo':r.tipo,'Remitente':r.remitente,'Área':r.area,'Destinatario':r.destinatario,'Responsable que recibe':r.responsable_recibe,'Soporte':r.soporte}))), 'Radicados');
    XLSX.writeFile(wb, 'inventario_radicados.xlsx');
  } else if(type==='iron_mountain') {
    toast('Preparando inventario de Iron Mountain...');
    const fetchAll = async table => {
      const rows = [];
      for(let from=0;;from+=1000) {
        const {data,error} = await sb.from(table).select('*').range(from,from+999);
        if(error) throw error;
        rows.push(...(data||[]));
        if(!data || data.length<1000) return rows;
      }
    };
    try {
      const [carpetas,cajas] = await Promise.all([fetchAll('iron_mountain_carpetas'),fetchAll('iron_mountain_cajas')]);
      const rowsCarpetas = carpetas.map(r=>({'CARPETA':r.carpeta,'CLIENTE':r.cliente,'ALTERNO':r.alterno,'REG. INICIAL':r.registro_inicial,'ESTADO':r.estado,'CAJA':r.caja,'DESCRIPCIÓN':r.descripcion,'CAMPO USU. 1':r.campo_usuario_1,'CAMPO USU. 2':r.campo_usuario_2,'FEC. DESDE':r.fecha_desde,'FEC. HASTA':r.fecha_hasta,'CONS. DESDE':r.consecutivo_desde,'CONS. HASTA':r.consecutivo_hasta,'ALT. CONTENEDOR':r.alterno_contenedor,'SUCURSAL':r.sucursal}));
      const rowsCajas = cajas.map(r=>({'CAJA':r.caja,'CLIENTE':r.cliente,'CÓDIGO ALTERNO':r.codigo_alterno,'REGISTRO INICIAL':r.registro_inicial,'ESTADO':r.estado,'DESCRIPCIÓN':r.descripcion,'SUCURSAL':r.sucursal}));
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rowsCarpetas.length?rowsCarpetas:[{}]),'CARPETAS');
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rowsCajas.length?rowsCajas:[{}]),'CAJAS');
      XLSX.writeFile(wb,'inventario_iron_mountain.xlsx');
    } catch(err) { toast('Error al exportar: '+err.message,'error'); return; }
  }
  toast('Excel exportado');
}

async function exportReporteCompleto() {
  const wb = XLSX.utils.book_new();
  toast('Preparando reporte completo, puede tardar un momento...');
  const [g, a, i, p, pr, rad] = await Promise.all([
    sb.from('archivo_general').select('*').order('año'),
    sb.from('personal_activo').select('*').order('nombre'),
    sb.from('personal_inactivo').select('*').order('nombre'),
    sb.from('presidencia').select('*').order('seccion').order('modulo'),
    sb.from('prestamos').select('*').order('created_at'),
    sb.from('radicados').select('*').order('fecha_recibido'),
  ]);
  const resumen = [
    {Archivo:'Documentación general', Registros: g.data?.length||0},
    {Archivo:'Personal activo', Registros: a.data?.length||0},
    {Archivo:'Personal inactivo', Registros: i.data?.length||0},
    {Archivo:'Presidencia', Registros: p.data?.length||0},
    {Archivo:'Préstamos totales', Registros: pr.data?.length||0},
    {Archivo:'Radicados', Registros: rad.data?.length||0},
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen');
  if(g.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(g.data.map((r,i)=>({'#':i+1,'Año':r.año,'Mes':MESES[r.mes-1]||r.mes,'Área':r.area,'Contenido':r.contenido,'Estado':r.estado}))), 'Archivo General');
  if(a.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a.data.map((r,i)=>({'#':i+1,'Nombre':r.nombre,'Cédula':r.cedula,'Año':r.año,'Mes':MESES[r.mes-1]||r.mes,'Día':r.dia}))), 'Personal Activo');
  if(i.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(i.data.map((r,i)=>({'#':i+1,'Nombre':r.nombre,'Cédula':r.cedula,'Inicio':r.fecha_inicio,'Final':r.fecha_final,'Ubicación':r.ubicacion}))), 'Personal Inactivo');
  if(p.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(p.data.map((r,i)=>({'#':i+1,'Estante':r.estante,'Sección':r.seccion,'Módulo':r.modulo,'Resumen':r.resumen,'Tipo':r.tipo,'Fecha':r.fecha,'Contenido':r.contenido}))), 'Presidencia');
  if(pr.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pr.data.map((r,i)=>({'#':i+1,'Archivo':r.archivo,'Documento':r.documento,'Solicitante':r.solicitante,'Salida':r.fecha_salida,'Devolución':r.fecha_devolucion,'Estado':r.estado}))), 'Préstamos');
  if(rad.data?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rad.data.map((r,i)=>({'#':i+1,'Consecutivo':r.consecutivo,'Fecha':r.fecha_recibido,'Hora':r.hora_recibido,'Documento':r.documento,'Tipo':r.tipo,'Remitente':r.remitente,'Área':r.area,'Destinatario':r.destinatario,'Responsable':r.responsable_recibe,'Soporte':r.soporte}))), 'Radicados');
  XLSX.writeFile(wb, 'reporte_completo_archivo.xlsx');
  toast('Reporte completo exportado');
}
