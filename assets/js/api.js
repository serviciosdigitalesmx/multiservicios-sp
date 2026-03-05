const API_URL = 'https://script.google.com/macros/s/AKfycbyrq9rCjrRYT2oB515fx_N-Z6eT4Mnvf1YZwf9i0SRFu6lOFfLvO99urccU7OpfRqOT/exec';

function normalizeEndpoint(endpoint) {
  return String(endpoint || '').replace(/^\//, '');
}

async function api(endpoint, data = null) {
  const action = normalizeEndpoint(endpoint);

  if (!action) {
    throw new Error('Endpoint requerido');
  }

  if (!data) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);

    const response = await fetch(url.toString(), {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status);
    }

    return response.json();
  }

  const payload = Object.assign({ action: action }, data);
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Error HTTP ' + response.status);
  }

  return response.json();
}

window.api = api;
