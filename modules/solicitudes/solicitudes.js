(function () {
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function estadoClass(estado) {
    const normalized = String(estado || '').toLowerCase();
    if (normalized === 'cotizando') return 'estado-cotizando';
    return 'estado-nueva';
  }

  async function cargarSolicitudes(force) {
    const tbody = document.querySelector('#tablaSolicitudes tbody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    try {
      const payload = await window.api('/solicitudes', null, { force: !!force });
      if (!payload || !payload.success) {
        throw new Error(payload && payload.error ? payload.error : 'Respuesta inválida');
      }

      const solicitudes = Array.isArray(payload.solicitudes) ? payload.solicitudes : [];
      if (solicitudes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">Sin solicitudes registradas.</td></tr>';
        return;
      }

      tbody.innerHTML = solicitudes.map(function (s) {
        const wa = window.WAUtils
          ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: s.id, cliente: s.cliente, className: 'btn-secondary', compact: true })
          : '';
        return '<tr>' +
          '<td>' + escapeHtml(s.id) + '</td>' +
          '<td>' + escapeHtml(s.cliente) + '</td>' +
          '<td>' + escapeHtml(s.servicio) + '</td>' +
          '<td><span class="estado-pill ' + estadoClass(s.estado) + '">' + escapeHtml(s.estado || 'Nueva') + '</span></td>' +
          '<td style="display:flex;gap:6px;flex-wrap:wrap;">' +
          '<button type="button" class="solicitudes-action" data-id="' + escapeHtml(s.id) + '">Cotizar</button>' +
          '<button type="button" class="btn-secondary sol-archive" data-id="' + escapeHtml(s.id) + '"><i class="fas fa-archive"></i></button>' +
          wa +
          '</td>' +
          '</tr>';
      }).join('');

      if (window.WAUtils) {
        window.WAUtils.bind(tbody);
      }

      tbody.querySelectorAll('.solicitudes-action').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const idSolicitud = btn.getAttribute('data-id');
          window.__selectedSolicitudId = idSolicitud;
          try {
            const payload = await window.api('/marcarSolicitudCotizando', { idSolicitud: idSolicitud });
            if (!payload || !payload.success) {
              throw new Error(payload && payload.error ? payload.error : 'No se pudo actualizar el estado');
            }
          } catch (err) {
            // No bloqueamos el flujo de cotización si falla el cambio de estado.
            console.error('No se pudo marcar la solicitud como cotizando:', err);
          }
          window.loadModule('cotizaciones');
        });
      });

      tbody.querySelectorAll('.sol-archive').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const idSolicitud = btn.getAttribute('data-id');
          const ok = confirm('¿Archivar solicitud ' + idSolicitud + '?');
          if (!ok) return;
          try {
            const payload = await window.api('/archiveSolicitud', { idSolicitud: idSolicitud });
            if (!payload || !payload.success) {
              throw new Error(payload && payload.error ? payload.error : 'No se pudo archivar');
            }
            await cargarSolicitudes(true);
          } catch (err) {
            alert('Error: ' + (err.message || err));
          }
        });
      });
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="5">Error al cargar solicitudes: ' + escapeHtml(error.message || error) + '</td></tr>';
    }
  }

  const refreshBtn = document.getElementById('refreshSolicitudes');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      cargarSolicitudes(true);
    });
  }

  cargarSolicitudes(false);
})();
