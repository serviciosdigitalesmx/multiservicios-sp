(function () {
  let idCotizacion = null;

  function money(v) {
    return '$' + Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function conceptoRow(data) {
    const row = document.createElement('div');
    row.className = 'grid2';
    row.style.marginBottom = '8px';
    row.innerHTML = [
      '<input class="input-lite concepto-desc" type="text" placeholder="Descripción" value="' + String(data.desc || '') + '">',
      '<div style="display:flex;gap:8px;">',
      '<input class="input-lite concepto-cant" type="number" min="1" value="' + Number(data.cant || 1) + '">',
      '<input class="input-lite concepto-precio" type="number" min="0" step="0.01" value="' + Number(data.precio || 0) + '">',
      '</div>'
    ].join('');
    return row;
  }

  function getConceptos() {
    const rows = Array.from(document.querySelectorAll('#conceptosWrap .grid2'));
    return rows.map(function (row) {
      const desc = row.querySelector('.concepto-desc').value.trim();
      const cant = Number(row.querySelector('.concepto-cant').value || 0);
      const precio = Number(row.querySelector('.concepto-precio').value || 0);
      return { desc: desc, cant: cant, precio: precio, importe: cant * precio };
    }).filter(function (c) {
      return c.desc && c.cant > 0;
    });
  }

  function recalcTotal() {
    const total = getConceptos().reduce(function (acc, c) { return acc + c.importe; }, 0);
    const node = document.getElementById('cotTotal');
    if (node) node.textContent = money(total);
    return total;
  }

  async function guardarCotizacionManual() {
    const conceptos = getConceptos();
    const total = recalcTotal();
    if (!conceptos.length) {
      alert('Agrega al menos un concepto.');
      return;
    }

    const payload = await window.api('/crearCotizacionManual', {
      cliente: document.getElementById('cotCliente').value.trim(),
      telefono: document.getElementById('cotTelefono').value.trim(),
      servicio: document.getElementById('cotServicio').value.trim(),
      direccion: document.getElementById('cotDireccion').value.trim(),
      diagnostico: document.getElementById('cotDiagnostico').value.trim(),
      conceptos: conceptos,
      total: total
    });

    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo guardar');
    }

    idCotizacion = payload.idCotizacion;
    document.getElementById('cotizadorHint').textContent = 'Cotización creada: ' + idCotizacion;
    document.getElementById('pdfCotBtn').disabled = false;
    document.getElementById('programarSrvBtn').disabled = false;
  }

  async function programarServicio() {
    if (!idCotizacion) {
      alert('Primero guarda la cotización.');
      return;
    }
    const fecha = document.getElementById('srvFecha').value;
    const hora = document.getElementById('srvHora').value;
    const tecnico = document.getElementById('srvTecnico').value.trim();
    const total = recalcTotal();
    if (!fecha || !tecnico) {
      alert('Fecha y técnico son obligatorios.');
      return;
    }

    const payload = await window.api('/programarServicio', {
      idSolicitud: '',
      idCotizacion: idCotizacion,
      fecha: fecha,
      hora: hora,
      tecnico: tecnico,
      total: total
    });
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo programar');
    }
    alert('Servicio programado: ' + payload.idServicio);
    window.loadModule('servicios');
  }

  async function generarPdf() {
    if (!idCotizacion) return;

    if (!window.jspdf || !window.jspdf.jsPDF) {
      await new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF();
    const conceptos = getConceptos();
    const total = recalcTotal();

    doc.setFontSize(16);
    doc.text('Multiservicios SP - Cotización', 14, 18);
    doc.setFontSize(11);
    doc.text('Cotización: ' + idCotizacion, 14, 28);
    doc.text('Solicitud: MANUAL', 14, 35);
    doc.text('Cliente: ' + document.getElementById('cotCliente').value, 14, 42);
    doc.text('Servicio: ' + document.getElementById('cotServicio').value, 14, 49);

    let y = 60;
    conceptos.forEach(function (c, idx) {
      doc.text((idx + 1) + '. ' + c.desc + ' | ' + c.cant + ' x ' + c.precio + ' = ' + c.importe, 14, y);
      y += 7;
    });
    y += 5;
    doc.setFontSize(13);
    doc.text('TOTAL: ' + money(total), 14, y);
    doc.save(idCotizacion + '.pdf');
  }

  const wrap = document.getElementById('conceptosWrap');
  if (wrap) {
    wrap.innerHTML = '';
    wrap.appendChild(conceptoRow({ desc: '', cant: 1, precio: 0 }));
    wrap.addEventListener('input', recalcTotal);
  }

  const addBtn = document.getElementById('addConceptoBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function () {
      wrap.appendChild(conceptoRow({ desc: '', cant: 1, precio: 0 }));
      recalcTotal();
    });
  }

  const saveBtn = document.getElementById('guardarCotBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      guardarCotizacionManual().catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  const planBtn = document.getElementById('programarSrvBtn');
  if (planBtn) {
    planBtn.addEventListener('click', function () {
      programarServicio().catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  const pdfBtn = document.getElementById('pdfCotBtn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', function () {
      generarPdf().catch(function (err) {
        alert('Error PDF: ' + (err.message || err));
      });
    });
  }

  const waBtn = document.getElementById('cotWhatsBtn');
  if (waBtn) {
    waBtn.addEventListener('click', function () {
      const phone = document.getElementById('cotTelefono').value.trim();
      const cliente = document.getElementById('cotCliente').value.trim();
      const folio = idCotizacion || 'MANUAL';
      if (!window.WAUtils || typeof window.WAUtils.openContact !== 'function') return;
      window.WAUtils.openContact({ phone: phone, cliente: cliente, folio: folio });
    });
  }

  recalcTotal();
})();
