// API Endpoint para Inventario de Playeras y Medallas
// Retorna cuántas quedan disponibles por sede

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

// Configuración de límites por sede
const LIMITS = {
  playeras: 50,    // Primeros 50 inscritos
  medallas: 100    // Primeros 100 inscritos
};

const SHEET_NAMES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

module.exports = async function handler(req, res) {
  // Permitir CORS para que Shopify pueda hacer fetch
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30'); // Cache 1 min

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parámetro opcional: ?sede=guanajuato
  const sedeQuery = req.query.sede;

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

    // Si se especifica una sede, solo devolver esa
    const sheetsToProcess = sedeQuery
      ? [sedeQuery.toUpperCase()]
      : SHEET_NAMES;

    const inventory = {};
    let totalInscritos = 0;

    for (const sheetName of sheetsToProcess) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (!sheet) {
        inventory[sheetName.toLowerCase()] = {
          error: 'Sede no encontrada',
          inscritos: 0,
          playeras: { total: LIMITS.playeras, disponibles: LIMITS.playeras, agotadas: false },
          medallas: { total: LIMITS.medallas, disponibles: LIMITS.medallas, agotadas: false }
        };
        continue;
      }

      const rows = await sheet.getRows();

      // Contar solo filas con NOMBRE (inscritos válidos)
      const inscritos = rows.filter(row => row.NOMBRE && row.NOMBRE.trim() !== '').length;
      totalInscritos += inscritos;

      // Calcular disponibilidad
      const playerasDisponibles = Math.max(0, LIMITS.playeras - inscritos);
      const medallasDisponibles = Math.max(0, LIMITS.medallas - inscritos);

      inventory[sheetName.toLowerCase()] = {
        inscritos: inscritos,
        playeras: {
          total: LIMITS.playeras,
          entregadas: Math.min(inscritos, LIMITS.playeras),
          disponibles: playerasDisponibles,
          agotadas: playerasDisponibles === 0
        },
        medallas: {
          total: LIMITS.medallas,
          entregadas: Math.min(inscritos, LIMITS.medallas),
          disponibles: medallasDisponibles,
          agotadas: medallasDisponibles === 0
        }
      };
    }

    // Si se pidió una sede específica, simplificar respuesta
    if (sedeQuery) {
      const sedeData = inventory[sedeQuery.toLowerCase()];
      return res.status(200).json({
        success: true,
        sede: sedeQuery.toUpperCase(),
        timestamp: new Date().toISOString(),
        ...sedeData
      });
    }

    // Respuesta completa con todas las sedes
    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      limits: LIMITS,
      totalInscritos: totalInscritos,
      sedes: inventory
    });

  } catch (error) {
    console.error('❌ Error en inventory:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
