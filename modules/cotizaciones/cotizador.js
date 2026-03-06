(function () {
  let solicitud = null;
  let idCotizacion = null;

  function formatMoney(value) {
    return '$' + Number(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function cargarCotizacionesRegistradas(force) {
    const tbody = document.querySelector('#tablaCotizaciones tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    try {
      const payload = await window.api('/cotizaciones', null, { force: !!force });
      if (!payload || !payload.success) {
        throw new Error(payload && payload.error ? payload.error : 'Respuesta inválida');
      }

      const list = Array.isArray(payload.cotizaciones) ? payload.cotizaciones : [];
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Sin cotizaciones registradas.</td></tr>';
        return;
      }

      tbody.innerHTML = list.map(function (c) {
        return '<tr>' +
          '<td>' + escapeHtml(c.idCotizacion) + '</td>' +
          '<td>' + escapeHtml(c.cliente) + '</td>' +
          '<td>' + escapeHtml(c.servicio) + '</td>' +
          '<td>' + escapeHtml(c.estado || 'NUEVA') + '</td>' +
          '<td>' + escapeHtml(formatMoney(c.total || 0)) + '</td>' +
          '</tr>';
      }).join('');
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="5">Error al cargar cotizaciones: ' + escapeHtml(error.message || error) + '</td></tr>';
    }
  }

  function conceptoRow(data) {
    const row = document.createElement('div');
    row.className = 'grid2';
    row.style.marginBottom = '8px';
    row.innerHTML = [
      '<input class="input-lite concepto-desc" type="text" placeholder="Descripción" value="' + (data.desc || '') + '">',
      '<div style="display:flex;gap:8px;">',
      '<input class="input-lite concepto-cant" type="number" min="1" value="' + (data.cant || 1) + '">',
      '<input class="input-lite concepto-precio" type="number" min="0" step="0.01" value="' + (data.precio || 0) + '">',
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
    document.getElementById('cotTotal').textContent = formatMoney(total);
    return total;
  }

  async function resolveSolicitud() {
    const hint = document.getElementById('cotizadorHint');
    const selectedId = window.__selectedSolicitudId;
    if (!selectedId) {
      hint.textContent = 'No hay solicitud seleccionada todavía.';
      return;
    }

    const payload = await window.api('/solicitudes');
    const list = (payload && payload.success && payload.solicitudes) ? payload.solicitudes : [];
    solicitud = list.find(function (s) { return String(s.id) === String(selectedId); }) || null;

    if (!solicitud) {
      hint.textContent = 'No se encontró la solicitud seleccionada.';
      return;
    }

    hint.textContent = 'Solicitud: ' + solicitud.id;
    document.getElementById('cotizadorPanel').style.display = 'block';
    document.getElementById('cotCliente').value = solicitud.cliente || '';
    document.getElementById('cotTelefono').value = solicitud.telefono || '';
    document.getElementById('cotServicio').value = solicitud.servicio || '';
    document.getElementById('cotDireccion').value = solicitud.direccion || '';
    document.getElementById('cotDiagnostico').value = solicitud.notas || '';

    const wrap = document.getElementById('conceptosWrap');
    wrap.innerHTML = '';
    wrap.appendChild(conceptoRow({ desc: solicitud.servicio || 'Servicio técnico', cant: 1, precio: 0 }));
    recalcTotal();

    wrap.addEventListener('input', recalcTotal);
    document.getElementById('addConceptoBtn').addEventListener('click', function () {
      wrap.appendChild(conceptoRow({ desc: '', cant: 1, precio: 0 }));
      recalcTotal();
    });

    document.getElementById('guardarCotBtn').addEventListener('click', guardarCotizacion);
    document.getElementById('pdfCotBtn').addEventListener('click', generarPdf);
    document.getElementById('programarSrvBtn').addEventListener('click', programarServicio);
  }

  async function guardarCotizacion() {
    if (!solicitud) return;

    try {
      const conceptos = getConceptos();
      const total = recalcTotal();
      if (conceptos.length === 0) {
        alert('Agrega al menos un concepto con cantidad.');
        return;
      }

      const payload = await window.api('/cotizarSolicitud', {
        idSolicitud: solicitud.id,
        diagnostico: document.getElementById('cotDiagnostico').value.trim(),
        conceptos: conceptos,
        total: total
      });

      if (!payload || !payload.success) {
        throw new Error(payload && payload.error ? payload.error : 'No se pudo guardar la cotización.');
      }

      idCotizacion = payload.idCotizacion;
      document.getElementById('cotizadorHint').textContent = 'Cotización creada: ' + idCotizacion;
      document.getElementById('pdfCotBtn').disabled = false;
      document.getElementById('programarSrvBtn').disabled = false;
      await cargarCotizacionesRegistradas();
      alert('Cotización guardada: ' + idCotizacion);
    } catch (error) {
      alert('Error al guardar cotización: ' + (error.message || error));
    }
  }

  async function generarPdf() {
    if (!idCotizacion || !solicitud) return;

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
    doc.text('Solicitud: ' + solicitud.id, 14, 35);
    doc.text('Cliente: ' + (solicitud.cliente || ''), 14, 42);
    doc.text('Servicio: ' + (solicitud.servicio || ''), 14, 49);

    let y = 60;
    conceptos.forEach(function (c, idx) {
      doc.text((idx + 1) + '. ' + c.desc + ' | ' + c.cant + ' x ' + c.precio + ' = ' + c.importe, 14, y);
      y += 7;
    });

    y += 5;
    doc.setFontSize(13);
    doc.text('TOTAL: ' + formatMoney(total), 14, y);

    doc.save(idCotizacion + '.pdf');
  }

  async function programarServicio() {
    if (!idCotizacion || !solicitud) {
      alert('Primero guarda la cotización.');
      return;
    }

    try {
      const fecha = document.getElementById('srvFecha').value;
      const hora = document.getElementById('srvHora').value;
      const tecnico = document.getElementById('srvTecnico').value.trim();
      const total = recalcTotal();

      if (!fecha || !tecnico) {
        alert('Fecha y técnico son obligatorios.');
        return;
      }

      const payload = await window.api('/programarServicio', {
        idSolicitud: solicitud.id,
        idCotizacion: idCotizacion,
        fecha: fecha,
        hora: hora,
        tecnico: tecnico,
        total: total
      });

      if (!payload || !payload.success) {
        throw new Error(payload && payload.error ? payload.error : 'No se pudo programar el servicio.');
      }

      alert('Servicio programado: ' + payload.idServicio);
      window.loadModule('servicios');
    } catch (error) {
      alert('Error al programar servicio: ' + (error.message || error));
    }
  }

  const refreshCotizacionesBtn = document.getElementById('refreshCotizacionesBtn');
  if (refreshCotizacionesBtn) {
    refreshCotizacionesBtn.addEventListener('click', function () {
      cargarCotizacionesRegistradas(true);
    });
  }

  cargarCotizacionesRegistradas(false);

  resolveSolicitud().catch(function (err) {
    const hint = document.getElementById('cotizadorHint');
    if (hint) hint.textContent = 'Error: ' + (err.message || err);
  });
})();
