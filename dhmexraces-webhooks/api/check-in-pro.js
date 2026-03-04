/**
 * DHMEXRACES - Check-in Pro API
 *
 * Actions:
 *   search      - Find riders by QR code or name/email/phone
 *   confirm     - Mark a rider as checked in
 *   stats       - Get check-in statistics for a sede
 *   runners     - Get full runner list for management
 *   kit-confirm - Mark a rider's kit as ready
 *   kit-undo    - Unmark a rider's kit
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

const SEDES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

const SEDE_FROM_CODE = {
  GTO: 'GUANAJUATO',
  PUE: 'PUEBLA',
  GDL: 'GUADALAJARA',
  IXT: 'IXTAPAN',
  TAX: 'TAXCO'
};

const RUNNER_SHEETS = {
  GUANAJUATO: 'GUANAJUATO NUMEROS',
  PUEBLA: 'PUEBLA NUMEROS',
  GUADALAJARA: 'GUADALAJARA NUMEROS',
  IXTAPAN: 'IXTAPAN NUMEROS',
  TAXCO: 'TAXCO NUMEROS'
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function getDoc() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  });
  await doc.loadInfo();
  return doc;
}

function norm(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function sedeFromQR(code) {
  const m = (code || '').match(/^DHMEX-([A-Z]{3})-/i);
  return m ? (SEDE_FROM_CODE[m[1].toUpperCase()] || null) : null;
}

function isChecked(row) {
  const v = (row.CHECK_IN || '').toUpperCase().trim();
  return v === 'SI' || v === 'SÍ' || v === 'YES';
}

function isKitReady(row) {
  const v = (row.KIT || '').toUpperCase().trim();
  return v === 'SI' || v === 'SÍ' || v === 'YES';
}

function timestamp() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
}

function rowToRider(row, sede) {
  return {
    nombre: row.NOMBRE || '',
    email: row.EMAIL || '',
    telefono: row.TELEFONO || '',
    fechaNacimiento: row['FECHA DE NACIMIENTO'] || '',
    equipo: row.EQUIPO || '',
    categoria: row.CATEGORIA || '',
    sede: sede,
    orden: row.ORDEN || '',
    qrCode: row.QR_CODE || '',
    checkedIn: isChecked(row),
    checkInTime: row.CHECK_IN_TIME || '',
    jersey: row.JERSEY || '',
    pago: row.PAGO || '',
    kitReady: isKitReady(row),
    emergenciaNombre: row['EMERGENCIA NOMBRE'] || '',
    emergenciaTel: row['EMERGENCIA TEL'] || '',
    tipoSangre: row['TIPO DE SANGRE'] || '',
    runnerNumber: null,
    raffleNumber: null
  };
}

function buildNumeroLookup(rows) {
  const map = {};
  for (const r of rows) {
    if (String(r.Ocupado) === '1' && r.OrderID) {
      const key = `${r.OrderID}__${(r.Nombre || '').toLowerCase().trim()}__${(r.Categoria || '').toLowerCase().trim()}`;
      map[key] = String(r.Numero);
    }
  }
  return map;
}

function buildRifaLookup(rows) {
  const map = {};
  for (const r of rows) {
    if (String(r.Ocupado) === '1' && r.OrderID) {
      const key = `${r.OrderID}__${(r.Nombre || '').toLowerCase().trim()}`;
      map[key] = String(r.Numero);
    }
  }
  return map;
}

function lookupNumero(map, orden, nombre, categoria) {
  const key = `${orden}__${(nombre || '').toLowerCase().trim()}__${(categoria || '').toLowerCase().trim()}`;
  return map[key] || null;
}

function lookupRifa(map, orden, nombre) {
  const key = `${orden}__${(nombre || '').toLowerCase().trim()}`;
  return map[key] || null;
}

// ═══════════════════════════════════════════════════════════════
// ACTION: SEARCH
// ═══════════════════════════════════════════════════════════════

async function handleSearch(q, sede, doc) {
  const isQR = /^DHMEX-/i.test(q);
  let targetSede = isQR ? (sedeFromQR(q) || sede) : sede;

  if (!targetSede || !SEDES.includes(targetSede)) {
    return { success: false, error: 'Sede no válida' };
  }

  const sedeSheet = doc.sheetsByTitle[targetSede];
  if (!sedeSheet) return { success: false, error: `Hoja "${targetSede}" no encontrada` };

  const numSheet = doc.sheetsByTitle[RUNNER_SHEETS[targetSede]];
  const rifaSheet = doc.sheetsByTitle['RIFA'];

  const [sedeRows, numRows, rifaRows] = await Promise.all([
    sedeSheet.getRows(),
    numSheet ? numSheet.getRows() : Promise.resolve([]),
    rifaSheet ? rifaSheet.getRows() : Promise.resolve([])
  ]);

  const numMap = buildNumeroLookup(numRows);
  const rifaMap = buildRifaLookup(rifaRows);

  let results = [];

  if (isQR) {
    const qr = q.toUpperCase().trim();
    for (const row of sedeRows) {
      if ((row.QR_CODE || '').toUpperCase().trim() === qr) {
        results.push(rowToRider(row, targetSede));
        break;
      }
    }
  } else {
    if (q.length < 2) return { success: true, results: [], count: 0 };
    const ql = norm(q);
    for (const row of sedeRows) {
      if (!row.NOMBRE) continue;
      if (
        norm(row.NOMBRE).includes(ql) ||
        norm(row.EMAIL).includes(ql) ||
        (row.TELEFONO || '').includes(ql) ||
        (row.ORDEN || '').includes(ql)
      ) {
        results.push(rowToRider(row, targetSede));
      }
    }
    results.sort((a, b) => {
      const al = norm(a.nombre);
      const bl = norm(b.nombre);
      return (bl.startsWith(ql) ? 1 : 0) - (al.startsWith(ql) ? 1 : 0);
    });
    results = results.slice(0, 15);
  }

  for (const r of results) {
    r.runnerNumber = lookupNumero(numMap, r.orden, r.nombre, r.categoria);
    r.raffleNumber = lookupRifa(rifaMap, r.orden, r.nombre);
  }

  return { success: true, results, count: results.length };
}

// ═══════════════════════════════════════════════════════════════
// ACTION: CONFIRM
// ═══════════════════════════════════════════════════════════════

async function handleConfirm(qrCode, doc) {
  if (!qrCode) return { success: false, error: 'Código QR requerido' };

  const targetSede = sedeFromQR(qrCode);
  if (!targetSede) return { success: false, error: 'Código QR inválido' };

  const sheet = doc.sheetsByTitle[targetSede];
  if (!sheet) return { success: false, error: `Hoja "${targetSede}" no encontrada` };

  const rows = await sheet.getRows();
  const qr = qrCode.toUpperCase().trim();
  const row = rows.find(r => (r.QR_CODE || '').toUpperCase().trim() === qr);

  if (!row) return { success: false, error: 'Corredor no encontrado con ese código' };

  if (isChecked(row)) {
    return {
      success: false,
      alreadyCheckedIn: true,
      error: 'Este corredor ya tiene check-in',
      checkInTime: row.CHECK_IN_TIME || ''
    };
  }

  const ts = timestamp();
  row.CHECK_IN = 'SI';
  row.CHECK_IN_TIME = ts;
  await row.save();

  const numSheet = doc.sheetsByTitle[RUNNER_SHEETS[targetSede]];
  let runnerNumber = null;
  if (numSheet) {
    const numRows = await numSheet.getRows();
    const numMap = buildNumeroLookup(numRows);
    runnerNumber = lookupNumero(numMap, row.ORDEN, row.NOMBRE, row.CATEGORIA);
  }

  return {
    success: true,
    message: 'Check-in confirmado',
    runner: {
      nombre: row.NOMBRE || '',
      categoria: row.CATEGORIA || '',
      qrCode: row.QR_CODE || '',
      runnerNumber
    },
    checkInTime: ts
  };
}

// ═══════════════════════════════════════════════════════════════
// ACTION: STATS
// ═══════════════════════════════════════════════════════════════

async function handleStats(sede, doc) {
  if (!sede || !SEDES.includes(sede)) {
    return { success: false, error: 'Sede no válida' };
  }

  const sheet = doc.sheetsByTitle[sede];
  if (!sheet) return { success: false, error: `Hoja "${sede}" no encontrada` };

  const rows = await sheet.getRows();

  let total = 0;
  let checkedIn = 0;
  const byCategory = {};

  for (const row of rows) {
    if (!row.NOMBRE) continue;
    total++;
    const cat = row.CATEGORIA || 'Sin categoría';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, checkedIn: 0 };
    byCategory[cat].total++;

    if (isChecked(row)) {
      checkedIn++;
      byCategory[cat].checkedIn++;
    }
  }

  return {
    success: true,
    sede,
    summary: {
      total,
      checkedIn,
      pending: total - checkedIn,
      percentage: total > 0 ? Math.round((checkedIn / total) * 100) : 0
    },
    byCategory
  };
}

// ═══════════════════════════════════════════════════════════════
// ACTION: RUNNERS
// ═══════════════════════════════════════════════════════════════

async function handleRunners(sede, status, doc) {
  if (!sede || !SEDES.includes(sede)) {
    return { success: false, error: 'Sede no válida' };
  }

  const sedeSheet = doc.sheetsByTitle[sede];
  if (!sedeSheet) return { success: false, error: `Hoja "${sede}" no encontrada` };

  const numSheet = doc.sheetsByTitle[RUNNER_SHEETS[sede]];
  const rifaSheet = doc.sheetsByTitle['RIFA'];

  const [sedeRows, numRows, rifaRows] = await Promise.all([
    sedeSheet.getRows(),
    numSheet ? numSheet.getRows() : Promise.resolve([]),
    rifaSheet ? rifaSheet.getRows() : Promise.resolve([])
  ]);

  const numMap = buildNumeroLookup(numRows);
  const rifaMap = buildRifaLookup(rifaRows);

  let runners = [];
  for (const row of sedeRows) {
    if (!row.NOMBRE) continue;

    const checked = isChecked(row);
    if (status === 'checked' && !checked) continue;
    if (status === 'pending' && checked) continue;

    runners.push({
      nombre: row.NOMBRE || '',
      email: row.EMAIL || '',
      telefono: row.TELEFONO || '',
      fechaNacimiento: row['FECHA DE NACIMIENTO'] || '',
      equipo: row.EQUIPO || '',
      categoria: row.CATEGORIA || '',
      orden: row.ORDEN || '',
      qrCode: row.QR_CODE || '',
      checkedIn: checked,
      checkInTime: row.CHECK_IN_TIME || '',
      jersey: row.JERSEY || '',
      pago: row.PAGO || '',
      kitReady: isKitReady(row),
      emergenciaNombre: row['EMERGENCIA NOMBRE'] || '',
      emergenciaTel: row['EMERGENCIA TEL'] || '',
      tipoSangre: row['TIPO DE SANGRE'] || '',
      runnerNumber: lookupNumero(numMap, row.ORDEN || '', row.NOMBRE || '', row.CATEGORIA || ''),
      raffleNumber: lookupRifa(rifaMap, row.ORDEN || '', row.NOMBRE || '')
    });
  }

  runners.sort((a, b) => {
    const na = parseInt(a.runnerNumber) || 9999;
    const nb = parseInt(b.runnerNumber) || 9999;
    return na - nb;
  });

  return { success: true, sede, runners, count: runners.length };
}

// ═══════════════════════════════════════════════════════════════
// ACTION: KIT-CONFIRM / KIT-UNDO
// ═══════════════════════════════════════════════════════════════

async function handleKit(qrCode, sede, markReady, doc, nombre, orden) {
  if (!qrCode && !orden && !nombre) {
    return { success: false, error: 'Se requiere código QR o datos del corredor (orden + nombre)' };
  }

  const targetSede = (qrCode ? sedeFromQR(qrCode) : null) || sede;
  if (!targetSede || !SEDES.includes(targetSede)) {
    return { success: false, error: 'Sede no válida' };
  }

  const sheet = doc.sheetsByTitle[targetSede];
  if (!sheet) return { success: false, error: `Hoja "${targetSede}" no encontrada` };

  const rows = await sheet.getRows();
  let row = null;

  // 1. Buscar por QR_CODE (método principal)
  if (qrCode) {
    const qr = qrCode.toUpperCase().trim();
    row = rows.find(r => (r.QR_CODE || '').toUpperCase().trim() === qr);
  }

  // 2. Fallback: buscar por orden + nombre (para runners sin QR)
  if (!row && orden) {
    const ordenClean = orden.toString().trim().replace('#', '');
    const nombreNorm = norm(nombre || '');
    row = rows.find(r => {
      const rowOrden = (r.ORDEN || '').toString().trim().replace('#', '');
      return rowOrden === ordenClean && norm(r.NOMBRE) === nombreNorm;
    });
  }

  if (!row) return { success: false, error: 'Corredor no encontrado' };

  row.KIT = markReady ? 'SI' : '';
  await row.save();

  return {
    success: true,
    message: markReady ? 'Kit marcado como listo' : 'Kit desmarcado',
    runner: {
      nombre: row.NOMBRE || '',
      categoria: row.CATEGORIA || '',
      qrCode: row.QR_CODE || '',
      kitReady: markReady
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || (req.body && req.body.action);

  if (!action) {
    return res.status(400).json({ success: false, error: 'Parámetro "action" requerido. Acciones: search, confirm, stats, runners' });
  }

  try {
    const doc = await getDoc();

    switch (action) {
      case 'search': {
        const q = (req.query.q || (req.body && req.body.q) || '').trim();
        const sede = (req.query.sede || (req.body && req.body.sede) || '').toUpperCase();
        if (!q) return res.json({ success: true, results: [], count: 0 });
        return res.json(await handleSearch(q, sede, doc));
      }

      case 'confirm': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Usa POST para confirmar check-in' });
        }
        const qrCode = (req.body && req.body.qrCode) || '';
        return res.json(await handleConfirm(qrCode, doc));
      }

      case 'stats': {
        const sede = (req.query.sede || '').toUpperCase();
        return res.json(await handleStats(sede, doc));
      }

      case 'runners': {
        const sede = (req.query.sede || '').toUpperCase();
        const status = req.query.status || 'all';
        return res.json(await handleRunners(sede, status, doc));
      }

      case 'kit-confirm': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Usa POST para marcar kit' });
        }
        const qrCode = (req.body && req.body.qrCode) || '';
        const sede = (req.body && req.body.sede || '').toUpperCase();
        const nombre = (req.body && req.body.nombre) || '';
        const orden = (req.body && req.body.orden) || '';
        return res.json(await handleKit(qrCode, sede, true, doc, nombre, orden));
      }

      case 'kit-undo': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Usa POST para desmarcar kit' });
        }
        const qrCode = (req.body && req.body.qrCode) || '';
        const sede = (req.body && req.body.sede || '').toUpperCase();
        const nombre = (req.body && req.body.nombre) || '';
        const orden = (req.body && req.body.orden) || '';
        return res.json(await handleKit(qrCode, sede, false, doc, nombre, orden));
      }

      default:
        return res.status(400).json({ success: false, error: `Acción "${action}" no válida` });
    }
  } catch (err) {
    console.error('[check-in-pro] Error:', err);
    return res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
