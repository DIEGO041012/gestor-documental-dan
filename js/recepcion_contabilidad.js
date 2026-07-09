let recepcionContabilidadRowIndex = 0;

function openRecepcionContabilidad() {
  const body = document.getElementById('recepcion-contabilidad-body');
  body.innerHTML = `
    <div class="reception-form">
      <div class="form-grid">
        <div class="form-field"><label>Fecha de entrega</label><input type="date" id="f-recepcion-fecha_entrega"></div>
        <div class="form-field"><label>Fecha del documento</label><input type="date" id="f-recepcion-fecha_documento"></div>
        <div class="form-field full"><label>Nombre del proveedor</label><input id="f-recepcion-nombre_proveedor" placeholder="Ej: FACTURA JYM LOGISTICA INTEGRAL"></div>
        <div class="form-field full"><label>Nombre de quien entrega</label><input id="f-recepcion-nombre_entrega" placeholder="Ej: Diego Londoño"></div>
        <div class="form-field full"><label>Nombre de quien recibe</label><input id="f-recepcion-nombre_recibe" placeholder="Ej: Isabel Chica"></div>
        <div class="form-field full"><label>Firma del responsable en contabilidad</label><input id="f-recepcion-firma_responsable" placeholder="Ej: Firma / Nombre"></div>
      </div>
      <div class="reception-documents">
        <div class="reception-documents-header">
          <div><strong>Documentos a recibir</strong></div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addRecepcionDocumentRow()"><i class="ti ti-plus"></i> Agregar fila</button>
        </div>
        <div id="recepcion-document-rows"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:1rem">
        <button class="btn btn-primary" onclick="generateRecepcionContabilidadPreview()"><i class="ti ti-printer"></i> Generar vista</button>
        <button class="btn btn-secondary" onclick="resetRecepcionContabilidad()"><i class="ti ti-trash"></i> Limpiar</button>
      </div>
      <div id="recepcion-contabilidad-preview" style="margin-top:1.5rem"></div>
    </div>
  `;
  recepcionContabilidadRowIndex = 0;
  document.getElementById('recepcion-document-rows').innerHTML = '';
  addRecepcionDocumentRow();
}

function addRecepcionDocumentRow(values = {}) {
  const container = document.getElementById('recepcion-document-rows');
  if (!container) return;
  recepcionContabilidadRowIndex += 1;
  const idx = recepcionContabilidadRowIndex;
  container.insertAdjacentHTML('beforeend', `
    <div class="reception-document-row" data-index="${idx}">
      <div class="form-field"><label>Fecha doc.</label><input type="date" class="f-recepcion-documento-fecha" id="f-recepcion-row-${idx}-fecha_documento" value="${values.fecha_documento||''}"></div>
      <div class="form-field"><label>N° documento</label><input class="f-recepcion-documento-numero" id="f-recepcion-row-${idx}-numero_documento" value="${values.numero_documento||''}" placeholder="Ej: DAN-240626-2318"></div>
      <div class="form-field"><label>Proveedor / descripción</label><input class="f-recepcion-documento-proveedor" id="f-recepcion-row-${idx}-nombre_proveedor" value="${values.nombre_proveedor||''}" placeholder="Ej: Factura JYM" ></div>
      <button type="button" class="btn btn-danger btn-sm" style="height:36px;align-self:flex-end;" onclick="removeRecepcionDocumentRow(${idx})"><i class="ti ti-trash"></i></button>
    </div>
  `);
}

function removeRecepcionDocumentRow(index) {
  const row = document.querySelector(`.reception-document-row[data-index='${index}']`);
  if (row) row.remove();
}

function resetRecepcionContabilidad() {
  openRecepcionContabilidad();
  const preview = document.getElementById('recepcion-contabilidad-preview');
  if (preview) preview.innerHTML = '';
}

function generateRecepcionContabilidadPreview() {
  const fechaEntrega = val('f-recepcion-fecha_entrega');
  const nombreProveedor = val('f-recepcion-nombre_proveedor');
  const nombreEntrega = val('f-recepcion-nombre_entrega');
  const nombreRecibe = val('f-recepcion-nombre_recibe');
  const firmaResponsable = val('f-recepcion-firma_responsable');

  const rows = Array.from(document.querySelectorAll('.reception-document-row')).map(row => ({
    fecha_documento: row.querySelector('.f-recepcion-documento-fecha')?.value || '',
    numero_documento: row.querySelector('.f-recepcion-documento-numero')?.value || '',
    nombre_proveedor: row.querySelector('.f-recepcion-documento-proveedor')?.value || ''
  })).filter(r => r.fecha_documento || r.numero_documento || r.nombre_proveedor);

  if (!fechaEntrega || !rows.length || !nombreEntrega || !nombreRecibe) {
    toast('Completa al menos fecha de entrega, documentos, quien entrega y quien recibe', 'error');
    return;
  }

  const fechaEntregaText = fechaEntrega;
  const rowsHtml = rows.map(r => `
    <tr>
      <td>${fechaEntregaText}</td>
      <td>${r.fecha_documento || '-'}</td>
      <td>${r.numero_documento || '-'}</td>
      <td>${r.nombre_proveedor || '-'}</td>
      <td>${nombreEntrega}</td>
      <td>${nombreRecibe}</td>
      <td>${firmaResponsable || ''}</td>
    </tr>
  `).join('');

  const preview = document.getElementById('recepcion-contabilidad-preview');
  preview.innerHTML = `
    <div class="print-page" id="recepcion-contabilidad-print">
      <div class="print-header">
        <div class="print-logo">DAN</div>
        <div class="print-title">CONTROL DE ENTREGA DE DOCUMENTOS A CONTABILIDAD</div>
        <div class="print-meta">
          <div><strong>Código:</strong> P4_042_R01</div>
          <div><strong>Versión:</strong> 01</div>
        </div>
      </div>
      <div class="print-subtitle">Registro de entrega de documentos con fecha de entrega ${fechaEntregaText}</div>
      <table class="print-table">
        <thead>
          <tr>
            <th>FECHA DE ENTREGA</th>
            <th>FECHA DEL DOCUMENTO</th>
            <th>N° DOCUMENTO</th>
            <th>NOMBRE DEL PROVEEDOR</th>
            <th>NOMBRE QUIEN ENTREGA</th>
            <th>NOMBRE QUIEN RECIBE</th>
            <th>FIRMA RESPONSABLE</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="print-footer">
        <div><strong>ENTREGA:</strong> ${nombreEntrega}</div>
        <div><strong>RECIBE:</strong> ${nombreRecibe}</div>
      </div>
      <div class="print-action"><button class="btn btn-primary" onclick="printRecepcionContabilidad()"><i class="ti ti-printer"></i> Imprimir formato</button></div>
    </div>
  `;
}

function printRecepcionContabilidad() {
  window.print();
}
