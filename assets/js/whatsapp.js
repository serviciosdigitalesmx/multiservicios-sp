(function () {
  function sanitizePhone(raw) {
    const digits = String(raw || '').replace(/\D+/g, '');
    if (!digits) return '';
    if (digits.length === 10) return '52' + digits;
    if (digits.length === 12 && digits.indexOf('52') === 0) return digits;
    if (digits.length > 12) return digits.slice(-12);
    return digits;
  }

  function formatFolio(raw) {
    const str = String(raw || '').trim();
    if (!str) return '';
    const lettersMatch = str.match(/[A-Za-z]+/);
    const initials = (lettersMatch ? lettersMatch[0] : 'FO')
      .slice(0, 2)
      .toUpperCase();
    const digits = str.replace(/\D+/g, '');
    const ten = digits.padStart(10, '0').slice(-10);
    return initials + ' ' + ten.slice(0, 5) + '-' + ten.slice(5);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function makeButtonHtml(opts) {
    const phone = sanitizePhone(opts && opts.phone);
    if (!phone) return '<span class="module-muted">Sin WhatsApp</span>';
    const folioRaw = String(opts && opts.folio || '').trim();
    const folio = formatFolio(folioRaw);
    const cliente = String(opts && opts.cliente || '').trim();
    const className = String(opts && opts.className || 'btn-secondary').trim();
    const compact = opts && opts.compact ? ' wa-contact-btn--compact' : '';

    return '<button type="button" class="' + escapeHtml(className + ' wa-contact-btn' + compact) + '"' +
      ' data-phone="' + escapeHtml(phone) + '"' +
      ' data-cliente="' + escapeHtml(cliente) + '"' +
      ' data-folio="' + escapeHtml(folio) + '"' +
      ' title="WhatsApp">' +
      '<i class="fab fa-whatsapp"></i> WhatsApp</button>';
  }

  async function copyText(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (_) {}
  }

  function bind(root) {
    const container = root || document;
    container.querySelectorAll('.wa-contact-btn').forEach(function (btn) {
      if (btn.getAttribute('data-wa-bound') === '1') return;
      btn.setAttribute('data-wa-bound', '1');
      btn.addEventListener('click', async function () {
        const phone = btn.getAttribute('data-phone');
        const cliente = btn.getAttribute('data-cliente') || 'cliente';
        const folio = btn.getAttribute('data-folio') || '';
        await openContact({ phone: phone, cliente: cliente, folio: folio });
      });
    });
  }

  async function openContact(opts) {
    const phone = sanitizePhone(opts && opts.phone);
    if (!phone) return;
    const cliente = String(opts && opts.cliente || 'cliente');
    const folio = formatFolio(opts && opts.folio || '');
    const message = 'Hola ' + cliente + ', te contacta el técnico de Multiservicios SP.' +
      (folio ? '\nFolio: ' + folio : '');
    const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
    if (folio) {
      await copyText(folio);
    }
    window.open(url, '_blank');
  }

  window.WAUtils = {
    sanitizePhone: sanitizePhone,
    formatFolio: formatFolio,
    makeButtonHtml: makeButtonHtml,
    bind: bind,
    openContact: openContact
  };
})();
