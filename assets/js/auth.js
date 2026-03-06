(function () {
  const SESSION_KEY = 'sp_integrador_auth_v1';
  const SESSION_HOURS = 12;
  const CREDENTIALS = {
    user: 'admin',
    pass: 'Multiservicios2026!'
  };

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch (_) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function setSession(user) {
    const payload = {
      user: String(user || ''),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return payload;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isAuthenticated() {
    return !!getSession();
  }

  function showGate() {
    document.body.classList.add('auth-locked');
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'grid';
  }

  function hideGate() {
    document.body.classList.remove('auth-locked');
    const gate = document.getElementById('authGate');
    if (gate) gate.style.display = 'none';
  }

  function verify(user, pass) {
    return user === CREDENTIALS.user && pass === CREDENTIALS.pass;
  }

  function login(user, pass) {
    if (!verify(user, pass)) return false;
    setSession(user);
    hideGate();
    window.dispatchEvent(new CustomEvent('integrador:auth-changed', { detail: { authenticated: true } }));
    return true;
  }

  function logout() {
    clearSession();
    showGate();
    const workspace = document.getElementById('workspace');
    if (workspace) {
      workspace.innerHTML = '<p class="module-muted">Sesión cerrada.</p>';
    }
    window.dispatchEvent(new CustomEvent('integrador:auth-changed', { detail: { authenticated: false } }));
  }

  function requireAuth(onReady) {
    if (isAuthenticated()) {
      hideGate();
      if (typeof onReady === 'function') onReady();
      return;
    }
    showGate();
  }

  function bindAuthUI() {
    const form = document.getElementById('authForm');
    const errorNode = document.getElementById('authError');
    const userNode = document.getElementById('authUser');
    const passNode = document.getElementById('authPass');
    const logoutBtn = document.getElementById('logoutBtn');

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const user = String(userNode && userNode.value || '').trim();
        const pass = String(passNode && passNode.value || '').trim();

        if (!login(user, pass)) {
          if (errorNode) errorNode.textContent = 'Credenciales inválidas.';
          return;
        }

        if (errorNode) errorNode.textContent = '';
        if (passNode) passNode.value = '';
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
  }

  window.integradorAuth = {
    isAuthenticated: isAuthenticated,
    requireAuth: requireAuth,
    openLogin: showGate,
    logout: logout
  };

  document.addEventListener('DOMContentLoaded', function () {
    bindAuthUI();
    if (isAuthenticated()) {
      hideGate();
    } else {
      showGate();
    }
  });
})();
