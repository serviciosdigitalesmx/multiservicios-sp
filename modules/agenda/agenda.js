(function () {
  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  async function cargarAgenda() {
    const wrap = document.getElementById('agendaWrap');
    if (!wrap) return;

    wrap.innerHTML = '<p class="module-muted">Cargando agenda...</p>';

    const payload = await window.api('/agenda');
    const servicios = payload && payload.success ? payload.servicios : [];

    if (!servicios || servicios.length === 0) {
      wrap.innerHTML = '<p class="module-muted">No hay eventos programados.</p>';
      return;
    }

    const groups = {};
    servicios.forEach(function (s) {
      const key = s.fecha || 'Sin fecha';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });

    const dates = Object.keys(groups).sort();
    wrap.innerHTML = '<div class="agenda-grid">' + dates.map(function (date) {
      const items = groups[date].map(function (s) {
        const wa = window.WAUtils
          ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: s.idCotizacion || s.id, cliente: s.cliente, className: 'btn-secondary', compact: true })
          : '';
        return '<div class="agenda-item">' +
          '<div><strong>' + e(s.hora || '--:--') + '</strong> · ' + e(s.servicio) + '</div>' +
          '<div>' + e(s.cliente) + ' · ' + e(s.tecnico) + '</div>' +
          '<div class="agenda-status">' + e(s.estado || 'Programado') + '</div>' +
          '<div style="margin-top:6px;">' + wa + '</div>' +
          '</div>';
      }).join('');
      return '<article class="agenda-day-card">' +
        '<h3>' + e(date) + '</h3>' +
        '<div class="agenda-day-items">' + items + '</div>' +
        '</article>';
    }).join('') + '</div>';

    if (window.WAUtils) {
      window.WAUtils.bind(wrap);
    }
  }

  cargarAgenda().catch(function (err) {
    const wrap = document.getElementById('agendaWrap');
    if (wrap) wrap.innerHTML = '<p class="module-muted">Error: ' + e(err.message || err) + '</p>';
  });
})();
