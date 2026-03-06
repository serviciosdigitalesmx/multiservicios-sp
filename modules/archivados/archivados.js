(function () {
  let activeTab = 'solicitudes';

  function e(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function setTab(tab) {
    activeTab = tab;
    const btnSol = document.getElementById('tabSolicitudesArch');
    const btnCot = document.getElementById('tabCotizacionesArch');
    if (btnSol && btnCot) {
      btnSol.className = (tab === 'solicitudes') ? 'btn-primary' : 'btn-secondary';
      btnCot.className = (tab === 'cotizaciones') ? 'btn-primary' : 'btn-secondary';
    }
  }

  function renderSolicitudes(list) {
    const thead = document.getElementById('theadArchivados');
    const tbody = document.getElementById('tbodyArchivados');
    if (!thead || !tbody) return;

    thead.innerHTML = '<tr><th>ID</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>WhatsApp</th></tr>';
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Sin solicitudes archivadas.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (s) {
      const wa = window.WAUtils
        ? window.WAUtils.makeButtonHtml({ phone: s.telefono, folio: s.id, cliente: s.cliente, className: 'btn-secondary', compact: true })
        : '';
      return '<tr>' +
        '<td>' + e(s.id) + '</td>' +
        '<td>' + e(s.cliente) + '</td>' +
        '<td>' + e(s.servicio) + '</td>' +
        '<td>' + e(s.estado) + '</td>' +
        '<td>' + wa + '</td>' +
        '</tr>';
    }).join('');

    if (window.WAUtils) window.WAUtils.bind(tbody);
  }

  function renderCotizaciones(list) {
    const thead = document.getElementById('theadArchivados');
    const tbody = document.getElementById('tbodyArchivados');
    if (!thead || !tbody) return;

    thead.innerHTML = '<tr><th>ID</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Total</th><th>WhatsApp</th></tr>';
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6">Sin cotizaciones archivadas.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function (c) {
      const wa = window.WAUtils
        ? window.WAUtils.makeButtonHtml({ phone: c.telefono, folio: c.idCotizacion, cliente: c.cliente, className: 'btn-secondary', compact: true })
        : '';
      return '<tr>' +
        '<td>' + e(c.idCotizacion) + '</td>' +
        '<td>' + e(c.cliente) + '</td>' +
        '<td>' + e(c.servicio) + '</td>' +
        '<td>' + e(c.estado) + '</td>' +
        '<td>$' + Number(c.total || 0).toLocaleString('es-MX') + '</td>' +
        '<td>' + wa + '</td>' +
        '</tr>';
    }).join('');

    if (window.WAUtils) window.WAUtils.bind(tbody);
  }

  async function loadData(force) {
    const tbody = document.getElementById('tbodyArchivados');
    if (tbody) tbody.innerHTML = '<tr><td>Cargando...</td></tr>';
    if (activeTab === 'solicitudes') {
      const payload = await window.api('/solicitudesArchivadas', null, { force: !!force });
      renderSolicitudes(payload && payload.success ? payload.solicitudes : []);
      return;
    }
    const payload = await window.api('/cotizacionesArchivadas', null, { force: !!force });
    renderCotizaciones(payload && payload.success ? payload.cotizaciones : []);
  }

  const btnSol = document.getElementById('tabSolicitudesArch');
  const btnCot = document.getElementById('tabCotizacionesArch');
  const refreshBtn = document.getElementById('refreshArchivados');

  if (btnSol) {
    btnSol.addEventListener('click', function () {
      setTab('solicitudes');
      loadData(false).catch(function (err) { alert('Error: ' + (err.message || err)); });
    });
  }

  if (btnCot) {
    btnCot.addEventListener('click', function () {
      setTab('cotizaciones');
      loadData(false).catch(function (err) { alert('Error: ' + (err.message || err)); });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', function () {
      loadData(true).catch(function (err) { alert('Error: ' + (err.message || err)); });
    });
  }

  setTab('solicitudes');
  loadData(false).catch(function (err) {
    const tbody = document.getElementById('tbodyArchivados');
    if (tbody) tbody.innerHTML = '<tr><td>Error: ' + e(err.message || err) + '</td></tr>';
  });
})();
