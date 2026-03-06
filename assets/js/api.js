const API_URL = 'https://script.google.com/macros/s/AKfycbyrq9rCjrRYT2oB515fx_N-Z6eT4Mnvf1YZwf9i0SRFu6lOFfLvO99urccU7OpfRqOT/exec';
const GET_CACHE_TTL_MS = 15000;
const REQUEST_TIMEOUT_MS = 12000;
const getCache = new Map();
const inFlight = new Map();
const STORAGE_KEY = 'sp_api_cache_v1';

function hydrateCacheFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.keys(parsed).forEach(function (key) {
      const entry = parsed[key];
      if (!entry || typeof entry !== 'object') return;
      if (!entry.ts || !entry.payload) return;
      getCache.set(key, entry);
    });
  } catch (_) {}
}

function persistCacheToStorage() {
  try {
    const obj = {};
    getCache.forEach(function (value, key) {
      obj[key] = value;
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (_) {}
}

hydrateCacheFromStorage();

function normalizeEndpoint(endpoint) {
  return String(endpoint || '').replace(/^\//, '');
}

function cloneSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return value;
  }
}

function shouldUseCache(action) {
  return action === 'dashboard' ||
    action === 'solicitudes' ||
    action === 'solicitudesArchivadas' ||
    action === 'cotizaciones' ||
    action === 'cotizacionesArchivadas' ||
    action === 'servicios' ||
    action === 'agenda';
}

function isFresh(entry) {
  return !!entry && (Date.now() - entry.ts) < GET_CACHE_TTL_MS;
}

async function fetchJson(url, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(function () {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, Object.assign({}, init, { signal: controller.signal }));
    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status);
    }
    const raw = await response.text();
    try {
      return JSON.parse(raw);
    } catch (_) {
      throw new Error('Respuesta no JSON del backend');
    }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function invalidateGetCache() {
  getCache.clear();
  inFlight.clear();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

async function api(endpoint, data = null, options = {}) {
  const action = normalizeEndpoint(endpoint);
  const force = !!options.force;

  if (!action) {
    throw new Error('Endpoint requerido');
  }

  if (!data) {
    const key = action;
    const canCache = shouldUseCache(action);
    const cached = getCache.get(key);
    if (!force && canCache && isFresh(cached)) {
      return cloneSafe(cached.payload);
    }

    // Modo stale-while-revalidate para respuesta inmediata.
    if (!force && canCache && cached && !isFresh(cached)) {
      if (!inFlight.has(key)) {
        const urlBg = new URL(API_URL);
        urlBg.searchParams.set('action', action);
        const bgReq = fetchJson(urlBg.toString(), { method: 'GET' })
          .then(function (payload) {
            getCache.set(key, { payload: payload, ts: Date.now() });
            persistCacheToStorage();
            return payload;
          })
          .finally(function () {
            inFlight.delete(key);
          });
        inFlight.set(key, bgReq);
      }
      return cloneSafe(cached.payload);
    }

    if (!force && inFlight.has(key)) {
      return cloneSafe(await inFlight.get(key));
    }

    const url = new URL(API_URL);
    url.searchParams.set('action', action);

    const request = fetchJson(url.toString(), {
      method: 'GET'
    });
    inFlight.set(key, request);
    try {
      const payload = await request;
      if (canCache) {
        getCache.set(key, { payload: payload, ts: Date.now() });
        persistCacheToStorage();
      }
      return cloneSafe(payload);
    } finally {
      inFlight.delete(key);
    }
  }

  const payload = Object.assign({ action: action }, data);
  const responsePayload = await fetchJson(API_URL, {
    method: 'POST',
    // Enviar texto JSON evita preflight de CORS por content-type custom.
    body: JSON.stringify(payload)
  });
  // Cualquier POST puede alterar datos de los paneles.
  invalidateGetCache();
  return responsePayload;
}

window.api = api;
window.apiInvalidateCache = invalidateGetCache;
window.apiPreload = function (endpoints) {
  const list = Array.isArray(endpoints) ? endpoints : [];
  return Promise.allSettled(list.map(function (ep) {
    return api(ep, null, { force: false });
  }));
};
