(async function () {
  async function cargarDashboard() {
    try {
      const data = await window.api('/dashboard');

      if (!data || !data.success) {
        throw new Error(data && data.error ? data.error : 'Respuesta inválida');
      }

      document.getElementById('solicitudes').textContent = String(data.solicitudes || 0);
      document.getElementById('cotizaciones').textContent = String(data.cotizaciones || 0);
      const serviciosValue = Array.isArray(data.servicios) ? data.servicios.length : (data.servicios || 0);
      document.getElementById('servicios').textContent = String(serviciosValue);
      document.getElementById('ingresos').textContent = '$' + Number(data.ingresos || 0).toLocaleString('es-MX');
    } catch (error) {
      const msg = error && error.message ? error.message : 'No se pudo cargar dashboard';
      const target = document.querySelector('.dashboard-module .module-muted');
      if (target) {
        target.textContent = 'Error: ' + msg;
      }
    }
  }

  cargarDashboard();
})();
