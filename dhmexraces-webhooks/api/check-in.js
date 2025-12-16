// API Endpoint para Check-in de corredores
// Escanea el QR y marca al corredor como presente

const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

// Lista de hojas (sedes) para buscar
const SHEET_NAMES = ['GUANAJUATO', 'PUEBLA', 'GUADALAJARA', 'IXTAPAN', 'TAXCO'];

module.exports = async function handler(req, res) {
  // Permitir CORS para la página de staff
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Obtener el código QR (puede venir por GET o POST)
  const code = req.query.code || req.body?.code;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Código QR requerido',
      message: 'Proporciona el código QR para hacer check-in'
    });
  }

  console.log(`🔍 Buscando código: ${code}`);

  try {
    // Verificar credenciales
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Configuración incompleta',
        message: 'Credenciales de Google no configuradas'
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
    console.log(`📊 Conectado a: ${doc.title}`);

    // Buscar el código en todas las hojas
    let foundRunner = null;
    let foundSheet = null;
    let foundRow = null;

    for (const sheetName of SHEET_NAMES) {
      const sheet = doc.sheetsByTitle[sheetName];
      if (!sheet) {
        console.log(`⚠️ Hoja ${sheetName} no encontrada`);
        continue;
      }

      // Cargar filas
      const rows = await sheet.getRows();
      console.log(`🔍 Buscando en ${sheetName} (${rows.length} filas)...`);

      for (const row of rows) {
        if (row.QR_CODE === code) {
          foundRunner = {
            nombre: row.NOMBRE,
            email: row.EMAIL,
            telefono: row.TELEFONO,
            equipo: row.EQUIPO,
            categoria: row.CATEGORIA,
            sede: row.SEDE,
            orden: row.ORDEN,
            qrCode: row.QR_CODE,
            checkIn: row.CHECK_IN,
            checkInTime: row.CHECK_IN_TIME
          };
          foundSheet = sheetName;
          foundRow = row;
          break;
        }
      }

      if (foundRunner) break;
    }

    // Si no se encontró el código
    if (!foundRunner) {
      console.log(`❌ Código no encontrado: ${code}`);
      return res.status(404).json({
        success: false,
        error: 'Código no encontrado',
        message: 'Este código QR no está registrado en el sistema',
        code: code
      });
    }

    // Verificar si ya hizo check-in
    if (foundRunner.checkIn === 'SI' || foundRunner.checkIn === 'SÍ') {
      console.log(`⚠️ Ya registrado: ${foundRunner.nombre} a las ${foundRunner.checkInTime}`);
      return res.status(200).json({
        success: true,
        alreadyCheckedIn: true,
        message: 'Este corredor ya hizo check-in anteriormente',
        runner: foundRunner,
        sede: foundSheet,
        checkInTime: foundRunner.checkInTime
      });
    }

    // Realizar check-in
    const checkInTime = new Date().toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    foundRow.CHECK_IN = 'SI';
    foundRow.CHECK_IN_TIME = checkInTime;
    await foundRow.save();

    console.log(`✅ Check-in exitoso: ${foundRunner.nombre} - ${checkInTime}`);

    return res.status(200).json({
      success: true,
      alreadyCheckedIn: false,
      message: '¡Check-in exitoso!',
      runner: {
        ...foundRunner,
        checkIn: 'SI',
        checkInTime: checkInTime
      },
      sede: foundSheet,
      checkInTime: checkInTime
    });

  } catch (error) {
    console.error('❌ Error en check-in:', error);
    return res.status(500).json({
      success: false,
      error: 'Error del servidor',
      message: error.message
    });
  }
};
