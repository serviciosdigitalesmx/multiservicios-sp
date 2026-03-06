(function () {
  const MODULE_CONFIG = {
    dashboard: { html: 'dashboard.html', js: 'dashboard.js', css: 'dashboard.css', title: 'Tablero' },
    solicitudes: { html: 'solicitudes.html', js: 'solicitudes.js', css: 'solicitudes.css', title: 'Solicitudes' },
    cotizaciones: { html: 'cotizador.html', js: 'cotizador.js', title: 'Cotizaciones' },
    servicios: { html: 'servicios.html', js: 'servicios.js', title: 'Servicios' },
    agenda: { html: 'agenda.html', js: 'agenda.js', title: 'Agenda' }
  };

  const loadedStyles = new Set();

  function modulePath(moduleName, fileName) {
    return 'modules/' + moduleName + '/' + fileName;
  }

  function setActiveButton(moduleName) {
    document.querySelectorAll('.menu-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-module') === moduleName);
    });
  }

  function updateTitle(moduleName) {
    const title = MODULE_CONFIG[moduleName] ? MODULE_CONFIG[moduleName].title : moduleName;
    const titleNode = document.getElementById('workspace-title');
    if (titleNode) {
      titleNode.textContent = title;
    }
  }

  function ensureModuleStyle(moduleName) {
    const config = MODULE_CONFIG[moduleName];
    if (!config || !config.css) return;

    const href = modulePath(moduleName, config.css);
    if (loadedStyles.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-module-style', moduleName);
    document.head.appendChild(link);
    loadedStyles.add(href);
  }

  async function loadModule(moduleName) {
    if (window.integradorAuth && !window.integradorAuth.isAuthenticated()) {
      window.integradorAuth.openLogin();
      return;
    }

    const workspace = document.getElementById('workspace');
    const config = MODULE_CONFIG[moduleName];

    if (!workspace || !config) {
      return;
    }

    workspace.innerHTML = '<p class="module-muted">Cargando módulo...</p>';

    try {
      const htmlResp = await fetch(modulePath(moduleName, config.html));
      if (!htmlResp.ok) {
        throw new Error('No se encontró el módulo: ' + moduleName);
      }

      workspace.innerHTML = await htmlResp.text();
      ensureModuleStyle(moduleName);
      updateTitle(moduleName);
      setActiveButton(moduleName);

      const script = document.createElement('script');
      script.src = modulePath(moduleName, config.js) + '?t=' + Date.now();
      script.async = false;
      document.body.appendChild(script);
    } catch (err) {
      workspace.innerHTML = '<p class="module-muted">Error al cargar módulo: ' + err.message + '</p>';
    }
  }

  function bindMenu() {
    document.querySelectorAll('.menu-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const moduleName = btn.getAttribute('data-module');
        loadModule(moduleName);
      });
    });
  }

  window.loadModule = loadModule;

  document.addEventListener('DOMContentLoaded', function () {
    bindMenu();
    if (window.integradorAuth) {
      window.integradorAuth.requireAuth(function () {
        loadModule('dashboard');
      });
      window.addEventListener('integrador:auth-changed', function (event) {
        const ok = event && event.detail && event.detail.authenticated;
        if (ok) {
          loadModule('dashboard');
        }
      });
      return;
    }
    loadModule('dashboard');
  });
})();
