(function () {
  const MODULE_CONFIG = {
    dashboard: { html: 'dashboard.html', js: 'dashboard.js', css: 'dashboard.css', title: 'Tablero' },
    solicitudes: { html: 'solicitudes.html', js: 'solicitudes.js', css: 'solicitudes.css', title: 'Solicitudes' },
    cotizaciones: { html: 'cotizador.html', js: 'cotizador.js', title: 'Cotizaciones' },
    servicios: { html: 'servicios.html', js: 'servicios.js', title: 'Servicios' },
    agenda: { html: 'agenda.html', js: 'agenda.js', title: 'Agenda' }
  };

  const loadedStyles = new Set();
  const htmlCache = new Map();
  const scriptCache = new Map();
  let activeLoadToken = 0;

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

  async function getModuleHtml(moduleName, config) {
    const key = moduleName + ':html';
    if (htmlCache.has(key)) {
      return htmlCache.get(key);
    }

    const resp = await fetch(modulePath(moduleName, config.html));
    if (!resp.ok) {
      throw new Error('No se encontró el módulo: ' + moduleName);
    }
    const html = await resp.text();
    htmlCache.set(key, html);
    return html;
  }

  async function runModuleScript(moduleName, config) {
    const key = moduleName + ':js';
    let source = scriptCache.get(key);
    if (!source) {
      const scriptResp = await fetch(modulePath(moduleName, config.js));
      if (!scriptResp.ok) {
        throw new Error('No se encontró el script del módulo: ' + moduleName);
      }
      source = await scriptResp.text();
      scriptCache.set(key, source);
    }

    // Ejecutar en cada navegación para reinicializar listeners del módulo.
    new Function(source)();
  }

  function prefetchModule(moduleName) {
    const config = MODULE_CONFIG[moduleName];
    if (!config) return;

    getModuleHtml(moduleName, config).catch(function () {});
    const key = moduleName + ':js';
    if (!scriptCache.has(key)) {
      fetch(modulePath(moduleName, config.js))
        .then(function (resp) { return resp.ok ? resp.text() : ''; })
        .then(function (src) {
          if (src) scriptCache.set(key, src);
        })
        .catch(function () {});
    }
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

    const loadToken = ++activeLoadToken;
    workspace.innerHTML = '<p class="module-muted">Cargando módulo...</p>';

    try {
      const html = await getModuleHtml(moduleName, config);
      if (loadToken !== activeLoadToken) {
        return;
      }

      workspace.innerHTML = html;
      ensureModuleStyle(moduleName);
      updateTitle(moduleName);
      setActiveButton(moduleName);
      await runModuleScript(moduleName, config);

      // Precarga el resto de módulos en segundo plano tras primer render.
      if (moduleName === 'dashboard') {
        const idle = window.requestIdleCallback || function (cb) { setTimeout(cb, 50); };
        idle(function () {
          Object.keys(MODULE_CONFIG).forEach(function (name) {
            if (name !== 'dashboard') prefetchModule(name);
          });
        });
      }
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
