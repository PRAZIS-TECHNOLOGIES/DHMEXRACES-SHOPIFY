/**
 * Sync Shopify Payments → Google Sheets (FINANZAS + RESUMEN)
 * Cron: diario a las 8am UTC (2am MX)
 * Manual: GET /api/sync-finanzas
 */

const https = require('https');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SHOP = '18d06f-7a.myshopify.com';
const API_VERSION = '2025-01';
const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const FINANZAS_TOKEN = (process.env.SHOPIFY_FINANZAS_TOKEN || '').trim();

// ═══════════════════════════════════════════════════════════
// SHOPIFY API
// ═══════════════════════════════════════════════════════════

function shopifyREST(endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: SHOP, port: 443,
      path: `/admin/api/${API_VERSION}/${endpoint}`,
      method: 'GET',
      headers: { 'X-Shopify-Access-Token': FINANZAS_TOKEN, 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ body: JSON.parse(data), headers: res.headers }); }
        catch (e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function shopifyGraphQL(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    const req = https.request({
      hostname: SHOP, port: 443,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': FINANZAS_TOKEN,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════
// DATA FETCHERS
// ═══════════════════════════════════════════════════════════

async function fetchAllTransactions() {
  let all = [];
  let url = 'shopify_payments/balance/transactions.json?limit=100';
  while (url) {
    const { body, headers } = await shopifyREST(url);
    all = all.concat(body.transactions || []);
    const link = headers.link || '';
    const next = link.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
    url = next ? `shopify_payments/balance/transactions.json?limit=100&page_info=${next[1]}` : null;
  }
  return all;
}

async function fetchPayouts() {
  const map = {};
  let url = 'shopify_payments/payouts.json?limit=100';
  while (url) {
    const { body, headers } = await shopifyREST(url);
    (body.payouts || []).forEach(p => { map[p.id] = { date: p.date, status: p.status }; });
    const link = headers.link || '';
    const next = link.match(/<[^>]*page_info=([^>&]+)[^>]*>;\s*rel="next"/);
    url = next ? `shopify_payments/payouts.json?limit=100&page_info=${next[1]}` : null;
  }
  return map;
}

async function fetchOrderDetails(orderIds) {
  const map = {};
  for (let i = 0; i < orderIds.length; i += 10) {
    const batch = orderIds.slice(i, i + 10);
    const queries = batch.map((id, idx) => `
      order${idx}: order(id: "gid://shopify/Order/${id}") {
        name
        lineItems(first: 10) { edges { node { title quantity } } }
        transactions(first: 1) { paymentDetails { ... on CardPaymentDetails { company } } }
      }
    `).join('\n');

    const result = await shopifyGraphQL(`{ ${queries} }`);
    if (result.data) {
      batch.forEach((id, idx) => {
        const order = result.data[`order${idx}`];
        if (!order) return;
        const items = order.lineItems.edges.map(e => `${e.node.title} x${e.node.quantity}`);
        const allTitles = order.lineItems.edges.map(e => e.node.title).join(' ').toLowerCase();
        let sede = '';
        if (allTitles.includes('guanajuato')) sede = 'GUANAJUATO';
        else if (allTitles.includes('puebla')) sede = 'PUEBLA';
        else if (allTitles.includes('guadalajara')) sede = 'GUADALAJARA';
        else if (allTitles.includes('ixtapan')) sede = 'IXTAPAN';
        else if (allTitles.includes('taxco')) sede = 'TAXCO';
        map[id] = {
          name: order.name,
          products: items.join(', '),
          paymentMethod: order.transactions?.[0]?.paymentDetails?.company || '',
          sede
        };
      });
    }
    await new Promise(r => setTimeout(r, 300));
  }
  return map;
}

const SEDE_SHEETS = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

async function fetchRidersMap(doc) {
  const map = {};
  for (const sedeName of SEDE_SHEETS) {
    const sheet = doc.sheetsByTitle[sedeName];
    if (!sheet) continue;
    const rows = await sheet.getRows();
    for (const row of rows) {
      const orden = (row.ORDEN || '').trim();
      const nombre = (row.NOMBRE || '').trim();
      if (!orden || !nombre) continue;
      const key = orden.replace('#', '');
      if (!map[key]) map[key] = [];
      map[key].push(nombre);
    }
  }
  return map;
}

// ═══════════════════════════════════════════════════════════
// FETCH MANUAL REGISTRATIONS FROM SHEETS
// ═══════════════════════════════════════════════════════════

async function fetchManualRegistrations(doc) {
  const manualOrders = {}; // key = MANUAL-XXX

  for (const sedeName of SEDE_SHEETS) {
    const sheet = doc.sheetsByTitle[sedeName];
    if (!sheet) continue;
    const rows = await sheet.getRows();
    for (const row of rows) {
      const orden = (row.ORDEN || '').trim();
      if (!orden.startsWith('MANUAL-')) continue;

      const nombre = (row.NOMBRE || '').trim();
      const pago = (row.PAGO || '').trim().toLowerCase();

      // Leer TOTAL PAGO como fuente de verdad para montos manuales
      const totalPagoRaw = (row['TOTAL PAGO'] || '').toString().replace(/[$,]/g, '').trim();
      const totalPagoNum = parseFloat(totalPagoRaw) || 0;

      let metodo = 'Manual';
      let montoRider = 0;
      if (pago === 'patrocinado') {
        metodo = 'Patrocinado';
      } else {
        const parts = pago.split(' ');
        metodo = (parts[0] || 'deposito').charAt(0).toUpperCase() + (parts[0] || 'deposito').slice(1);
        // Prioridad: TOTAL PAGO > monto en PAGO > default 1500
        montoRider = totalPagoNum > 0 ? totalPagoNum : (parseFloat(parts[1]) || 1500);
      }

      if (!manualOrders[orden]) {
        manualOrders[orden] = {
          fecha: row.FECHA || '',
          sede: sedeName,
          metodo,
          monto: 0,
          corredores: []
        };
      }

      manualOrders[orden].monto += montoRider;
      if (nombre) manualOrders[orden].corredores.push(nombre);
    }
  }

  return manualOrders;
}

// ═══════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Date-only strings (YYYY-MM-DD) → parse directly to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d} ${months[m - 1]} ${y}`;
  }
  const d = new Date(dateStr);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function estimatePayoutDate(processedAt) {
  if (!processedAt) return '';
  const d = new Date(processedAt);
  let biz = 0;
  while (biz < 7) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) biz++; }
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function getPayoutStatus(s) {
  const map = { paid: 'Depositado', scheduled: 'Programado', in_transit: 'En tránsito', pending: 'Pendiente', canceled: 'Cancelado', failed: 'Fallido' };
  return map[s] || 'Pendiente';
}

function getTxnType(t) {
  const map = { charge: 'Cargo', refund: 'Reembolso', dispute: 'Disputa', reserve: 'Reserva', adjustment: 'Ajuste' };
  return map[t] || t || '';
}

function fmtMoney(n) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

// ═══════════════════════════════════════════════════════════
// WRITE FINANZAS SHEET (data only + totals row)
// ═══════════════════════════════════════════════════════════

async function writeFinanzas(rows, doc, totals) {
  let sheet = doc.sheetsByTitle['FINANZAS'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'FINANZAS' });
  }

  // Clear all data in 1 API call (keeps sheet), then set header
  await sheet.clear();
  await sheet.setHeaderRow([
    'FECHA', 'FECHA DEPOSITO', 'ESTADO', 'PEDIDO', 'TIPO',
    'FORMA DE PAGO', 'SEDE', 'IMPORTE', 'COMISION', '% COM', 'NETO',
    '# CORREDORES', 'CORREDORES', 'PRODUCTO'
  ]);

  // Write data
  for (let i = 0; i < rows.length; i += 20) {
    await sheet.addRows(rows.slice(i, i + 20));
  }

  // ─── COLORS ───
  const dataCount = rows.length;
  const totalCellRows = dataCount + 1; // +1 header
  await sheet.loadCells(`A1:N${totalCellRows}`);

  // Header
  for (let col = 0; col <= 13; col++) {
    const cell = sheet.getCell(0, col);
    cell.backgroundColor = { red: 0.12, green: 0.12, blue: 0.12 };
    cell.textFormat = { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } };
  }

  // Data rows
  for (let i = 1; i <= dataCount; i++) {
    const estado = sheet.getCell(i, 2);
    const pedido = sheet.getCell(i, 3);
    const importe = sheet.getCell(i, 7);
    const comision = sheet.getCell(i, 8);
    const pctCom = sheet.getCell(i, 9);
    const neto = sheet.getCell(i, 10);

    const ev = estado.value;
    if (ev === 'Depositado') {
      estado.backgroundColor = { red: 0.88, green: 0.97, blue: 0.88 };
      estado.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.1, green: 0.5, blue: 0.1 } } };
    } else if (ev === 'En tránsito' || ev === 'Programado') {
      estado.backgroundColor = { red: 1, green: 0.96, blue: 0.82 };
      estado.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.5, blue: 0.0 } } };
    } else if (ev === 'Pendiente') {
      estado.backgroundColor = { red: 0.98, green: 0.88, blue: 0.88 };
      estado.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.15, blue: 0.15 } } };
    }

    const pedidoVal = pedido.value || '';
    if (pedidoVal.startsWith('MANUAL')) {
      pedido.backgroundColor = { red: 1, green: 0.94, blue: 0.82 };
      pedido.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.45, blue: 0.0 } } };
    } else {
      pedido.backgroundColor = { red: 0.93, green: 0.88, blue: 0.98 };
      pedido.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } };
    }

    importe.backgroundColor = { red: 0.88, green: 0.97, blue: 0.88 };
    importe.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.1, green: 0.5, blue: 0.1 } } };

    comision.backgroundColor = { red: 0.98, green: 0.88, blue: 0.88 };
    comision.textFormat = { foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.15, blue: 0.15 } } };

    pctCom.backgroundColor = { red: 0.98, green: 0.92, blue: 0.92 };
    pctCom.textFormat = { foregroundColorStyle: { rgbColor: { red: 0.6, green: 0.2, blue: 0.2 } } };

    neto.backgroundColor = { red: 0.85, green: 0.92, blue: 1 };
    neto.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.05, green: 0.25, blue: 0.65 } } };

    if (i % 2 === 0) {
      for (const col of [0, 1, 4, 5, 6, 11, 12, 13]) {
        sheet.getCell(i, col).backgroundColor = { red: 0.96, green: 0.96, blue: 0.96 };
      }
    }
  }

  await sheet.saveUpdatedCells();
}

// ═══════════════════════════════════════════════════════════
// WRITE RESUMEN SHEET (separate tab - totals + dashboards)
// ═══════════════════════════════════════════════════════════

async function writeResumen(doc, summary) {
  let sheet = doc.sheetsByTitle['RESUMEN'];
  if (!sheet) {
    sheet = await doc.addSheet({ title: 'RESUMEN', headerValues: ['A', 'B', 'C', 'D', 'E', 'F'] });
  }

  // Clear all data in 1 API call, then add pad rows for cell formatting
  await sheet.clear();
  await sheet.setHeaderRow(['A', 'B', 'C', 'D', 'E', 'F']);
  const padRows = [];
  for (let i = 0; i < 30; i++) padRows.push({ A: '', B: '', C: '', D: '', E: '', F: '' });
  await sheet.addRows(padRows);
  // 1 header + 30 data = 31 rows (indices 0-30)
  await sheet.loadCells('A1:F31');

  const darkBg = { red: 0.12, green: 0.12, blue: 0.12 };
  const whiteBold = { bold: true, fontSize: 11, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } };
  const greenBg = { red: 0.88, green: 0.97, blue: 0.88 };
  const greenTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.1, green: 0.5, blue: 0.1 } } };
  const redBg = { red: 0.98, green: 0.88, blue: 0.88 };
  const redTxt = { foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.15, blue: 0.15 } } };
  const blueBg = { red: 0.85, green: 0.92, blue: 1 };
  const blueTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.05, green: 0.25, blue: 0.65 } } };
  const amberBg = { red: 1, green: 0.96, blue: 0.82 };
  const amberTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.5, blue: 0.0 } } };
  const purpleBg = { red: 0.93, green: 0.88, blue: 0.98 };
  const purpleTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } };
  const bigGreen = { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.05, green: 0.4, blue: 0.05 } } };
  const bigRed = { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.6, green: 0.1, blue: 0.1 } } };
  const bigBlue = { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.02, green: 0.2, blue: 0.55 } } };
  const bigPurple = { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } };
  const grayTxt = { fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } };
  const bigAmber = { bold: true, fontSize: 12, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.5, blue: 0.0 } } };

  function setCell(r, c, val, bg, fmt) {
    const cell = sheet.getCell(r, c);
    cell.value = val;
    if (bg) cell.backgroundColor = bg;
    if (fmt) cell.textFormat = fmt;
  }

  function headerRow(r, title, cols) {
    setCell(r, 0, title, darkBg, whiteBold);
    cols.forEach((col, i) => setCell(r, i + 1, col, darkBg, whiteBold));
    for (let c = cols.length + 1; c <= 5; c++) setCell(r, c, '', darkBg, null);
  }

  const sp = summary.shopify;
  const dep = summary.depositos;
  const ef = summary.efectivo;

  // ═══ ROW 1: SHOPIFY (pagos en línea) ═══
  let r = 1;
  headerRow(r, 'SHOPIFY', ['IMPORTE', 'COMISION', '% COM', 'NETO', 'CORREDORES']);
  r = 2;
  const spPct = sp.importe > 0 ? ((sp.comision / sp.importe) * 100).toFixed(1) + '%' : '';
  setCell(r, 0, 'Pagos en línea', null, { bold: true, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } });
  setCell(r, 1, fmtMoney(sp.importe), { red: 0.78, green: 0.94, blue: 0.78 }, bigGreen);
  setCell(r, 2, `-${fmtMoney(sp.comision)}`, { red: 0.96, green: 0.78, blue: 0.78 }, bigRed);
  setCell(r, 3, spPct, { red: 0.96, green: 0.78, blue: 0.78 }, bigRed);
  setCell(r, 4, fmtMoney(sp.neto), { red: 0.75, green: 0.85, blue: 1 }, bigBlue);
  setCell(r, 5, sp.corredores, purpleBg, bigPurple);

  // ═══ ROW 4: DEPOSITOS / TRANSFERENCIAS ═══
  r = 4;
  headerRow(r, 'DEPOSITOS / TRANSFERENCIAS', ['IMPORTE', 'COMISION', '% COM', 'NETO', 'CORREDORES']);
  r = 5;
  setCell(r, 0, 'Depósitos y transferencias', null, { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.45, blue: 0.0 } } });
  setCell(r, 1, fmtMoney(dep.importe), { red: 0.78, green: 0.94, blue: 0.78 }, bigGreen);
  setCell(r, 2, '$0.00', null, grayTxt);
  setCell(r, 3, '0%', null, grayTxt);
  setCell(r, 4, fmtMoney(dep.neto), { red: 0.75, green: 0.85, blue: 1 }, bigBlue);
  setCell(r, 5, dep.corredores, purpleBg, bigPurple);

  // ═══ ROW 7: EFECTIVO ═══
  r = 7;
  headerRow(r, 'EFECTIVO', ['IMPORTE', 'COMISION', '% COM', 'NETO', 'CORREDORES']);
  r = 8;
  setCell(r, 0, 'Pagos en efectivo', null, { bold: true, foregroundColorStyle: { rgbColor: { red: 0.2, green: 0.5, blue: 0.2 } } });
  setCell(r, 1, fmtMoney(ef.importe), { red: 0.78, green: 0.94, blue: 0.78 }, bigGreen);
  setCell(r, 2, '$0.00', null, grayTxt);
  setCell(r, 3, '0%', null, grayTxt);
  setCell(r, 4, fmtMoney(ef.neto), { red: 0.75, green: 0.85, blue: 1 }, bigBlue);
  setCell(r, 5, ef.corredores, purpleBg, bigPurple);

  // ═══ ROW 10: TOTALES ═══
  r = 10;
  headerRow(r, 'TOTALES', ['IMPORTE', 'COMISION', '% COM', 'NETO', 'CORREDORES']);
  r = 11;
  setCell(r, 0, 'Total general', null, { bold: true, fontSize: 12 });
  setCell(r, 1, summary.totals.importe, { red: 0.68, green: 0.9, blue: 0.68 }, { bold: true, fontSize: 13, foregroundColorStyle: { rgbColor: { red: 0.0, green: 0.35, blue: 0.0 } } });
  setCell(r, 2, summary.totals.comision, { red: 0.94, green: 0.72, blue: 0.72 }, { bold: true, fontSize: 13, foregroundColorStyle: { rgbColor: { red: 0.55, green: 0.05, blue: 0.05 } } });
  setCell(r, 3, summary.totals.pctComision, { red: 0.94, green: 0.72, blue: 0.72 }, { bold: true, fontSize: 13, foregroundColorStyle: { rgbColor: { red: 0.55, green: 0.05, blue: 0.05 } } });
  setCell(r, 4, summary.totals.neto, { red: 0.65, green: 0.8, blue: 1 }, { bold: true, fontSize: 13, foregroundColorStyle: { rgbColor: { red: 0.0, green: 0.15, blue: 0.5 } } });
  setCell(r, 5, summary.totals.totalCorredores, { red: 0.88, green: 0.82, blue: 0.96 }, { bold: true, fontSize: 13, foregroundColorStyle: { rgbColor: { red: 0.35, green: 0.15, blue: 0.55 } } });

  // ═══ ROW 13: RESUMEN POR SEDE ═══
  r = 13;
  headerRow(r, 'RESUMEN POR SEDE', ['IMPORTE', 'COMISION', 'NETO', 'CORREDORES']);
  SEDE_SHEETS.forEach((sede, idx) => {
    const row = 14 + idx;
    const s = summary.bySede[sede] || { importe: 0, comision: 0, neto: 0, corredores: 0 };
    setCell(row, 0, sede, null, { bold: true });
    setCell(row, 1, fmtMoney(s.importe), greenBg, greenTxt);
    setCell(row, 2, `-${fmtMoney(s.comision)}`, redBg, redTxt);
    setCell(row, 3, fmtMoney(s.neto), blueBg, blueTxt);
    setCell(row, 4, s.corredores || 0, null, { bold: true });
  });

  // ═══ ROW 20: DESGLOSE POR ESTADO ═══
  r = 20;
  headerRow(r, 'DESGLOSE POR ESTADO', ['IMPORTE', 'NETO', 'SHOPIFY', 'DEPOSITOS', 'EFECTIVO']);
  const emptyEst = { importe: 0, neto: 0, shopify: { importe: 0, neto: 0 }, depositos: { importe: 0, neto: 0 }, efectivo: { importe: 0, neto: 0 } };
  const estados = [
    { name: 'Depositado', bg: greenBg, txt: greenTxt },
    { name: 'En tránsito', bg: amberBg, txt: amberTxt },
    { name: 'Pendiente', bg: redBg, txt: { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.15, blue: 0.15 } } } }
  ];
  estados.forEach((est, idx) => {
    const row = 21 + idx;
    const s = summary.byEstado[est.name] || emptyEst;
    setCell(row, 0, est.name, est.bg, est.txt);
    setCell(row, 1, fmtMoney(s.importe), est.bg, est.txt);
    setCell(row, 2, fmtMoney(s.neto), est.bg, est.txt);
    setCell(row, 3, fmtMoney(s.shopify.importe), null, { bold: true, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } });
    setCell(row, 4, fmtMoney(s.depositos.importe), null, bigAmber);
    setCell(row, 5, fmtMoney(s.efectivo.importe), null, { bold: true, foregroundColorStyle: { rgbColor: { red: 0.2, green: 0.5, blue: 0.2 } } });
  });

  await sheet.saveUpdatedCells();
}

// ═══════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  console.log('SYNC FINANZAS iniciado');

  try {
    const transactions = await fetchAllTransactions();
    const payoutMap = await fetchPayouts();

    const orderIds = [...new Set(
      transactions.filter(t => t.source_order_id).map(t => String(t.source_order_id))
    )];
    const orderDetails = await fetchOrderDetails(orderIds);

    // Google Sheets
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });
    await doc.loadInfo();
    const ridersMap = await fetchRidersMap(doc);

    // Build rows + summaries (Shopify vs Deposito vs Efectivo)
    let spImporte = 0, spComision = 0, spNeto = 0, spCorredores = 0;
    let depImporte = 0, depNeto = 0, depCorredores = 0;
    let efImporte = 0, efNeto = 0, efCorredores = 0;
    const bySede = {};
    const byEstado = {};

    const filtered = transactions
      .filter(t => t.type !== 'payout')
      .filter(t => {
        if (!t.source_order_id) return false;
        const d = orderDetails[String(t.source_order_id)];
        if (!d) return false;
        return parseInt(d.name.replace('#', '')) >= 1000;
      })
      .sort((a, b) => new Date(a.processed_at) - new Date(b.processed_at));

    const rows = filtered.map(t => {
      const payout = t.payout_id ? payoutMap[t.payout_id] : null;
      const d = orderDetails[String(t.source_order_id)] || {};
      const amt = parseFloat(t.amount || 0);
      const fee = Math.abs(parseFloat(t.fee || 0));
      const net = parseFloat(t.net || 0);
      const pct = amt > 0 ? ((fee / amt) * 100).toFixed(1) + '%' : '';
      // Use actual payout status when available (more accurate than transaction-level payout_status)
      const actualPayoutStatus = payout ? payout.status : t.payout_status;
      const estado = getPayoutStatus(actualPayoutStatus);
      const sede = d.sede || '';
      const riders = ridersMap[d.name?.replace('#', '') || ''] || [];

      spImporte += amt;
      spComision += fee;
      spNeto += net;
      spCorredores += riders.length;

      if (sede) {
        if (!bySede[sede]) bySede[sede] = { importe: 0, comision: 0, neto: 0, corredores: 0 };
        bySede[sede].importe += amt;
        bySede[sede].comision += fee;
        bySede[sede].neto += net;
        bySede[sede].corredores += riders.length;
      }

      if (!byEstado[estado]) byEstado[estado] = { importe: 0, neto: 0, shopify: { importe: 0, neto: 0 }, depositos: { importe: 0, neto: 0 }, efectivo: { importe: 0, neto: 0 } };
      byEstado[estado].importe += amt;
      byEstado[estado].neto += net;
      byEstado[estado].shopify.importe += amt;
      byEstado[estado].shopify.neto += net;

      return {
        'FECHA': formatDate(t.processed_at),
        'FECHA DEPOSITO': payout ? formatDate(payout.date) : estimatePayoutDate(t.processed_at),
        'ESTADO': estado,
        'PEDIDO': d.name || '',
        'TIPO': getTxnType(t.type),
        'FORMA DE PAGO': d.paymentMethod || '',
        'SEDE': sede,
        'IMPORTE': fmtMoney(amt),
        'COMISION': `-${fmtMoney(fee)}`,
        '% COM': pct,
        'NETO': fmtMoney(net),
        '# CORREDORES': riders.length || '',
        'CORREDORES': riders.join(', '),
        'PRODUCTO': d.products || ''
      };
    });

    // ─── MANUAL REGISTRATIONS ───
    const manualOrders = await fetchManualRegistrations(doc);
    const manualKeys = Object.keys(manualOrders).sort();
    console.log(`Manual registrations: ${manualKeys.length}`);

    for (const orden of manualKeys) {
      const m = manualOrders[orden];
      if (m.monto <= 0) continue;

      const amt = m.monto;
      const sede = m.sede;
      const riders = m.corredores;
      const isEfectivo = m.metodo.toLowerCase() === 'efectivo';

      if (isEfectivo) {
        efImporte += amt; efNeto += amt; efCorredores += riders.length;
      } else {
        depImporte += amt; depNeto += amt; depCorredores += riders.length;
      }

      if (sede) {
        if (!bySede[sede]) bySede[sede] = { importe: 0, comision: 0, neto: 0, corredores: 0 };
        bySede[sede].importe += amt;
        bySede[sede].neto += amt;
        bySede[sede].corredores += riders.length;
      }

      const estado = 'Depositado';
      if (!byEstado[estado]) byEstado[estado] = { importe: 0, neto: 0, shopify: { importe: 0, neto: 0 }, depositos: { importe: 0, neto: 0 }, efectivo: { importe: 0, neto: 0 } };
      byEstado[estado].importe += amt;
      byEstado[estado].neto += amt;
      if (isEfectivo) {
        byEstado[estado].efectivo.importe += amt;
        byEstado[estado].efectivo.neto += amt;
      } else {
        byEstado[estado].depositos.importe += amt;
        byEstado[estado].depositos.neto += amt;
      }

      rows.push({
        'FECHA': m.fecha,
        'FECHA DEPOSITO': m.fecha,
        'ESTADO': estado,
        'PEDIDO': orden,
        'TIPO': 'Cargo',
        'FORMA DE PAGO': m.metodo,
        'SEDE': sede,
        'IMPORTE': fmtMoney(amt),
        'COMISION': '$0.00',
        '% COM': '0%',
        'NETO': fmtMoney(amt),
        '# CORREDORES': riders.length || '',
        'CORREDORES': riders.join(', '),
        'PRODUCTO': `Inscripción Manual - ${sede}`
      });
    }

    // Re-sort all rows by date
    rows.sort((a, b) => {
      const parseDate = (str) => {
        if (!str) return new Date(0);
        const months = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };
        const parts = str.split(' ');
        if (parts.length === 3) return new Date(parts[2], months[parts[1]] || 0, parts[0]);
        const d = new Date(str);
        return isNaN(d) ? new Date(0) : d;
      };
      return parseDate(a['FECHA']) - parseDate(b['FECHA']);
    });

    const totalImporte = spImporte + depImporte + efImporte;
    const totalNeto = spNeto + depNeto + efNeto;
    const totalCorredores = spCorredores + depCorredores + efCorredores;

    const summary = {
      shopify: { importe: spImporte, comision: spComision, neto: spNeto, corredores: spCorredores },
      depositos: { importe: depImporte, neto: depNeto, corredores: depCorredores },
      efectivo: { importe: efImporte, neto: efNeto, corredores: efCorredores },
      totals: {
        importe: fmtMoney(totalImporte),
        comision: `-${fmtMoney(spComision)}`,
        pctComision: totalImporte > 0 ? ((spComision / totalImporte) * 100).toFixed(1) + '%' : '',
        neto: fmtMoney(totalNeto),
        totalCorredores
      },
      bySede,
      byEstado
    };

    // Write both sheets
    await writeFinanzas(rows, doc, summary);
    await writeResumen(doc, summary);

    console.log(`FINANZAS: ${rows.length} transacciones sincronizadas`);
    return res.status(200).json({
      success: true,
      transactions: rows.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Retry una vez si es error 429 (quota exceeded)
    if (error.message && error.message.includes('429') && !req._retried) {
      console.log('Quota 429 - reintentando en 15s...');
      req._retried = true;
      await new Promise(r => setTimeout(r, 15000));
      return module.exports(req, res);
    }
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
