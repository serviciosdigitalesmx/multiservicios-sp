const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxEH1GvDg9Np6zhLMAGCh7nVDpaspqjYlUkNn8V0Buc22gLfsYf3PiDGZ0159M01-wC/exec';

const serviceConfig = {
  climatizacion: {
    name: 'Climatización Avanzada (VRV/Minisplit)',
    icon: '❄️',
    questions: [
      { id: 'p1', label: '¿Qué tecnología utiliza su sistema?', options: ['Minisplit Tradicional', 'Sistema VRV / VRF', 'Paquete / Central', 'Chiller'] },
      { id: 'p2', label: '¿Cuál es el objetivo?', options: ['Mantenimiento Preventivo', 'Diagnóstico de Falla', 'Instalación / Proyecto', 'Reubicación'] },
      { id: 'p3', label: '¿Cuándo fue el último servicio?', options: ['< 3 meses', '3-6 meses', '6-12 meses', '> 12 meses'] },
      { id: 'p4', label: '¿Cuántos equipos o zonas necesitas revisar?', options: ['1', '2', '3-5', '+5'] }
    ]
  },
  plomeria: {
    name: 'Plomería / Destape',
    icon: '🚰',
    questions: [
      { id: 'p1', label: '¿Qué problema tienes con tu instalación?', options: ['caño tapado', 'fuga de agua', 'wc tapado', 'grifo gotea', 'tubería rota'] },
      { id: 'p2', label: '¿Dónde se encuentra la instalación?', options: ['casa', 'oficina', 'local comercial', 'industria'] },
      { id: 'p3', label: '¿Cómo se comporta la falla?', options: ['constante', 'intermitente', 'solo por la noche', 'solo en horas pico'] }
    ]
  },
  electricidad: {
    name: 'Electricidad Crítica',
    icon: '⚡',
    questions: [
      { id: 'p1', label: '¿Qué falla eléctrica estás experimentando?', options: ['corto / plafones', 'apagones constantes', 'sin luz parcial', 'instalación nueva', 'tablero principal'] },
      { id: 'p2', label: '¿Dónde se encuentra la instalación?', options: ['casa', 'oficina', 'local comercial', 'industria'] },
      { id: 'p3', label: '¿La falla afecta todo el inmueble?', options: ['sí, completo', 'solo un área', 'solo algunos circuitos', 'aún sin diagnóstico'] }
    ]
  },
  soldadura: {
    name: 'Soldadura / Herrería',
    icon: '🧱',
    questions: [
      { id: 'p1', label: '¿Qué necesitas fabricar o reparar?', options: ['reparar portón', 'portón nuevo', 'escalera', 'estructura', 'rejas'] },
      { id: 'p2', label: '¿Dónde se realizará el trabajo?', options: ['casa', 'oficina', 'local comercial', 'industria'] },
      { id: 'p3', label: '¿Qué alcance tiene el trabajo?', options: ['reparación puntual', 'sustitución completa', 'fabricación nueva', 'proyecto por etapas'] }
    ]
  },
  camaras: {
    name: 'Cámaras / CCTV',
    icon: '🎥',
    questions: [
      { id: 'p1', label: '¿Qué servicio de videovigilancia requieres?', options: ['instalación nueva', 'reparar equipo', 'agregar cámara', 'configurar app'] },
      { id: 'p2', label: '¿Dónde se realizará la instalación?', options: ['casa', 'oficina', 'local comercial', 'industria'] },
      { id: 'p3', label: '¿Cuántas cámaras necesitas?', options: ['1-2', '3-4', '5-8', '+8'] }
    ]
  },
  general: {
    name: 'Mantenimiento General',
    icon: '🏠',
    questions: [
      { id: 'p1', label: '¿Qué tipo de mantenimiento necesitas?', options: ['pintura industrial', 'tablaroca', 'impermeabilizar', 'tinaco/bomba', 'varios'] },
      { id: 'p2', label: '¿Dónde se realizará el trabajo?', options: ['casa', 'oficina', 'local comercial', 'industria'] },
      { id: 'p3', label: '¿Qué tan grande es el trabajo?', options: ['1 día', '2-3 días', 'semana+', 'recurrente'] },
      { id: 'p4', label: '¿Se atiende completo o por etapas?', options: ['completo', 'por etapas', 'solo diagnóstico', 'por definir'] }
    ]
  }
};

let currentService = null;
let answers = {};
let currentStep = 0;
let totalSteps = 0;
let clientData = {
  nombre: '',
  telefono: '',
  direccion: '',
  whatsapp: '',
  comentarios: ''
};
let availabilityByDate = [];
let selectedAvailabilityDate = '';
let selectedAvailability = null;

function toggleCard(id) {
  const card = document.getElementById(id);
  if (card) card.classList.toggle('expanded');
}

function openModal(key) {
  currentService = key;
  answers = {};
  currentStep = 0;
  availabilityByDate = [];
  selectedAvailabilityDate = '';
  selectedAvailability = null;
  clientData = { nombre: '', telefono: '', direccion: '', whatsapp: '', comentarios: '' };

  const cfg = serviceConfig[key];
  totalSteps = cfg.questions.length + 5;

  document.getElementById('modalIcon').innerText = cfg.icon;
  document.getElementById('modalServiceName').innerText = cfg.name;

  renderStep();

  document.getElementById('diagnosticModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.querySelector('.hero-guide')?.remove();
}

function createOptionButtons(question) {
  function jsQuote(v) {
    return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  let html = '<div class="question-block"><label class="question-label">' + question.label + '</label><div class="options-grid" id="q-' + question.id + '">';
  question.options.forEach(function (opt) {
    const isSelected = answers[question.id] === opt;
    html += '<button class="option-btn ' + (isSelected ? 'selected' : '') + '" onclick="selectOption(\'' + jsQuote(question.id) + '\', \'' + jsQuote(opt) + '\', this)">' + opt + '</button>';
  });
  html += '</div></div>';
  return html;
}

async function fetchDisponibilidad() {
  const start = new Date();
  const startDate = start.toISOString().slice(0, 10);
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('action', 'disponibilidad');
  url.searchParams.set('days', '14');
  url.searchParams.set('startDate', startDate);

  const response = await fetch(url.toString(), { method: 'GET' });
  if (!response.ok) throw new Error('No se pudo cargar disponibilidad');
  const payload = JSON.parse(await response.text());
  if (!payload || !payload.success) {
    throw new Error(payload && payload.error ? payload.error : 'No se pudo cargar disponibilidad');
  }

  availabilityByDate = Array.isArray(payload.dias) ? payload.dias : [];
  if (!selectedAvailabilityDate && availabilityByDate.length) {
    selectedAvailabilityDate = availabilityByDate[0].fecha;
  }
}

function renderAvailabilityStep(container) {
  function jsQuote(v) {
    return String(v || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
  if (!availabilityByDate.length) {
    container.innerHTML = '<div class="question-block"><label class="question-label">Selecciona fecha y horario</label><p class="text-xs" style="margin:10px 0;color:var(--text-secondary)">Cargando horarios disponibles...</p></div>';
    return;
  }

  const day = availabilityByDate.find(function (d) { return d.fecha === selectedAvailabilityDate; }) || availabilityByDate[0];
  selectedAvailabilityDate = day.fecha;
  const daySlots = Array.isArray(day.slots) ? day.slots : [];

  let datesHtml = '<div class="availability-dates">';
  availabilityByDate.forEach(function (d) {
    const active = d.fecha === selectedAvailabilityDate ? 'is-active' : '';
    const dateObj = new Date(d.fecha + 'T00:00:00');
    const label = dateObj.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' });
    datesHtml += '<button type="button" class="availability-date-btn ' + active + '" onclick="selectAvailabilityDate(\'' + d.fecha + '\')">' + label + '<small>' + (d.slots ? d.slots.length : 0) + ' slots</small></button>';
  });
  datesHtml += '</div>';

  let slotsHtml = '<div class="availability-slots">';
  if (!daySlots.length) {
    slotsHtml += '<div class="availability-empty">No hay horarios para esta fecha. Prueba otro día.</div>';
  } else {
    daySlots.forEach(function (slot) {
      const isSelected = selectedAvailability && selectedAvailability.fecha === slot.fecha && selectedAvailability.hora === slot.hora && selectedAvailability.tecnico === slot.tecnico;
      slotsHtml += '<button type="button" class="availability-slot-btn ' + (isSelected ? 'is-selected' : '') + '" onclick="selectAvailabilitySlot(\'' + jsQuote(slot.fecha) + '\', \'' + jsQuote(slot.hora) + '\', \'' + jsQuote(slot.tecnico || '') + '\')">' +
        '<span>' + slot.hora + '</span><small>' + slot.tecnico + '</small></button>';
    });
  }
  slotsHtml += '</div>';

  container.innerHTML = '<div class="question-block">' +
    '<label class="question-label">Selecciona fecha y horario disponible</label>' +
    '<p class="text-xs" style="color:var(--text-secondary);margin-bottom:10px;">Solo se muestran horarios libres según agenda real de técnicos.</p>' +
    datesHtml + slotsHtml +
    '</div>';
}

function selectAvailabilityDate(date) {
  selectedAvailabilityDate = date;
  selectedAvailability = null;
  renderStep();
}

function selectAvailabilitySlot(fecha, hora, tecnico) {
  selectedAvailability = { fecha: fecha, hora: hora, tecnico: tecnico };
  renderStep();
}

function renderStep() {
  const cfg = serviceConfig[currentService];
  const container = document.getElementById('questionsContainer');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const modalNav = document.getElementById('modalNav');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  whatsappBtn.style.display = 'none';
  modalNav.style.display = 'flex';

  if (currentStep < cfg.questions.length) {
    const question = cfg.questions[currentStep];
    container.innerHTML = createOptionButtons(question);
    const options = document.querySelectorAll('.option-btn');
    options.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setTimeout(function () {
          if (currentStep < cfg.questions.length - 1) nextStep();
        }, 180);
      });
    });

    prevBtn.style.display = currentStep === 0 ? 'none' : 'flex';
    nextBtn.style.display = 'flex';
    nextBtn.disabled = !answers[question.id];
    nextBtn.innerHTML = 'Siguiente <i class="fas fa-arrow-right"></i>';
    return;
  }

  if (currentStep === cfg.questions.length) {
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
    nextBtn.innerHTML = 'Continuar <i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = !selectedAvailability;

    if (!availabilityByDate.length) {
      container.innerHTML = '<div class="question-block"><label class="question-label">Selecciona fecha y horario</label><p class="text-xs" style="margin:10px 0;color:var(--text-secondary)">Cargando disponibilidad real...</p></div>';
      fetchDisponibilidad().then(function () {
        renderStep();
      }).catch(function (err) {
        container.innerHTML = '<div class="question-block"><label class="question-label">Selección de horario</label><p style="color:#b42318">' + (err.message || err) + '</p><button class="nav-btn" onclick="renderStep()">Reintentar</button></div>';
      });
    } else {
      renderAvailabilityStep(container);
    }
    return;
  }

  if (currentStep < cfg.questions.length + 5) {
    const dataStep = currentStep - cfg.questions.length - 1;
    let html = '';

    if (dataStep === 0) {
      html = '<div class="question-block"><label class="question-label">¿A nombre de quién registramos el reporte técnico?</label><input type="text" id="clientNombre" placeholder="Ej: Juan Pérez" class="input-field" value="' + (clientData.nombre || '') + '"></div>';
    } else if (dataStep === 1) {
      html = '<div class="question-block"><label class="question-label">¿En qué número podemos contactarte?</label><input type="tel" id="clientTelefono" placeholder="Ej: 8112345678" class="input-field" value="' + (clientData.telefono || '') + '"></div>';
    } else if (dataStep === 2) {
      html = '<div class="question-block"><label class="question-label">¿Cuál es la dirección donde se realizará el trabajo?</label><input type="text" id="clientDireccion" placeholder="Ej: Calle, colonia, ciudad" class="input-field" value="' + (clientData.direccion || '') + '"><p class="text-xs" style="color: var(--text-secondary); margin-top: 8px;">Esto nos ayuda a llegar más rápido</p></div>';
    } else if (dataStep === 3) {
      html = '<div class="question-block"><label class="question-label">¿Algún comentario adicional o descripción del problema?</label><textarea id="clientComentarios" placeholder="Ej: El problema ocurre solo por las tardes, el equipo tiene 5 años, etc." class="input-field">' + (clientData.comentarios || '') + '</textarea></div>';
    }

    container.innerHTML = html;
    prevBtn.style.display = 'flex';
    nextBtn.style.display = 'flex';
    nextBtn.innerHTML = dataStep === 3 ? 'Ver resumen <i class="fas fa-check"></i>' : 'Siguiente <i class="fas fa-arrow-right"></i>';
    nextBtn.disabled = false;
    return;
  }

  showSummary();
}

function selectOption(qId, val, btn) {
  document.querySelectorAll('#q-' + qId + ' .option-btn').forEach(function (b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
  answers[qId] = val;
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.disabled = false;
}

function nextStep() {
  const cfg = serviceConfig[currentService];

  if (currentStep === cfg.questions.length && !selectedAvailability) {
    alert('Selecciona un horario disponible.');
    return;
  }

  if (currentStep > cfg.questions.length && currentStep < cfg.questions.length + 5) {
    const dataStep = currentStep - cfg.questions.length - 1;

    if (dataStep === 0) {
      const nombre = document.getElementById('clientNombre')?.value.trim();
      if (!nombre) {
        alert('El nombre es obligatorio');
        return;
      }
      clientData.nombre = nombre;
    } else if (dataStep === 1) {
      const telefono = document.getElementById('clientTelefono')?.value.trim();
      if (!telefono) {
        alert('El teléfono es obligatorio para contactarte');
        return;
      }
      clientData.telefono = telefono;
    } else if (dataStep === 2) {
      clientData.direccion = document.getElementById('clientDireccion')?.value.trim() || '';
    } else if (dataStep === 3) {
      clientData.comentarios = document.getElementById('clientComentarios')?.value.trim() || '';
    }
  }

  if (currentStep < totalSteps - 1) {
    currentStep++;
    renderStep();
  } else {
    showSummary();
  }
}

function previousStep() {
  const cfg = serviceConfig[currentService];
  if (currentStep > 0) {
    if (currentStep > cfg.questions.length && currentStep < cfg.questions.length + 5) {
      const dataStep = currentStep - cfg.questions.length - 1;
      if (dataStep === 0 && document.getElementById('clientNombre')) clientData.nombre = document.getElementById('clientNombre').value;
      if (dataStep === 1 && document.getElementById('clientTelefono')) clientData.telefono = document.getElementById('clientTelefono').value;
      if (dataStep === 2 && document.getElementById('clientDireccion')) clientData.direccion = document.getElementById('clientDireccion').value;
      if (dataStep === 3 && document.getElementById('clientComentarios')) clientData.comentarios = document.getElementById('clientComentarios').value;
    }
    currentStep--;
    renderStep();
  }
}

function showSummary() {
  const cfg = serviceConfig[currentService];
  let summaryHtml = '<div class="question-block"><h3 class="text-xl" style="color: var(--text-primary); margin-bottom: 16px;">📋 Resumen de tu solicitud</h3>';

  summaryHtml += '<div style="background: #e0f2f1; border: 1px solid #b2dfdb; border-radius: 16px; padding: 16px; margin-bottom: 20px; text-align: center;"><p style="color: #00695c; font-size: 0.95rem;">✨ <span style="font-weight: 600;">Gracias, ' + (clientData.nombre || 'cliente') + '</span>. Hemos procesado tu diagnóstico.</p></div>';

  summaryHtml += '<div style="background: var(--bg-primary); border-radius: 16px; padding: 20px; margin-bottom: 16px;">';
  summaryHtml += '<div style="border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 12px;">' +
    '<p style="color: var(--accent-light); font-weight: 600; margin-bottom: 8px;">👤 TUS DATOS</p>' +
    '<p style="color: var(--text-primary);"><strong>Nombre:</strong> ' + (clientData.nombre || 'No proporcionado') + '</p>' +
    (clientData.telefono ? '<p style="color: var(--text-primary);"><strong>Teléfono:</strong> ' + clientData.telefono + '</p>' : '') +
    (clientData.direccion ? '<p style="color: var(--text-primary);"><strong>Dirección:</strong> ' + clientData.direccion + '</p>' : '') +
    '</div>';

  if (selectedAvailability) {
    summaryHtml += '<div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:12px;">' +
      '<p style="color: var(--accent-light); font-weight: 600; margin-bottom: 8px;">🗓️ HORARIO SELECCIONADO</p>' +
      '<p style="color: var(--text-primary);"><strong>Fecha:</strong> ' + selectedAvailability.fecha + '</p>' +
      '<p style="color: var(--text-primary);"><strong>Hora:</strong> ' + selectedAvailability.hora + '</p>' +
      '<p style="color: var(--text-primary);"><strong>Técnico:</strong> ' + selectedAvailability.tecnico + '</p>' +
      '</div>';
  }

  summaryHtml += '<p style="color: var(--accent-light); font-weight: 600; margin-bottom: 12px;">🔧 DIAGNÓSTICO</p>';

  const diagnosticText = [];
  cfg.questions.forEach(function (q) {
    if (answers[q.id]) diagnosticText.push(answers[q.id]);
  });

  summaryHtml += '<p style="color: var(--text-primary); background: white; padding: 12px; border-radius: 12px; margin-bottom: 12px;">' + diagnosticText.join(' · ') + '</p>';

  if (clientData.comentarios) {
    summaryHtml += '<div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-light);">' +
      '<p style="color: var(--accent-light); font-weight: 600; margin-bottom: 4px;">📝 COMENTARIOS</p>' +
      '<p style="color: var(--text-primary); background: white; padding: 12px; border-radius: 12px;">' + clientData.comentarios + '</p>' +
      '</div>';
  }

  summaryHtml += '</div></div>';

  document.getElementById('questionsContainer').innerHTML = summaryHtml;
  document.getElementById('modalNav').style.display = 'none';

  const whatsappBtn = document.getElementById('whatsappBtn');
  whatsappBtn.style.display = 'flex';
  whatsappBtn.disabled = false;
  whatsappBtn.innerHTML = '<span>📱</span><span>Conectar ahora con un técnico especializado</span>';
}

async function sendToWhatsApp() {
  const cfg = serviceConfig[currentService];
  const phone = '5218131590917';

  const ahora = new Date();
  const year = ahora.getFullYear().toString().slice(-2);
  const month = (ahora.getMonth() + 1).toString().padStart(2, '0');
  const day = ahora.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  const folio = 'SOL-' + year + month + day + '-' + random;

  const datosParaCloud = {
    action: 'nuevaSolicitud',
    idSolicitud: folio,
    cliente: clientData.nombre,
    nombreCliente: clientData.nombre,
    telefono: clientData.telefono,
    servicio: cfg.name,
    direccion: clientData.direccion,
    comentarios: clientData.comentarios,
    whatsappCliente: clientData.whatsapp || clientData.telefono,
    respuestas: answers,
    servicioDetalle: answers.p2 || answers.p3 || '',
    folio: folio,
    fechaPreferida: selectedAvailability ? selectedAvailability.fecha : '',
    horaPreferida: selectedAvailability ? selectedAvailability.hora : '',
    tecnicoPreferido: selectedAvailability ? selectedAvailability.tecnico : ''
  };

  cfg.questions.forEach(function (q, index) {
    datosParaCloud['pregunta' + (index + 1)] = q.label;
    datosParaCloud['respuesta' + (index + 1)] = answers[q.id] || '';
  });

  const whatsappBtn = document.getElementById('whatsappBtn');
  const originalText = whatsappBtn.innerHTML;
  whatsappBtn.disabled = true;
  whatsappBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Enviando solicitud...</span>';

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(datosParaCloud)
    });

    if (!response.ok) throw new Error('Error HTTP ' + response.status);
    const payload = JSON.parse(await response.text());
    if (!payload || !payload.success) {
      throw new Error(payload && payload.error ? payload.error : 'No se pudo guardar la solicitud');
    }
  } catch (error) {
    console.error('Error al guardar en nube:', error);
    alert('No se pudo guardar tu solicitud en el sistema. Inténtalo de nuevo.');
    whatsappBtn.disabled = false;
    whatsappBtn.innerHTML = originalText;
    return;
  }

  const diagnosticText = [];
  cfg.questions.forEach(function (q) {
    if (answers[q.id]) diagnosticText.push(answers[q.id]);
  });

  let mensaje = 'Hola, buen día. Soy ' + (clientData.nombre || 'un cliente') + '. Generé un diagnóstico para ' + cfg.name + '. Mi folio es ' + folio + '.\n\n';
  if (selectedAvailability) {
    mensaje += '🗓️ *Horario solicitado:* ' + selectedAvailability.fecha + ' ' + selectedAvailability.hora + ' con ' + selectedAvailability.tecnico + '\n\n';
  }
  mensaje += '📋 *Diagnóstico:* ' + diagnosticText.join(' · ') + '\n\n';
  if (clientData.comentarios) mensaje += '📝 *Comentarios:* ' + clientData.comentarios + '\n\n';
  mensaje += '📍 *Dirección:* ' + (clientData.direccion || 'No proporcionada') + '\n';
  mensaje += '📞 *Teléfono:* ' + clientData.telefono;

  const url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(mensaje);
  window.open(url, '_blank');

  setTimeout(function () {
    alert('Solicitud enviada. Te contactaremos en el horario elegido o para confirmar ajuste.');
  }, 500);

  setTimeout(closeModal, 1200);
}

function closeModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('diagnosticModal').style.display = 'none';
  document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

window.toggleCard = toggleCard;
window.openModal = openModal;
window.selectOption = selectOption;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.sendToWhatsApp = sendToWhatsApp;
window.closeModal = closeModal;
window.selectAvailabilityDate = selectAvailabilityDate;
window.selectAvailabilitySlot = selectAvailabilitySlot;
window.renderStep = renderStep;
