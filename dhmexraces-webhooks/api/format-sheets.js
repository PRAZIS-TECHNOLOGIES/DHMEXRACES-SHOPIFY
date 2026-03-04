/**
 * Format Sede Sheets - Formato visual + monto en TOTAL PAGO
 * GET /api/format-sheets?sede=guanajuato
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const VALID_SEDES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

// A=FECHA, B=ORDEN, C=NOMBRE, D=EMAIL, E=TELEFONO, F=FECHA DE NACIMIENTO,
// G=EQUIPO, H=CATEGORIA, I=SEDE, J=EMERGENCIA NOMBRE, K=EMERGENCIA TEL,
// L=QR_CODE, M=CHECK_IN, N=CHECK_IN_TIME, O=JERSEY, P=PAGO, Q=TOTAL PAGO, R=KIT, S=MEDALLA
const COL = {
  FECHA: 0, ORDEN: 1, NOMBRE: 2, EMAIL: 3, TELEFONO: 4, NACIMIENTO: 5,
  EQUIPO: 6, CATEGORIA: 7, SEDE: 8, EMERG_NOMBRE: 9, EMERG_TEL: 10,
  QR_CODE: 11, CHECK_IN: 12, CHECK_IN_TIME: 13, JERSEY: 14, PAGO: 15,
  TOTAL_PAGO: 16, KIT: 17, MEDALLA: 18
};
const TOTAL_COLS = 19;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sedeQuery = (req.query.sede || '').toUpperCase();
  if (!sedeQuery || !VALID_SEDES.includes(sedeQuery)) {
    return res.status(400).json({ error: 'Sede requerida. Usa ?sede=guanajuato' });
  }

  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[sedeQuery];
    if (!sheet) {
      return res.status(404).json({ error: `Hoja ${sedeQuery} no encontrada` });
    }

    const rows = await sheet.getRows();
    const rowCount = rows.length + 1;
    if (rowCount <= 1) {
      return res.status(200).json({ success: true, message: 'Hoja vacía' });
    }

    // ═══ Modo: last=N solo formatea las últimas N filas (ligero) ═══
    const lastParam = parseInt(req.query.last) || 0;
    const startRow = lastParam > 0 ? Math.max(1, rowCount - lastParam) : 1;
    const isPartial = lastParam > 0;

    // ═══ Leer FINANZAS para montos de órdenes Shopify ═══
    const amountMap = {};
    const finSheet = doc.sheetsByTitle['FINANZAS'];
    if (finSheet) {
      const finRows = await finSheet.getRows();
      for (const row of finRows) {
        const pedido = (row.PEDIDO || '').trim().replace('#', '');
        const importe = (row.IMPORTE || '').toString().replace(/[$,]/g, '');
        const amt = parseFloat(importe) || 0;
        if (pedido && amt > 0) {
          amountMap[pedido] = amt;
        }
      }
    }

    // Cargar celdas: solo el rango necesario
    if (isPartial) {
      // Cargar header + filas nuevas solamente
      await sheet.loadCells(`A1:S1`);
      if (startRow > 1) {
        await sheet.loadCells(`A${startRow}:S${rowCount}`);
      }
    } else {
      await sheet.loadCells(`A1:S${rowCount}`);
    }

    // Contar riders por orden (siempre necesario para TOTAL PAGO)
    const riderCount = {};
    for (const row of rows) {
      const orden = (row.ORDEN || '').toString().trim().replace('#', '');
      if (!orden) continue;
      riderCount[orden] = (riderCount[orden] || 0) + 1;
    }

    // ═══ COLORES ═══
    const darkBg = { red: 0.12, green: 0.12, blue: 0.12 };
    const whiteBold = { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } };
    const purpleBg = { red: 0.93, green: 0.88, blue: 0.98 };
    const purpleTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.4, green: 0.2, blue: 0.6 } } };
    const greenBg = { red: 0.88, green: 0.97, blue: 0.88 };
    const greenTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.1, green: 0.5, blue: 0.1 } } };
    const redBg = { red: 0.98, green: 0.88, blue: 0.88 };
    const redTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.7, green: 0.15, blue: 0.15 } } };
    const yellowBg = { red: 1, green: 0.97, blue: 0.75 };
    const yellowTxt = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.65, green: 0.55, blue: 0.0 } } };
    const altBg = { red: 0.96, green: 0.96, blue: 0.96 };
    const nameBold = { bold: true, fontSize: 10 };
    const catBold = { bold: true };
    const moneyGreen = { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: { red: 0.05, green: 0.4, blue: 0.05 } } };

    // ═══ HEADER (solo en modo completo) ═══
    if (!isPartial) {
      for (let col = 0; col < TOTAL_COLS; col++) {
        const cell = sheet.getCell(0, col);
        cell.backgroundColor = darkBg;
        cell.textFormat = whiteBold;
      }
    }

    // ═══ DATA ROWS (desde startRow) ═══
    for (let i = startRow; i < rowCount; i++) {
      const ordenCell = sheet.getCell(i, COL.ORDEN);
      const pagoCell = sheet.getCell(i, COL.PAGO);
      const totalPagoCell = sheet.getCell(i, COL.TOTAL_PAGO);
      const jerseyCell = sheet.getCell(i, COL.JERSEY);

      const ordenVal = (ordenCell.value || '').toString().trim().replace('#', '');
      let pagoVal = (pagoCell.value || '').toString().trim();
      const pagoLower = pagoVal.toLowerCase();
      const isPatrocinado = pagoLower.startsWith('patrocinado');
      const jerseyVal = (jerseyCell.value || '').toString().trim();

      // ─── Limpiar PAGO: si tiene monto pegado, quitar ───
      if (pagoLower.startsWith('shopify ') && pagoLower !== 'shopify') {
        pagoCell.value = 'shopify';
        pagoVal = 'shopify';
      }

      // ─── TOTAL PAGO: sincronizar con FINANZAS, respetar ediciones manuales ───
      const currentTP = (totalPagoCell.value || '').toString().replace(/[$,]/g, '').trim();
      const currentTPNum = parseFloat(currentTP) || 0;
      let monto = 0;

      if (isPatrocinado) {
        monto = 0;
      } else {
        // 1. FINANZAS tiene monto para esta orden → usarlo (FINANZAS → TOTAL PAGO)
        const finAmt = amountMap[ordenVal];
        if (finAmt) {
          const riders = riderCount[ordenVal] || 1;
          monto = Math.round(finAmt / riders);
        }
        // 2. Si FINANZAS no tiene, mantener TOTAL PAGO existente (no borrar)
        else if (currentTPNum > 0) {
          monto = currentTPNum;
        }
        // 3. Último recurso: parsear monto del campo PAGO ("deposito 1500")
        else if (pagoLower.startsWith('deposito') || pagoLower.startsWith('transferencia') || pagoLower.startsWith('efectivo')) {
          const parts = pagoLower.split(' ');
          monto = parseFloat(parts[1]) || 0;
        }
      }

      // Limpiar PAGO: quitar monto si tiene ("deposito 1500" → "Deposito")
      if (pagoLower.startsWith('deposito') || pagoLower.startsWith('transferencia') || pagoLower.startsWith('efectivo')) {
        const parts = pagoLower.split(' ');
        if (parts.length > 1) {
          pagoCell.value = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        }
      }

      // Escribir TOTAL PAGO con formato
      totalPagoCell.value = `$${monto.toLocaleString('es-MX')}`;
      if (isPatrocinado) {
        totalPagoCell.backgroundColor = yellowBg;
        totalPagoCell.textFormat = yellowTxt;
      } else {
        totalPagoCell.backgroundColor = { red: 0.78, green: 0.94, blue: 0.78 };
        totalPagoCell.textFormat = moneyGreen;
      }

      // ─── Filas alternas ───
      if (i % 2 === 0) {
        for (let col = 0; col < TOTAL_COLS; col++) {
          if (![COL.ORDEN, COL.CHECK_IN, COL.PAGO, COL.JERSEY, COL.TOTAL_PAGO].includes(col)) {
            sheet.getCell(i, col).backgroundColor = altBg;
          }
        }
      }

      // NOMBRE - bold
      sheet.getCell(i, COL.NOMBRE).textFormat = nameBold;

      // ORDEN - púrpura
      ordenCell.backgroundColor = purpleBg;
      ordenCell.textFormat = purpleTxt;

      // CATEGORIA - bold
      sheet.getCell(i, COL.CATEGORIA).textFormat = catBold;

      // CHECK_IN - verde/rojo
      const checkIn = sheet.getCell(i, COL.CHECK_IN);
      const checkVal = (checkIn.value || '').toString().toUpperCase();
      if (checkVal === 'SI' || checkVal === 'SÍ') {
        checkIn.backgroundColor = greenBg;
        checkIn.textFormat = greenTxt;
      } else {
        checkIn.backgroundColor = redBg;
        checkIn.textFormat = redTxt;
      }

      // PAGO colores
      if (pagoLower === 'shopify' || pagoLower.startsWith('shopify')) {
        pagoCell.backgroundColor = purpleBg;
        pagoCell.textFormat = purpleTxt;
      } else if (pagoLower.startsWith('deposito') || pagoLower.startsWith('transferencia') || pagoLower.startsWith('efectivo')) {
        pagoCell.backgroundColor = greenBg;
        pagoCell.textFormat = greenTxt;
      } else if (isPatrocinado) {
        pagoCell.backgroundColor = yellowBg;
        pagoCell.textFormat = yellowTxt;
      }

      // JERSEY: patrocinados en verde, demás en azul
      if (isPatrocinado && jerseyVal) {
        jerseyCell.backgroundColor = greenBg;
        jerseyCell.textFormat = greenTxt;
      } else if (jerseyVal) {
        jerseyCell.textFormat = { bold: true, foregroundColorStyle: { rgbColor: { red: 0.2, green: 0.4, blue: 0.6 } } };
      }
    }

    await sheet.saveUpdatedCells();

    // Congelar header (solo en modo completo)
    if (!isPartial) {
      try {
        await doc.axios.post(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: sheet.sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount'
            }
          }]
        });
      } catch (e) { /* ignore */ }
    }

    const formattedRows = rowCount - startRow;
    return res.status(200).json({
      success: true,
      sede: sedeQuery,
      rows: formattedRows,
      mode: isPartial ? `last ${lastParam}` : 'full',
      message: `Formato aplicado a ${formattedRows} fila(s). ${isPartial ? 'Modo parcial.' : 'Montos en TOTAL PAGO.'}`
    });

  } catch (error) {
    if (error.message && error.message.includes('429') && !req._retried) {
      console.log('Quota 429 - reintentando en 15s...');
      req._retried = true;
      await new Promise(r => setTimeout(r, 15000));
      return module.exports(req, res);
    }
    console.error('Error format-sheets:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
