// ── EXPORTAR EXCEL ──────────────────────────────────────────────────────────
async function exportExcel(type) {
  const wb = XLSX.utils.book_new();
  if(type==='general') {
    const { data } = await sb.from('archivo_general').select('*').order('año');
    const rows = (data||[]).map((r,i)=>({'#':i+1,'Año':r.año,'Mes':MESES[r.mes-1]||r.mes,'Área':r.area,'Contenido':r.contenido,'Estado':r.estado}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length?rows:[{}]), 'Archivo General');
    XLSX.writeFile(wb, 'inventario_archivo_general.xlsx');
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

