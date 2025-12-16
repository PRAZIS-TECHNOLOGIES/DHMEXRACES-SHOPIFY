// API Endpoint para Dashboard de Check-in
// Retorna estadísticas y lista de corredores

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const SHEET_NAMES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

module.exports = async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parámetros opcionales
  const sede = req.query.sede; // Filtrar por sede específica
  const includeRunners = req.query.runners !== 'false'; // Por defecto incluir lista

  try {
    // Verificar credenciales
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuración incompleta'
      });
    }

    // Conectar a Google Sheets
    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();

    const sheetsToProcess = sede
      ? [sede.toUpperCase()]
      : SHEET_NAMES;

    let totalRegistered = 0;
    let totalCheckedIn = 0;
    let allRunners = [];
    let statsBySede = {};
    let statsByCategoria = {};

    for (const sheetName of sheetsToProcess) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (!sheet) continue;

      const rows = await sheet.getRows();

      let sedeRegistered = 0;
      let sedeCheckedIn = 0;

      for (const row of rows) {
        // Solo contar filas con datos
        if (!row.NOMBRE) continue;

        sedeRegistered++;
        totalRegistered++;

        const isCheckedIn = row.CHECK_IN === 'SI' || row.CHECK_IN === 'SÍ';
        if (isCheckedIn) {
          sedeCheckedIn++;
          totalCheckedIn++;
        }

        // Stats por categoría
        const cat = row.CATEGORIA || 'Sin categoría';
        if (!statsByCategoria[cat]) {
          statsByCategoria[cat] = { registered: 0, checkedIn: 0 };
        }
        statsByCategoria[cat].registered++;
        if (isCheckedIn) statsByCategoria[cat].checkedIn++;

        // Agregar a lista de corredores
        if (includeRunners) {
          allRunners.push({
            nombre: row.NOMBRE,
            email: row.EMAIL,
            equipo: row.EQUIPO || 'Independiente',
            categoria: row.CATEGORIA,
            sede: sheetName,
            orden: row.ORDEN,
            qrCode: row.QR_CODE,
            checkedIn: isCheckedIn,
            checkInTime: row.CHECK_IN_TIME || null
          });
        }
      }

      statsBySede[sheetName] = {
        registered: sedeRegistered,
        checkedIn: sedeCheckedIn,
        percentage: sedeRegistered > 0
          ? Math.round((sedeCheckedIn / sedeRegistered) * 100)
          : 0
      };
    }

    // Ordenar runners: checked-in primero (más recientes), luego pendientes
    if (includeRunners) {
      allRunners.sort((a, b) => {
        if (a.checkedIn && !b.checkedIn) return -1;
        if (!a.checkedIn && b.checkedIn) return 1;
        if (a.checkedIn && b.checkedIn) {
          // Más recientes primero
          return new Date(b.checkInTime) - new Date(a.checkInTime);
        }
        return a.nombre.localeCompare(b.nombre);
      });
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalRegistered,
        totalCheckedIn,
        pending: totalRegistered - totalCheckedIn,
        percentage: totalRegistered > 0
          ? Math.round((totalCheckedIn / totalRegistered) * 100)
          : 0
      },
      bySede: statsBySede,
      byCategoria: statsByCategoria,
      runners: includeRunners ? allRunners : undefined
    });

  } catch (error) {
    console.error('❌ Error en dashboard:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
