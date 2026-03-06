/**
 * MULTISERVICIOS SP - BACKEND ROBUSTO
 * Google Apps Script (Web App)
 */

const CONFIG = {
  SPREADSHEET_ID: '1srCIga6m0lQFzIdf7nbttklQhknE_7T8Py8lcay0vks',
  SHEET_NAMES: {
    SOLICITUDES: 'Solicitudes',
    COTIZACIONES: 'Cotizaciones',
    SERVICIOS: 'Servicios',
    MATERIALES: 'MaterialesBase',
    TECNICOS: 'Tecnicos',
    LOG: 'LogEventos'
  },
  API_TOKEN: 'MULTI2024SP_SECRET_TOKEN_CAMBIAR_EN_PRODUCCION'
};

let _initialized = false;

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID') || CONFIG.SPREADSHEET_ID,
    apiToken: props.getProperty('API_TOKEN') || CONFIG.API_TOKEN
  };
}

function bootstrapPropertiesIfNeeded() {
  const props = PropertiesService.getScriptProperties();
  const cfg = getConfig();

  if (!props.getProperty('SPREADSHEET_ID') && cfg.spreadsheetId) {
    props.setProperty('SPREADSHEET_ID', cfg.spreadsheetId);
  }

  if (!props.getProperty('API_TOKEN') && cfg.apiToken) {
    props.setProperty('API_TOKEN', cfg.apiToken);
  }
}

function getSpreadsheet() {
  bootstrapPropertiesIfNeeded();
  const props = PropertiesService.getScriptProperties();
  const cfg = getConfig();
  let ss;

  try {
    ss = SpreadsheetApp.openById(cfg.spreadsheetId);
    console.log('Spreadsheet abierto: ' + ss.getName());
  } catch (e) {
    console.warn('Spreadsheet no encontrado con ID actual. Creando uno nuevo...');
    ss = SpreadsheetApp.create('Multiservicios SP - Base de Datos');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    console.log('Nuevo spreadsheet creado con ID: ' + ss.getId());
  }

  if (!_initialized) {
    createAllSheetsIfNotExist(ss);
    _initialized = true;
  }

  return ss;
}

function createAllSheetsIfNotExist(ss) {
  ensureSheetExists(ss, CONFIG.SHEET_NAMES.SOLICITUDES, [
    'ID_Solicitud', 'Timestamp', 'Nombre_Cliente', 'Telefono', 'Servicio', 'Direccion', 'Estado', 'Notas'
  ]);

  ensureSheetExists(ss, CONFIG.SHEET_NAMES.COTIZACIONES, [
    'ID_Cotizacion', 'Timestamp', 'Servicio',
    'Nombre_Cliente', 'Telefono', 'Direccion', 'WhatsApp_Cliente',
    'Pregunta1', 'Respuesta1', 'Pregunta2', 'Respuesta2',
    'Pregunta3', 'Respuesta3', 'Pregunta4', 'Respuesta4',
    'Diagnostico_Completo_JSON', 'Folio_Generado', 'Estado', 'Notas_Tecnico'
  ]);

  ensureSheetExists(ss, CONFIG.SHEET_NAMES.SERVICIOS, [
    'ID_Servicio', 'Timestamp', 'ID_Cotizacion', 'ID_Solicitud', 'Cliente', 'Telefono',
    'Servicio', 'Fecha', 'Hora', 'Tecnico', 'Estado', 'Total'
  ]);

  const materialSheet = ensureSheetExists(ss, CONFIG.SHEET_NAMES.MATERIALES, [
    'ID', 'Familia', 'Categoria', 'Descripcion', 'Unidad', 'PrecioBase', 'Proveedor', 'SKU'
  ]);

  if (materialSheet.getLastRow() <= 1) {
    loadDefaultMaterials(materialSheet);
  }

  ensureSheetExists(ss, CONFIG.SHEET_NAMES.TECNICOS, [
    'ID_Tecnico', 'Nombre', 'Telefono', 'Email', 'Especialidades', 'Activo', 'Fecha_Registro'
  ]);

  ensureSheetExists(ss, CONFIG.SHEET_NAMES.LOG, [
    'Timestamp', 'Tipo', 'ID_Referencia', 'Mensaje', 'IP_Origen', 'UserAgent'
  ]);

  console.log('Hojas verificadas/creadas correctamente');
}

function ensureSheetExists(ss, sheetName, expectedHeaders) {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    console.log('Hoja creada: ' + sheetName);
    return sheet;
  }

  const lastColumn = Math.max(sheet.getLastColumn(), expectedHeaders.length);
  const currentHeaders = lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];

  const hasAnyHeader = currentHeaders.some(function (h) {
    return String(h || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    console.log('Encabezados inicializados en hoja existente: ' + sheetName);
  }

  return sheet;
}

function loadDefaultMaterials(sheet) {
  const defaultMaterials = [
    [1, 'Climas', 'Gas Refrigerante', 'R410A (10lb)', 'kg', 1200, 'Dalkin', 'R410A-10'],
    [2, 'Climas', 'Gas Refrigerante', 'R32 (10lb)', 'kg', 1100, 'Dalkin', 'R32-10'],
    [3, 'Climas', 'Componentes', 'Capacitor 35uF', 'pieza', 180, 'Universal', 'CAP35'],
    [4, 'Climas', 'Componentes', 'Capacitor 45uF', 'pieza', 220, 'Universal', 'CAP45'],
    [5, 'Climas', 'Limpieza', 'Lavado quimico (kit)', 'kit', 450, 'Quimtex', 'LQ-100'],
    [6, 'Plomería', 'Tubería', 'Tubo Plus 1/2" (6m)', 'pieza', 180, 'Durman', 'TP-12'],
    [7, 'Plomería', 'Tubería', 'Tubo Plus 3/4" (6m)', 'pieza', 240, 'Durman', 'TP-34'],
    [8, 'Plomería', 'Conexiones', 'Pegamento PVC (litro)', 'litro', 220, 'Tangit', 'PEG-1L'],
    [9, 'Plomería', 'Conexiones', 'Teflón (rollo)', 'pieza', 35, 'Multicapa', 'TEFLON'],
    [10, 'Electricidad', 'Cableado', 'Cable THW #12 (100m)', 'rollo', 850, 'Condumex', 'THW-12'],
    [11, 'Electricidad', 'Cableado', 'Cable THW #10 (100m)', 'rollo', 1250, 'Condumex', 'THW-10'],
    [12, 'Electricidad', 'Protección', 'Pastilla termomagnética 20A', 'pieza', 280, 'Siemens', 'PTM20'],
    [13, 'Herrería', 'Material', 'Perfil estructural 2" (6m)', 'pieza', 650, 'AceroMX', 'P2-6'],
    [14, 'Herrería', 'Consumibles', 'Electrodo 6013 (kg)', 'kg', 120, 'Infra', 'ELEC-6013'],
    [15, 'CCTV', 'Cámaras', 'Cámara IP 2MP exterior', 'pieza', 1850, 'Dahua', 'IPC-HFW2231'],
    [16, 'CCTV', 'Cableado', 'Cable UTP CAT6 (100m)', 'rollo', 950, 'Genérico', 'UTP-CAT6'],
    [17, 'General', 'Pintura', 'Pintura vinílica (litro)', 'litro', 120, 'Comex', 'VINILICA'],
    [18, 'General', 'Tablaroca', 'Placa tablaroca 1.22x2.44', 'pieza', 280, 'Volcanita', 'TABLA-122']
  ];

  sheet.getRange(2, 1, defaultMaterials.length, defaultMaterials[0].length).setValues(defaultMaterials);
  console.log(defaultMaterials.length + ' materiales precargados');
}

function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doOptions() {
  return createCorsResponse({ success: true, method: 'OPTIONS' });
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('No se recibieron datos');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('JSON invalido en el body');
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const ss = getSpreadsheet();
    const data = parseRequestBody(e);
    const action = String(data.action || '').trim();

    if (action === 'updateStatus') {
      return handleUpdateStatus(data, ss);
    }

    if (action === 'nuevaSolicitud') {
      return handleNuevaSolicitud(data, ss);
    }

    if (action === 'marcarSolicitudCotizando') {
      return handleMarcarSolicitudCotizando(data, ss);
    }

    if (action === 'cotizarSolicitud' || action === 'cotizacion') {
      return handleCotizarSolicitud(data, ss);
    }

    if (action === 'programarServicio') {
      return handleProgramarServicio(data, ss);
    }

    if (action === 'updateServicioEstado') {
      return handleUpdateServicioEstado(data, ss);
    }

    if (action === 'eliminarCotizacion') {
      return handleEliminarCotizacion(data, ss);
    }

    if (action === 'crearCotizacionManual') {
      return handleCrearCotizacionManual(data, ss);
    }

    if (action === 'archiveSolicitud') {
      return handleArchiveSolicitud(data, ss);
    }

    if (action === 'archiveCotizacion') {
      return handleArchiveCotizacion(data, ss);
    }

    if (action === 'nuevaCotizacion') {
      return handleNewCotizacion(data, ss);
    }

    // Compatibilidad con clientes legacy que no envian action.
    if (!action && (data.servicio || data.nombreCliente)) {
      return handleNewCotizacion(data, ss);
    }

    throw new Error('Accion no soportada: ' + action);
  } catch (error) {
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function generateSolicitudId(now) {
  const ts = now || new Date();
  const year = String(ts.getFullYear()).slice(-2);
  const month = String(ts.getMonth() + 1).padStart(2, '0');
  const day = String(ts.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return 'SOL-' + year + month + day + '-' + random;
}

function handleNuevaSolicitud(data, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  if (!sheet) {
    throw new Error('No existe la hoja de solicitudes');
  }

  const cliente = String(data.cliente || data.nombreCliente || '').trim();
  const telefono = String(data.telefono || '').trim();
  const servicio = String(data.servicio || '').trim();
  const direccion = String(data.direccion || '').trim();

  if (!cliente || !telefono || !servicio) {
    throw new Error('Cliente, telefono y servicio son obligatorios');
  }

  const idSolicitud = String(data.idSolicitud || '').trim() || generateSolicitudId(new Date());
  const estado = String(data.estado || 'Nueva').trim();
  const notas = String(data.notas || data.comentarios || '').trim();

  sheet.appendRow([
    idSolicitud,
    new Date(),
    cliente,
    telefono,
    servicio,
    direccion,
    estado,
    notas
  ]);

  logEvent(ss, 'SOLICITUD', idSolicitud, 'Solicitud creada por ' + cliente);

  return createCorsResponse({
    success: true,
    idSolicitud: idSolicitud,
    message: 'Solicitud guardada'
  });
}

function handleMarcarSolicitudCotizando(data, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  if (!sheet) {
    throw new Error('No existe la hoja de solicitudes');
  }

  const idSolicitud = String(data.idSolicitud || '').trim();
  if (!idSolicitud) {
    throw new Error('idSolicitud es obligatorio');
  }

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0] || '').trim();
    if (rowId === idSolicitud) {
      sheet.getRange(i + 1, 7).setValue('Cotizando');
      logEvent(ss, 'SOLICITUD', idSolicitud, 'Solicitud marcada como Cotizando');
      return createCorsResponse({ success: true, message: 'Solicitud actualizada' });
    }
  }

  throw new Error('Solicitud no encontrada');
}

function findSolicitudById(sheet, idSolicitud) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0] || '').trim();
    if (rowId === idSolicitud) {
      return { rowIndex: i + 1, row: values[i] };
    }
  }
  return null;
}

function generateCotizacionId(now) {
  const ts = now || new Date();
  const year = String(ts.getFullYear()).slice(-2);
  const month = String(ts.getMonth() + 1).padStart(2, '0');
  const day = String(ts.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return 'COT-' + year + month + day + '-' + random;
}

function generateServicioId(now) {
  const ts = now || new Date();
  const year = String(ts.getFullYear()).slice(-2);
  const month = String(ts.getMonth() + 1).padStart(2, '0');
  const day = String(ts.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return 'SER-' + year + month + day + '-' + random;
}

function handleCotizarSolicitud(data, ss) {
  const solicitudSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);

  if (!solicitudSheet || !cotSheet) {
    throw new Error('No existen las hojas necesarias para cotizar');
  }

  const idSolicitud = String(data.idSolicitud || '').trim();
  if (!idSolicitud) {
    throw new Error('idSolicitud es obligatorio');
  }

  const found = findSolicitudById(solicitudSheet, idSolicitud);
  if (!found) {
    throw new Error('Solicitud no encontrada');
  }

  const solicitud = found.row;
  const cliente = String(solicitud[2] || '').trim();
  const telefono = String(solicitud[3] || '').trim();
  const servicio = String(solicitud[4] || '').trim();
  const direccion = String(solicitud[5] || '').trim();
  const conceptos = Array.isArray(data.conceptos) ? data.conceptos : [];
  const total = Number(data.total || 0);
  const diagnostico = String(data.diagnostico || solicitud[7] || '').trim();
  const idCotizacion = generateCotizacionId(new Date());

  const payload = {
    idSolicitud: idSolicitud,
    conceptos: conceptos,
    total: total,
    diagnostico: diagnostico
  };

  cotSheet.appendRow([
    idCotizacion,
    new Date(),
    servicio,
    cliente,
    telefono,
    direccion,
    telefono,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    JSON.stringify(payload),
    idCotizacion,
    'PENDIENTE',
    'TOTAL:' + total
  ]);

  solicitudSheet.getRange(found.rowIndex, 7).setValue('Cotizada');
  logEvent(ss, 'COTIZACION', idCotizacion, 'Cotizacion creada desde solicitud ' + idSolicitud);

  return createCorsResponse({
    success: true,
    idCotizacion: idCotizacion,
    idSolicitud: idSolicitud,
    total: total,
    message: 'Cotizacion creada'
  });
}

function handleProgramarServicio(data, ss) {
  const serviciosSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SERVICIOS);
  const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  const solicitudSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);

  if (!serviciosSheet || !cotSheet) {
    throw new Error('No existen las hojas necesarias para programar');
  }

  const idCotizacion = String(data.idCotizacion || '').trim();
  const idSolicitud = String(data.idSolicitud || '').trim();
  const fecha = String(data.fecha || '').trim();
  const hora = String(data.hora || '').trim();
  const tecnico = String(data.tecnico || '').trim();
  const estado = String(data.estado || 'Programado').trim();
  const total = Number(data.total || 0);

  if (!idCotizacion || !fecha || !tecnico) {
    throw new Error('idCotizacion, fecha y tecnico son obligatorios');
  }

  let cliente = '';
  let telefono = '';
  let servicio = '';
  const cotValues = cotSheet.getDataRange().getValues();
  for (let i = 1; i < cotValues.length; i++) {
    if (String(cotValues[i][0] || '').trim() === idCotizacion) {
      cliente = String(cotValues[i][3] || '');
      telefono = String(cotValues[i][4] || '');
      servicio = String(cotValues[i][2] || '');
      cotSheet.getRange(i + 1, 18).setValue('PROGRAMADA');
      break;
    }
  }

  const idServicio = generateServicioId(new Date());
  serviciosSheet.appendRow([
    idServicio,
    new Date(),
    idCotizacion,
    idSolicitud,
    cliente,
    telefono,
    servicio,
    fecha,
    hora,
    tecnico,
    estado,
    total
  ]);

  if (idSolicitud && solicitudSheet) {
    const found = findSolicitudById(solicitudSheet, idSolicitud);
    if (found) {
      solicitudSheet.getRange(found.rowIndex, 7).setValue('Programada');
    }
  }

  logEvent(ss, 'SERVICIO', idServicio, 'Servicio programado para ' + cliente);
  return createCorsResponse({
    success: true,
    idServicio: idServicio,
    message: 'Servicio programado'
  });
}

function parseScheduledDateTime(fecha, hora) {
  const dateStr = String(fecha || '').trim();
  const timeStr = String(hora || '').trim() || '00:00';
  if (!dateStr) return null;

  const dt = new Date(dateStr + 'T' + timeStr + ':00');
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function canCloseService(fecha, hora, now) {
  const scheduled = parseScheduledDateTime(fecha, hora);
  if (!scheduled) return false;
  const twoHoursLater = new Date(scheduled.getTime() + (2 * 60 * 60 * 1000));
  return (now || new Date()).getTime() >= twoHoursLater.getTime();
}

function handleUpdateServicioEstado(data, ss) {
  const serviciosSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SERVICIOS);
  const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!serviciosSheet) {
    throw new Error('No existe la hoja de servicios');
  }

  const idServicio = String(data.idServicio || '').trim();
  const nuevoEstado = String(data.estado || '').trim().toUpperCase();
  const notas = String(data.notas || '').trim();
  const nuevaFecha = String(data.nuevaFecha || '').trim();
  const nuevaHora = String(data.nuevaHora || '').trim();

  if (!idServicio || !nuevoEstado) {
    throw new Error('idServicio y estado son obligatorios');
  }

  const allowed = ['REALIZADO', 'CANCELADO', 'POSPUESTO'];
  if (allowed.indexOf(nuevoEstado) === -1) {
    throw new Error('Estado no permitido');
  }

  const values = serviciosSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0] || '').trim();
    if (rowId !== idServicio) continue;

    const estadoActual = String(values[i][10] || '').trim().toUpperCase();
    if (estadoActual === 'REALIZADO' || estadoActual === 'CANCELADO') {
      throw new Error('Este servicio ya fue cerrado');
    }

    const fechaActual = values[i][7];
    const horaActual = values[i][8];
    if (!canCloseService(fechaActual, horaActual, new Date())) {
      throw new Error('Solo puedes cerrar/posponer después de 2 horas de la fecha y hora programada');
    }

    if (nuevoEstado === 'POSPUESTO') {
      if (!nuevaFecha) {
        throw new Error('Para posponer necesitas nuevaFecha');
      }
      serviciosSheet.getRange(i + 1, 8).setValue(nuevaFecha);
      if (nuevaHora) {
        serviciosSheet.getRange(i + 1, 9).setValue(nuevaHora);
      }
    }

    serviciosSheet.getRange(i + 1, 11).setValue(nuevoEstado);

    const totalServicio = Number(values[i][11] || 0);
    const idCotizacion = String(values[i][2] || '').trim();
    if (cotSheet && idCotizacion) {
      const cotValues = cotSheet.getDataRange().getValues();
      for (let c = 1; c < cotValues.length; c++) {
        if (String(cotValues[c][0] || '').trim() === idCotizacion) {
          const cotEstado = (nuevoEstado === 'REALIZADO') ? 'REALIZADA' : nuevoEstado;
          const cotNotas = (notas ? notas + ' | ' : '') + 'SERVICIO:' + nuevoEstado + ' TOTAL:' + totalServicio;
          cotSheet.getRange(c + 1, 18).setValue(cotEstado);
          cotSheet.getRange(c + 1, 19).setValue(cotNotas);
          break;
        }
      }
    }

    logEvent(ss, 'SERVICIO', idServicio, 'Servicio actualizado a ' + nuevoEstado);
    return createCorsResponse({
      success: true,
      idServicio: idServicio,
      estado: nuevoEstado,
      message: 'Servicio actualizado'
    });
  }

  throw new Error('Servicio no encontrado');
}

function handleEliminarCotizacion(data, ss) {
  const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  const serviciosSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SERVICIOS);
  if (!cotSheet) {
    throw new Error('No existe la hoja de cotizaciones');
  }

  const idCotizacion = String(data.idCotizacion || '').trim();
  if (!idCotizacion) {
    throw new Error('idCotizacion es obligatorio');
  }

  if (serviciosSheet) {
    const srvValues = serviciosSheet.getDataRange().getValues();
    for (let i = 1; i < srvValues.length; i++) {
      if (String(srvValues[i][2] || '').trim() === idCotizacion) {
        throw new Error('No se puede eliminar: la cotización tiene servicios asociados');
      }
    }
  }

  const cotValues = cotSheet.getDataRange().getValues();
  for (let i = 1; i < cotValues.length; i++) {
    if (String(cotValues[i][0] || '').trim() === idCotizacion) {
      cotSheet.deleteRow(i + 1);
      logEvent(ss, 'COTIZACION', idCotizacion, 'Cotizacion eliminada');
      return createCorsResponse({ success: true, message: 'Cotizacion eliminada' });
    }
  }

  throw new Error('Cotizacion no encontrada');
}

function handleArchiveSolicitud(data, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  if (!sheet) throw new Error('No existe la hoja de solicitudes');

  const idSolicitud = String(data.idSolicitud || '').trim();
  if (!idSolicitud) throw new Error('idSolicitud es obligatorio');

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === idSolicitud) {
      sheet.getRange(i + 1, 7).setValue('ARCHIVADA');
      logEvent(ss, 'SOLICITUD', idSolicitud, 'Solicitud archivada');
      return createCorsResponse({ success: true, message: 'Solicitud archivada' });
    }
  }
  throw new Error('Solicitud no encontrada');
}

function handleArchiveCotizacion(data, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!sheet) throw new Error('No existe la hoja de cotizaciones');

  const idCotizacion = String(data.idCotizacion || '').trim();
  if (!idCotizacion) throw new Error('idCotizacion es obligatorio');

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === idCotizacion) {
      sheet.getRange(i + 1, 18).setValue('ARCHIVADA');
      logEvent(ss, 'COTIZACION', idCotizacion, 'Cotizacion archivada');
      return createCorsResponse({ success: true, message: 'Cotizacion archivada' });
    }
  }
  throw new Error('Cotizacion no encontrada');
}

function handleCrearCotizacionManual(data, ss) {
  const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!cotSheet) {
    throw new Error('No existe la hoja de cotizaciones');
  }

  const cliente = String(data.cliente || data.nombreCliente || '').trim();
  const telefono = String(data.telefono || '').trim();
  const servicio = String(data.servicio || '').trim();
  const direccion = String(data.direccion || '').trim();
  const diagnostico = String(data.diagnostico || '').trim();
  const conceptos = Array.isArray(data.conceptos) ? data.conceptos : [];
  const total = Number(data.total || 0);

  if (!cliente || !servicio) {
    throw new Error('cliente y servicio son obligatorios');
  }

  const idCotizacion = generateCotizacionId(new Date());
  const payload = {
    manual: true,
    idSolicitud: '',
    conceptos: conceptos,
    diagnostico: diagnostico,
    total: total
  };

  cotSheet.appendRow([
    idCotizacion,
    new Date(),
    servicio,
    cliente,
    telefono,
    direccion,
    telefono,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    JSON.stringify(payload),
    idCotizacion,
    'PENDIENTE',
    'TOTAL:' + total
  ]);

  logEvent(ss, 'COTIZACION', idCotizacion, 'Cotizacion manual creada');
  return createCorsResponse({
    success: true,
    idCotizacion: idCotizacion,
    message: 'Cotizacion manual creada'
  });
}

function handleNewCotizacion(data, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);

  if (!sheet) {
    throw new Error('No existe la hoja de cotizaciones');
  }

  if (!data.servicio || !data.nombreCliente) {
    throw new Error('Faltan campos obligatorios');
  }

  const timestamp = new Date();
  const year = String(timestamp.getFullYear()).slice(-2);
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  const idCotizacion = 'COT-' + year + month + day + '-' + random;

  const row = [
    idCotizacion,
    timestamp,
    data.servicio,
    data.nombreCliente || '',
    data.telefono || '',
    data.direccion || '',
    data.whatsappCliente || '',
    data.pregunta1 || '',
    data.respuesta1 || '',
    data.pregunta2 || '',
    data.respuesta2 || '',
    data.pregunta3 || '',
    data.respuesta3 || '',
    data.pregunta4 || '',
    data.respuesta4 || '',
    JSON.stringify(data.respuestas || {}),
    data.folio || idCotizacion,
    'NUEVA',
    ''
  ];

  sheet.appendRow(row);
  logEvent(ss, 'POST', idCotizacion, 'Cotizacion de ' + data.nombreCliente);

  return createCorsResponse({
    success: true,
    message: 'Cotizacion guardada',
    idCotizacion: idCotizacion
  });
}

function handleUpdateStatus(data, ss) {
  const cfg = getConfig();

  if (data.token !== cfg.apiToken) {
    throw new Error('Token de seguridad invalido');
  }

  const folio = String(data.folio || '').trim();
  const nuevoEstado = String(data.estado || '').trim();
  const notas = String(data.notas || '').trim();

  if (!folio || !nuevoEstado) {
    throw new Error('Folio y estado son obligatorios');
  }

  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!sheet) {
    throw new Error('No existe la hoja de cotizaciones');
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const idCot = String(values[i][0] || '').trim();
    const folioGenerado = String(values[i][16] || '').trim();

    if (idCot === folio || folioGenerado === folio) {
      sheet.getRange(i + 1, 18).setValue(nuevoEstado);
      if (notas) {
        sheet.getRange(i + 1, 19).setValue(notas);
      }

      logEvent(ss, 'STATUS', folio, 'Estado actualizado a: ' + nuevoEstado);
      return createCorsResponse({ success: true, message: 'Estado actualizado correctamente' });
    }
  }

  throw new Error('Folio no encontrado');
}

function handleGetCotizaciones(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!sheet) {
    return createCorsResponse({ success: true, cotizaciones: [] });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return createCorsResponse({ success: true, cotizaciones: [] });
  }

  const cotizaciones = [];
  for (let i = 1; i < values.length; i++) {
    const rawPayload = String(values[i][15] || '').trim();
    let payload = {};

    if (rawPayload) {
      try {
        payload = JSON.parse(rawPayload);
      } catch (_) {}
    }

    const totalFromPayload = Number(payload.total || 0);
    const totalFromNotas = Number(String(values[i][18] || '').replace('TOTAL:', '')) || 0;
    const estado = String(values[i][17] || 'NUEVA');
    if (estado.toUpperCase() === 'ARCHIVADA') continue;

    cotizaciones.push({
      idCotizacion: values[i][0] || '',
      timestamp: values[i][1] || '',
      servicio: values[i][2] || '',
      cliente: values[i][3] || '',
      telefono: values[i][4] || '',
      direccion: values[i][5] || '',
      idSolicitud: payload.idSolicitud || '',
      estado: estado,
      total: totalFromPayload || totalFromNotas,
      folio: values[i][16] || ''
    });
  }

  cotizaciones.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return createCorsResponse({
    success: true,
    cotizaciones: cotizaciones
  });
}

function handleGetCotizacionesArchivadas(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!sheet) {
    return createCorsResponse({ success: true, cotizaciones: [] });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return createCorsResponse({ success: true, cotizaciones: [] });
  }

  const cotizaciones = [];
  for (let i = 1; i < values.length; i++) {
    const estado = String(values[i][17] || '').toUpperCase().trim();
    if (estado !== 'ARCHIVADA') continue;

    const rawPayload = String(values[i][15] || '').trim();
    let payload = {};
    if (rawPayload) {
      try {
        payload = JSON.parse(rawPayload);
      } catch (_) {}
    }

    const totalFromPayload = Number(payload.total || 0);
    const totalFromNotas = Number(String(values[i][18] || '').replace('TOTAL:', '')) || 0;
    cotizaciones.push({
      idCotizacion: values[i][0] || '',
      timestamp: values[i][1] || '',
      servicio: values[i][2] || '',
      cliente: values[i][3] || '',
      telefono: values[i][4] || '',
      direccion: values[i][5] || '',
      idSolicitud: payload.idSolicitud || '',
      estado: values[i][17] || 'ARCHIVADA',
      total: totalFromPayload || totalFromNotas,
      folio: values[i][16] || ''
    });
  }

  cotizaciones.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return createCorsResponse({ success: true, cotizaciones: cotizaciones });
}

function doGet(e) {
  try {
    const ss = getSpreadsheet();
    const p = (e && e.parameter) ? e.parameter : {};

    if (p.action === 'solicitudes') {
      return handleGetSolicitudes(ss);
    }

    if (p.action === 'dashboard') {
      return handleGetDashboard(ss);
    }

    if (p.action === 'servicios') {
      return handleGetServicios(ss);
    }

    if (p.action === 'agenda') {
      return handleGetAgenda(ss);
    }

    if (p.action === 'cotizaciones') {
      return handleGetCotizaciones(ss);
    }

    if (p.action === 'solicitudesArchivadas') {
      return handleGetSolicitudesArchivadas(ss);
    }

    if (p.action === 'cotizacionesArchivadas') {
      return handleGetCotizacionesArchivadas(ss);
    }

    if (typeof p.materiales !== 'undefined') {
      return handleGetMateriales(p.materiales, ss);
    }

    if (typeof p.test !== 'undefined') {
      return handleTestConnection(ss);
    }

    if (p.folio) {
      return handleGetCotizacion(p.folio, ss);
    }

    return handleGetServicesList();
  } catch (error) {
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

function handleGetSolicitudes(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  if (!sheet) {
    return createCorsResponse({ success: true, solicitudes: [] });
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createCorsResponse({ success: true, solicitudes: [] });
  }

  const solicitudes = [];
  for (let i = 1; i < data.length; i++) {
    const estado = String(data[i][6] || '').trim().toUpperCase();
    if (estado === 'ARCHIVADA') continue;

    solicitudes.push({
      id: data[i][0] || '',
      timestamp: data[i][1] || '',
      cliente: data[i][2] || '',
      telefono: data[i][3] || '',
      servicio: data[i][4] || '',
      direccion: data[i][5] || '',
      estado: data[i][6] || '',
      notas: data[i][7] || ''
    });
  }

  solicitudes.sort(function (a, b) {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return createCorsResponse({
    success: true,
    solicitudes: solicitudes
  });
}

function handleGetSolicitudesArchivadas(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  if (!sheet) {
    return createCorsResponse({ success: true, solicitudes: [] });
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createCorsResponse({ success: true, solicitudes: [] });
  }

  const solicitudes = [];
  for (let i = 1; i < data.length; i++) {
    const estado = String(data[i][6] || '').trim().toUpperCase();
    if (estado !== 'ARCHIVADA') continue;
    solicitudes.push({
      id: data[i][0] || '',
      timestamp: data[i][1] || '',
      cliente: data[i][2] || '',
      telefono: data[i][3] || '',
      servicio: data[i][4] || '',
      direccion: data[i][5] || '',
      estado: data[i][6] || '',
      notas: data[i][7] || ''
    });
  }

  solicitudes.sort(function (a, b) {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  return createCorsResponse({ success: true, solicitudes: solicitudes });
}

function handleGetDashboard(ss) {
  const solicitudesSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOLICITUDES);
  const cotizacionesSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  const serviciosSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SERVICIOS);

  const today = new Date();
  const todayKey = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const currentMonth = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM');

  let solicitudes = 0;
  let cotizaciones = 0;
  let servicios = 0;
  let ingresos = 0;

  if (solicitudesSheet) {
    const solicitudesValues = solicitudesSheet.getDataRange().getValues();
    for (let i = 1; i < solicitudesValues.length; i++) {
      const estadoSolicitud = String(solicitudesValues[i][6] || '').toUpperCase().trim();
      if (!estadoSolicitud || estadoSolicitud === 'NUEVA' || estadoSolicitud === 'COTIZANDO') {
        solicitudes += 1;
      }
    }
  }

  if (cotizacionesSheet) {
    const cotValues = cotizacionesSheet.getDataRange().getValues();
    for (let i = 1; i < cotValues.length; i++) {
      const row = cotValues[i];
      const timestamp = row[1];
      const estado = String(row[17] || '').toUpperCase().trim();

      if (estado === 'PENDIENTE' || estado === 'COTIZANDO' || estado === 'NUEVA') {
        cotizaciones += 1;
      }
    }
  }

  if (serviciosSheet) {
    const serviceValues = serviciosSheet.getDataRange().getValues();
    for (let i = 1; i < serviceValues.length; i++) {
      const fechaValue = serviceValues[i][7];
      const estadoServicio = String(serviceValues[i][10] || '').toUpperCase().trim();
      const totalServicio = Number(serviceValues[i][11] || 0);
      const fechaNormalizada = normalizeDateValue(fechaValue, Session.getScriptTimeZone());

      if (fechaNormalizada === todayKey && estadoServicio !== 'CANCELADO' && estadoServicio !== 'REALIZADO') {
        servicios += 1;
      }

      if (estadoServicio === 'REALIZADO' && fechaNormalizada.indexOf(currentMonth) === 0 && totalServicio > 0) {
        ingresos += totalServicio;
      }
    }
  }

  return createCorsResponse({
    success: true,
    solicitudes: solicitudes,
    cotizaciones: cotizaciones,
    servicios: servicios,
    ingresos: ingresos
  });
}

function parseIngresoFromNotas(notas) {
  if (!notas) return 0;

  const normalized = String(notas).replace(/[,$]/g, '');
  const match = normalized.match(/\d+(\.\d+)?/);
  if (!match) return 0;

  const value = Number(match[0]);
  return isNaN(value) ? 0 : value;
}

function normalizeDateValue(value, timeZone) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, timeZone, 'yyyy-MM-dd');
  }

  const str = String(value || '').trim();
  if (!str) return '';

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(parsed, timeZone, 'yyyy-MM-dd');
  }

  return str;
}

function handleGetServicios(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SERVICIOS);
  if (!sheet) {
    return createCorsResponse({ success: true, servicios: [] });
  }

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return createCorsResponse({ success: true, servicios: [] });
  }

  const servicios = [];
  const now = new Date();
  for (let i = 1; i < values.length; i++) {
    const fecha = values[i][7] || '';
    const hora = values[i][8] || '';
    const estado = values[i][10] || '';
    servicios.push({
      id: values[i][0] || '',
      timestamp: values[i][1] || '',
      idCotizacion: values[i][2] || '',
      idSolicitud: values[i][3] || '',
      cliente: values[i][4] || '',
      telefono: values[i][5] || '',
      servicio: values[i][6] || '',
      fecha: fecha,
      hora: hora,
      tecnico: values[i][9] || '',
      estado: estado,
      total: values[i][11] || 0,
      puedeCerrar: canCloseService(fecha, hora, now)
    });
  }

  servicios.sort(function (a, b) {
    return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
  });

  return createCorsResponse({ success: true, servicios: servicios });
}

function handleGetAgenda(ss) {
  return handleGetServicios(ss);
}

function handleGetMateriales(familia, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.MATERIALES);
  if (!sheet) {
    throw new Error('No existe la hoja de materiales');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createCorsResponse({ success: true, familia: familia || '', materiales: [] });
  }

  const headers = data[0];
  const materiales = [];
  const filtro = String(familia || '').toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const familiaCell = String(data[i][1] || '').toLowerCase();
    const includeRow = !filtro || familiaCell.indexOf(filtro) !== -1;

    if (includeRow) {
      const item = {};
      headers.forEach(function (h, idx) {
        item[h] = data[i][idx];
      });
      materiales.push(item);
    }
  }

  return createCorsResponse({
    success: true,
    familia: familia || '',
    materiales: materiales
  });
}

function handleGetCotizacion(folio, ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
  if (!sheet) {
    throw new Error('No existe la hoja de cotizaciones');
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createCorsResponse({ success: false, error: 'Folio no encontrado' });
  }

  const headers = data[0];
  const folioStr = String(folio || '').trim();

  for (let i = 1; i < data.length; i++) {
    const idCot = String(data[i][0] || '').trim();
    const folioGen = String(data[i][16] || '').trim();

    if (idCot === folioStr || folioGen === folioStr) {
      const cotizacion = {};
      headers.forEach(function (h, idx) {
        cotizacion[h] = data[i][idx];
      });

      if (cotizacion.Diagnostico_Completo_JSON) {
        try {
          cotizacion.diagnostico = JSON.parse(cotizacion.Diagnostico_Completo_JSON);
        } catch (_) {}
      }

      logEvent(ss, 'GET', folioStr, 'Consulta de cotizacion');
      return createCorsResponse({ success: true, cotizacion: cotizacion });
    }
  }

  return createCorsResponse({ success: false, error: 'Folio no encontrado' });
}

function handleGetServicesList() {
  const servicios = [
    { id: 'minisplit', nombre: 'Climatización / Minisplit' },
    { id: 'plomeria', nombre: 'Plomería' },
    { id: 'electricidad', nombre: 'Electricidad' },
    { id: 'soldadura', nombre: 'Soldadura / Herrería' },
    { id: 'camaras', nombre: 'CCTV' },
    { id: 'general', nombre: 'Mantenimiento General' }
  ];

  return createCorsResponse({ success: true, servicios: servicios });
}

function handleTestConnection(ss) {
  return createCorsResponse({
    success: true,
    message: 'API Multiservicios SP activa',
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: ss.getSheets().map(function (s) { return s.getName(); }),
    timestamp: new Date().toISOString(),
    version: '4.1 - Robusto con ScriptProperties'
  });
}

function logEvent(ss, tipo, idReferencia, mensaje) {
  try {
    const logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);
    if (!logSheet) return;

    logSheet.appendRow([
      new Date(),
      tipo,
      idReferencia,
      mensaje,
      'API',
      'AppsScript'
    ]);
  } catch (e) {
    console.error('Error al escribir log: ' + e);
  }
}

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Multiservicios SP')
      .addItem('Verificar Hojas', 'manualVerifySheets')
      .addItem('Dashboard', 'showDashboard')
      .addSeparator()
      .addItem('Recargar Materiales', 'forceReloadMaterials')
      .addItem('Ver Token', 'showToken')
      .addToUi();

    console.log('Menu creado');
  } catch (error) {
    console.error('Error en onOpen: ' + error);
  }
}

function manualVerifySheets() {
  try {
    _initialized = false;
    getSpreadsheet();
    SpreadsheetApp.getUi().alert('Hojas verificadas correctamente');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function forceReloadMaterials() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.MATERIALES);

    if (!sheet) {
      throw new Error('No existe la hoja de materiales');
    }

    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    loadDefaultMaterials(sheet);
    SpreadsheetApp.getUi().alert('Materiales recargados correctamente');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function showDashboard() {
  try {
    const ss = getSpreadsheet();
    const cotSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.COTIZACIONES);
    const total = cotSheet ? Math.max(cotSheet.getLastRow() - 1, 0) : 0;

    SpreadsheetApp.getUi().alert(
      'DASHBOARD\n\n' +
      'Total cotizaciones: ' + total + '\n' +
      'Hojas: ' + ss.getSheets().length + '\n' +
      'Spreadsheet ID: ' + ss.getId() + '\n\n' +
      'Sistema funcionando correctamente'
    );
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

function showToken() {
  const cfg = getConfig();
  SpreadsheetApp.getUi().alert(
    'TOKEN DE SEGURIDAD\n\n' +
    'Token actual: ' + cfg.apiToken + '\n\n' +
    'Guardalo en un lugar seguro.\n' +
    'Se usa para actualizaciones de estado.'
  );
}
