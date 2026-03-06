(function () {
  let serviciosCache = [];

  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function actualizarEstado(idServicio, estado, cambiosPosponer) {
    let payload = { idServicio: idServicio, estado: estado };
    if (estado === 'POSPUESTO') {
      if (cambiosPosponer && cambiosPosponer.nuevaFecha) {
        payload.nuevaFecha = cambiosPosponer.nuevaFecha;
        payload.nuevaHora = cambiosPosponer.nuevaHora || '';
      } else {
        const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', '');
        if (!nuevaFecha) return;
        const nuevaHora = prompt('Nueva hora (HH:MM, opcional):', '') || '';
        payload.nuevaFecha = nuevaFecha.trim();
        payload.nuevaHora = nuevaHora.trim();
      }
    }

    const resp = await window.api('/updateServicioEstado', payload);
    if (!resp || !resp.success) {
      throw new Error(resp && resp.error ? resp.error : 'No se pudo actualizar el servicio');
    }
  }

  function canCloseServicio(s) {
    const estado = String(s && s.estado || '').toUpperCase();
    return !!(s && s.puedeCerrar) && estado !== 'REALIZADO' && estado !== 'CANCELADO';
  }

  function render(list) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (!tbody) return;
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Sin servicios programados.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (s) {
      const canClose = canCloseServicio(s);
      const actions = canClose
        ? (
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button type="button" class="btn-primary srv-action" data-id="' + e(s.id) + '" data-estado="REALIZADO">Finalizar</button>' +
          '<button type="button" class="btn-secondary srv-action" data-id="' + e(s.id) + '" data-estado="POSPUESTO">Posponer</button>' +
          '<button type="button" class="btn-secondary srv-action" data-id="' + e(s.id) + '" data-estado="CANCELADO">Cancelar</button>' +
          '</div>'
        )
        : '<span class="module-muted">Sin acciones</span>';
      const wa = window.WAUtils
        ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: (s.idCotizacion || s.id), cliente: s.cliente, className: 'btn-secondary', compact: true })
        : '';

      return '<tr>' +
        '<td>' + e(s.id) + '</td>' +
        '<td>' + e(s.cliente) + '</td>' +
        '<td>' + e(s.servicio) + '</td>' +
        '<td>' + e(s.fecha) + ' ' + e(s.hora) + '</td>' +
        '<td>' + e(s.tecnico) + '</td>' +
        '<td>' + e(s.estado || '') + '</td>' +
        '<td style="display:flex;gap:6px;flex-wrap:wrap;">' + actions + wa + '</td>' +
        '</tr>';
    }).join('');

    if (window.WAUtils) window.WAUtils.bind(tbody);

    tbody.querySelectorAll('.srv-action').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const idServicio = btn.getAttribute('data-id');
        const estado = btn.getAttribute('data-estado');
        const ok = confirm('¿Confirmas cambiar a ' + estado + '?');
        if (!ok) return;

        const prev = serviciosCache.slice();
        const row = serviciosCache.find(function (s) { return String(s.id) === String(idServicio); });
        if (!row) return;

        let cambiosPosponer = null;
        if (estado === 'POSPUESTO') {
          const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', row.fecha || '');
          if (!nuevaFecha) return;
          const nuevaHora = prompt('Nueva hora (HH:MM, opcional):', row.hora || '') || '';
          cambiosPosponer = { nuevaFecha: nuevaFecha.trim(), nuevaHora: nuevaHora.trim() };
          row.fecha = nuevaFecha.trim();
          row.hora = nuevaHora.trim();
        }

        row.estado = estado;
        row.puedeCerrar = false;
        render(serviciosCache);

        try {
          await actualizarEstado(idServicio, estado, cambiosPosponer);
          await cargar(true);
        } catch (err) {
          serviciosCache = prev;
          render(serviciosCache);
          alert('Error: ' + (err.message || err));
        }
      });
    });
  }

  async function cargar(force) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    const payload = await window.api('/servicios', null, { force: !!force });
    serviciosCache = payload && payload.success ? payload.servicios : [];
    render(serviciosCache);
  }

  const refreshBtn = document.getElementById('refreshServicios');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      cargar(true).catch(function (err) {
        alert('Error: ' + (err.message || err));
      });
    });
  }

  cargar(false).catch(function (err) {
    const tbody = document.querySelector('#tablaServicios tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="7">Error: ' + e(err.message || err) + '</td></tr>';
    }
  });
})();
