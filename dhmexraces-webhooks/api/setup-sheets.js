/**
 * Setup All Sede Sheets - Headers, formato y NUMEROS
 * GET /api/setup-sheets
 * GET /api/setup-sheets?sede=guadalajara  (solo una sede)
 * GET /api/setup-sheets?numeros=200       (cantidad de números, default 200)
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const ALL_SEDES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

const SEDE_HEADERS = [
  'FECHA', 'ORDEN', 'NOMBRE', 'EMAIL', 'TELEFONO', 'FECHA DE NACIMIENTO',
  'EQUIPO', 'CATEGORIA', 'SEDE', 'EMERGENCIA NOMBRE', 'EMERGENCIA TEL',
  'QR_CODE', 'CHECK_IN', 'CHECK_IN_TIME', 'JERSEY', 'PAGO', 'TOTAL PAGO',
  'KIT', 'MEDALLA'
];

const NUMEROS_HEADERS = ['Numero', 'Ocupado', 'OrderID', 'Email', 'Nombre', 'Categoria', 'Fecha'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });
    await doc.loadInfo();

    const sedeQuery = (req.query.sede || '').toUpperCase();
    const sedes = sedeQuery && ALL_SEDES.includes(sedeQuery) ? [sedeQuery] : ALL_SEDES;
    const maxNumeros = parseInt(req.query.numeros) || 200;

    const results = [];

    // Colors
    const darkBg = { red: 0.12, green: 0.12, blue: 0.12 };
    const whiteBold = { bold: true, fontSize: 10, foregroundColorStyle: { rgbColor: { red: 1, green: 1, blue: 1 } } };

    for (const sede of sedes) {
      const sedeResult = { sede, sedeSheet: 'skipped', numerosSheet: 'skipped' };

      // ═══ SEDE SHEET ═══
      let sheet = doc.sheetsByTitle[sede];
      if (!sheet) {
        sheet = await doc.addSheet({ title: sede, headerValues: SEDE_HEADERS });
        sedeResult.sedeSheet = 'created';
      } else {
        // Check if headers exist
        await sheet.loadCells('A1:S1');
        const firstCell = sheet.getCell(0, 0);
        if (!firstCell.value || firstCell.value !== 'FECHA') {
          // Set headers
          await sheet.setHeaderRow(SEDE_HEADERS);
          await sheet.loadCells('A1:S1');
          sedeResult.sedeSheet = 'headers_set';
        } else {
          sedeResult.sedeSheet = 'already_setup';
        }
      }

      // Format header row
      await sheet.loadCells('A1:S1');
      for (let col = 0; col < SEDE_HEADERS.length; col++) {
        const cell = sheet.getCell(0, col);
        cell.backgroundColor = darkBg;
        cell.textFormat = whiteBold;
      }
      await sheet.saveUpdatedCells();

      // Freeze header row
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

      // ═══ NUMEROS SHEET ═══
      const numerosName = `${sede} NUMEROS`;
      let numSheet = doc.sheetsByTitle[numerosName];
      if (!numSheet) {
        numSheet = await doc.addSheet({ title: numerosName, headerValues: NUMEROS_HEADERS });
        sedeResult.numerosSheet = 'created';

        // Fill with numbers 1-maxNumeros
        const numberRows = [];
        for (let n = 1; n <= maxNumeros; n++) {
          numberRows.push({
            Numero: String(n),
            Ocupado: '0',
            OrderID: '',
            Email: '',
            Nombre: '',
            Categoria: '',
            Fecha: ''
          });
        }
        // Add in batches of 50
        for (let i = 0; i < numberRows.length; i += 50) {
          await numSheet.addRows(numberRows.slice(i, i + 50));
        }
      } else {
        // Check if it has headers
        await numSheet.loadCells('A1:G1');
        const firstCell = numSheet.getCell(0, 0);
        if (!firstCell.value || firstCell.value !== 'Numero') {
          await numSheet.setHeaderRow(NUMEROS_HEADERS);
          sedeResult.numerosSheet = 'headers_set';
        } else {
          // Check if it has data rows
          const rows = await numSheet.getRows();
          if (rows.length === 0) {
            // Fill with numbers
            const numberRows = [];
            for (let n = 1; n <= maxNumeros; n++) {
              numberRows.push({
                Numero: String(n),
                Ocupado: '0',
                OrderID: '',
                Email: '',
                Nombre: '',
                Categoria: '',
                Fecha: ''
              });
            }
            for (let i = 0; i < numberRows.length; i += 50) {
              await numSheet.addRows(numberRows.slice(i, i + 50));
            }
            sedeResult.numerosSheet = 'numbers_filled';
          } else {
            sedeResult.numerosSheet = 'already_setup';
          }
        }
      }

      // Format NUMEROS header
      await numSheet.loadCells('A1:G1');
      for (let col = 0; col < NUMEROS_HEADERS.length; col++) {
        const cell = numSheet.getCell(0, col);
        cell.backgroundColor = darkBg;
        cell.textFormat = whiteBold;
      }
      await numSheet.saveUpdatedCells();

      // Freeze NUMEROS header
      try {
        await doc.axios.post(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
          requests: [{
            updateSheetProperties: {
              properties: { sheetId: numSheet.sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount'
            }
          }]
        });
      } catch (e) { /* ignore */ }

      results.push(sedeResult);

      // Small delay between sedes to avoid quota issues
      await new Promise(r => setTimeout(r, 500));
    }

    return res.status(200).json({
      success: true,
      message: `Setup completado para ${sedes.length} sede(s)`,
      results
    });

  } catch (error) {
    if (error.message && error.message.includes('429') && !req._retried) {
      console.log('Quota 429 - reintentando en 15s...');
      req._retried = true;
      await new Promise(r => setTimeout(r, 15000));
      return module.exports(req, res);
    }
    console.error('Error setup-sheets:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
