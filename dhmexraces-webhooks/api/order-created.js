/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DHMEXRACES - Webhook de Órdenes
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este webhook procesa las órdenes de inscripción de Shopify y:
 * 1. Genera códigos únicos de check-in (QR)
 * 2. Asigna boletos de rifa FOX 40
 * 3. Guarda los datos en Google Sheets
 * 4. Envía emails de confirmación personalizados
 *
 * @author DHMEXRACES
 * @version 2.0.0
 * @lastUpdated 2026-01-13
 */

const { Resend } = require('resend');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN Y CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Cliente de Resend para envío de emails */
const resend = new Resend(process.env.RESEND_API_KEY);

/** ID del Google Spreadsheet principal */
const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

/** Mapeo de sedes a códigos cortos para QR */
const SEDE_CODES = {
  'GUANAJUATO': 'GTO',
  'PUEBLA': 'PUE',
  'GUADALAJARA': 'GDL',
  'IXTAPAN': 'IXT',
  'TAXCO': 'TAX'
};

/** Caracteres permitidos para códigos (sin caracteres confusos: I, O, 0, 1) */
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Configuración del descuento automático de jersey */
const JERSEY_DISCOUNT_CONFIG = {
  discountId: 'gid://shopify/DiscountAutomaticNode/1888870433004',
  shop: '18d06f-7a.myshopify.com',
  apiVersion: '2026-01',
  maxJerseys: 50
};

/** Configuración de la rifa */
const RAFFLE_CONFIG = {
  sheetName: 'RIFA',
  prize: 'FOX 40 Factory GRIP 2',
  prizeValue: '$50,000 MXN',
  drawDate: 'Sede Puebla - 22 Marzo 2026'
};

/** Mapeo de sedes a hojas de números de corredor */
const RUNNER_NUMBER_SHEETS = {
  'GUANAJUATO': 'GUANAJUATO NUMEROS',
  'PUEBLA': 'PUEBLA NUMEROS',
  'GUADALAJARA': 'GUADALAJARA NUMEROS',
  'IXTAPAN': 'IXTAPAN NUMEROS',
  'TAXCO': 'TAXCO NUMEROS'
};

/** Configuración del email */
const EMAIL_CONFIG = {
  from: 'DHMEXRACES <noreply@endhurorace.com>',
  subjectPrefix: '✅ Inscripción Confirmada'
};

/** URLs de recursos */
const ASSETS = {
  logo: 'https://cdn.shopify.com/s/files/1/0691/9556/3244/files/DHMEXRACES_MARCA_REGISTRADA_1.png?v=1770853952',
  foxLogo: 'https://endhurorace.com/cdn/shop/files/FOXLOGO.png?v=1763606761&width=400',
  fox40Image: 'https://cdn.shopify.com/s/files/1/0691/9556/3244/files/910_21_280_40_MY25_F_Orange_GripX2_Front.webp?v=1768319279',
  qrApiBase: 'https://api.qrserver.com/v1/create-qr-code/'
};

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES UTILITARIAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Conecta a Google Sheets y retorna el documento autenticado
 * @returns {Promise<GoogleSpreadsheet>} Documento de Google Sheets autenticado
 * @throws {Error} Si las credenciales no están configuradas
 */
async function connectToGoogleSheets() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Credenciales de Google no configuradas');
  }

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  });

  await doc.loadInfo();
  return doc;
}

/**
 * Genera un código alfanumérico aleatorio
 * @param {number} length - Longitud del código
 * @returns {string} Código generado
 */
function generateRandomCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length));
  }
  return code;
}

/**
 * Determina el nombre de la hoja según el título del producto
 * @param {string} productTitle - Título del producto
 * @returns {string} Nombre de la hoja de la sede
 */
function getSheetNameFromProduct(productTitle) {
  const title = (productTitle || '').toLowerCase();

  if (title.includes('guanajuato')) return 'GUANAJUATO';
  if (title.includes('puebla')) return 'PUEBLA';
  if (title.includes('guadalajara')) return 'GUADALAJARA';
  if (title.includes('ixtapan')) return 'IXTAPAN';
  if (title.includes('taxco')) return 'TAXCO';

  return 'GUANAJUATO'; // Default
}

/**
 * Formatea una fecha al formato mexicano (dd/mm/yyyy)
 * @param {string|Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDateMX(date) {
  return new Date(date).toLocaleDateString('en-US', { timeZone: 'America/Mexico_City' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE CHECK-IN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera un código único de check-in para un corredor
 * Formato: DHMEX-{SEDE}-{CODIGO_ALEATORIO}
 *
 * @param {string} sede - Nombre de la sede
 * @returns {string} Código de check-in único
 *
 * @example
 * generateCheckInCode('GUANAJUATO') // 'DHMEX-GTO-A3B7C9D2'
 */
function generateCheckInCode(sede) {
  const sedeCode = SEDE_CODES[sede] || 'DHM';
  const uniqueId = generateRandomCode(8);
  return `DHMEX-${sedeCode}-${uniqueId}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE RIFA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asigna un boleto de rifa a un corredor
 *
 * Proceso:
 * 1. Conecta a la hoja RIFA
 * 2. VERIFICA si ya tiene boleto asignado (por OrderID + Email)
 * 3. Si no tiene, busca el primer boleto disponible (Ocupado = 0)
 * 4. Lo marca como ocupado y guarda los datos del comprador
 * 5. Retorna el número asignado
 *
 * @param {Object} corredor - Datos del corredor
 * @param {string} corredor.nombre - Nombre completo
 * @param {string} corredor.email - Email del corredor
 * @param {string} orderNumber - Número de orden de Shopify
 * @param {string} orderDate - Fecha de la orden
 * @returns {Promise<{success: boolean, numero: string|null, error?: string, skipped?: boolean}>}
 */
async function assignRaffleTicket(corredor, orderNumber, orderDate) {
  try {
    console.log(`🎫 Asignando boleto de rifa a ${corredor.nombre}...`);

    const doc = await connectToGoogleSheets();
    const sheet = doc.sheetsByTitle[RAFFLE_CONFIG.sheetName];

    if (!sheet) {
      console.error(`❌ Hoja "${RAFFLE_CONFIG.sheetName}" no encontrada`);
      return { success: false, numero: null, error: 'Hoja RIFA no encontrada' };
    }

    // Obtener todas las filas
    const rows = await sheet.getRows();

    // VERIFICAR DUPLICADO: Buscar si ya tiene boleto asignado con esta orden + email + nombre
    // Nota: hoja RIFA no tiene columna CATEGORIA, se usa OrderID + Email + Nombre
    const existingTicket = rows.find(row =>
      row.OrderID === String(orderNumber) &&
      row.Email &&
      row.Email.toLowerCase() === (corredor.email || '').toLowerCase() &&
      row.Nombre &&
      row.Nombre.toLowerCase() === (corredor.nombre || '').toLowerCase()
    );

    if (existingTicket) {
      console.log(`⚠️ DUPLICADO RIFA: Orden ${orderNumber}, ${corredor.nombre}, Email ${corredor.email} ya tiene boleto #${existingTicket.Numero}`);
      return {
        success: true,
        numero: existingTicket.Numero,
        skipped: true
      };
    }

    // Buscar el primer boleto disponible (secuencial ya que están randomizados)
    const availableTicket = rows.find(row => row.Ocupado === '0' || row.Ocupado === 0);

    if (!availableTicket) {
      console.error('❌ No hay boletos de rifa disponibles');
      return { success: false, numero: null, error: 'No hay boletos disponibles' };
    }

    // Asignar el boleto
    const ticketNumber = availableTicket.Numero;
    availableTicket.Ocupado = '1';
    availableTicket.OrderID = orderNumber || '';
    availableTicket.Email = corredor.email || '';
    availableTicket.Nombre = corredor.nombre || '';
    availableTicket.Fecha = formatDateMX(orderDate);

    await availableTicket.save();

    console.log(`✅ Boleto #${ticketNumber} asignado exitosamente`);
    return { success: true, numero: ticketNumber };

  } catch (error) {
    console.error('❌ Error asignando boleto de rifa:', error.message);
    return { success: false, numero: null, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE NÚMERO DE CORREDOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asigna un número de corredor desde la hoja de números de la sede
 *
 * @param {Object} corredor - Datos del corredor
 * @param {string} orderNumber - Número de orden
 * @param {string} orderDate - Fecha de la orden
 * @param {string} sheetName - Nombre de la hoja de la sede (ej: GUANAJUATO)
 * @returns {Promise<{success: boolean, numero: string|null, error?: string, skipped?: boolean}>}
 */
async function assignRunnerNumber(corredor, orderNumber, orderDate, sheetName) {
  try {
    const numerosSheetName = RUNNER_NUMBER_SHEETS[sheetName];
    if (!numerosSheetName) {
      console.error(`❌ No hay hoja de números para sede: ${sheetName}`);
      return { success: false, numero: null, error: `Hoja de números no configurada para ${sheetName}` };
    }

    console.log(`🏁 Asignando número de corredor a ${corredor.nombre} en ${numerosSheetName}...`);

    const doc = await connectToGoogleSheets();
    const sheet = doc.sheetsByTitle[numerosSheetName];

    if (!sheet) {
      console.error(`❌ Hoja "${numerosSheetName}" no encontrada`);
      return { success: false, numero: null, error: `Hoja ${numerosSheetName} no encontrada` };
    }

    const rows = await sheet.getRows();

    // VERIFICAR DUPLICADO: Buscar si ya tiene número asignado con esta orden + email + nombre
    const existingNumber = rows.find(row =>
      row.OrderID === String(orderNumber) &&
      row.Email &&
      row.Email.toLowerCase() === (corredor.email || '').toLowerCase() &&
      row.Nombre &&
      row.Nombre.toLowerCase() === (corredor.nombre || '').toLowerCase()
    );

    if (existingNumber) {
      console.log(`⚠️ DUPLICADO NÚMERO: Orden ${orderNumber}, ${corredor.nombre} ya tiene número #${existingNumber.Numero}`);
      return {
        success: true,
        numero: existingNumber.Numero,
        skipped: true
      };
    }

    // Buscar el primer número disponible (secuencial)
    const availableNumber = rows.find(row => row.Ocupado === '0' || row.Ocupado === 0);

    if (!availableNumber) {
      console.error('❌ No hay números de corredor disponibles');
      return { success: false, numero: null, error: 'No hay números disponibles' };
    }

    // Asignar el número
    const runnerNumber = availableNumber.Numero;
    availableNumber.Ocupado = '1';
    availableNumber.OrderID = orderNumber || '';
    availableNumber.Email = corredor.email || '';
    availableNumber.Nombre = corredor.nombre || '';
    availableNumber.Categoria = corredor.categoria || corredor.variant_title || '';
    availableNumber.Fecha = formatDateMX(orderDate);

    await availableNumber.save();

    console.log(`✅ Número de corredor #${runnerNumber} asignado exitosamente`);
    return { success: true, numero: runnerNumber };

  } catch (error) {
    console.error('❌ Error asignando número de corredor:', error.message);
    return { success: false, numero: null, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE GOOGLE SHEETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si un corredor ya existe en Google Sheets (para evitar duplicados)
 *
 * @param {string} orderNumber - Número de orden
 * @param {string} email - Email del corredor
 * @param {string} sheetName - Nombre de la hoja de la sede
 * @returns {Promise<{exists: boolean, existingCode?: string}>}
 */
async function checkIfCorredorExists(orderNumber, email, nombre, categoria, sheetName) {
  try {
    const doc = await connectToGoogleSheets();
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return { exists: false };
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(row =>
      row.ORDEN === String(orderNumber) &&
      row.EMAIL &&
      row.EMAIL.toLowerCase() === email.toLowerCase() &&
      row.NOMBRE &&
      row.NOMBRE.toLowerCase() === (nombre || '').toLowerCase() &&
      row.CATEGORIA &&
      row.CATEGORIA.toLowerCase() === (categoria || '').toLowerCase()
    );

    if (existingRow) {
      return {
        exists: true,
        existingCode: existingRow.QR_CODE || null
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error verificando duplicado:', error.message);
    return { exists: false }; // En caso de error, permitir continuar
  }
}

/**
 * Guarda los datos de un corredor en Google Sheets
 *
 * @param {Object} corredor - Datos del corredor
 * @param {string} orderNumber - Número de orden
 * @param {string} orderDate - Fecha de la orden
 * @param {string} checkInCode - Código de check-in generado
 * @returns {Promise<{success: boolean, sheet?: string, error?: string, skipped?: boolean}>}
 */
async function saveToGoogleSheets(corredor, orderNumber, orderDate, checkInCode, orderTotal, totalCorredores) {
  try {
    console.log(`📊 Guardando corredor ${corredor.nombre} en Sheets...`);

    const doc = await connectToGoogleSheets();
    const sheetName = getSheetNameFromProduct(corredor.product_title);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      console.error(`❌ Hoja "${sheetName}" no encontrada`);
      return { success: false, error: `Hoja "${sheetName}" no encontrada` };
    }

    // VERIFICAR DUPLICADO: Buscar si ya existe un registro con misma orden + email + nombre + categoria
    const rows = await sheet.getRows();
    const existingRow = rows.find(row =>
      row.ORDEN === String(orderNumber) &&
      row.EMAIL &&
      row.EMAIL.toLowerCase() === (corredor.email || '').toLowerCase() &&
      row.NOMBRE &&
      row.NOMBRE.toLowerCase() === (corredor.nombre || '').toLowerCase() &&
      row.CATEGORIA &&
      row.CATEGORIA.toLowerCase() === (corredor.categoria || corredor.variant_title || '').toLowerCase()
    );

    if (existingRow) {
      console.log(`⚠️ DUPLICADO DETECTADO: Orden ${orderNumber}, ${corredor.nombre}, Email ${corredor.email} ya existe con QR: ${existingRow.QR_CODE}`);
      return {
        success: true,
        sheet: sheetName,
        skipped: true,
        existingCode: existingRow.QR_CODE
      };
    }

    // Determinar talla de jersey (si el corredor alcanzó playera)
    const jerseyTalla = corredor.talla_playera ? `Talla ${corredor.talla_playera}` : '';

    // Agregar fila con los datos del corredor
    await sheet.addRow({
      'FECHA': formatDateMX(orderDate),
      'ORDEN': orderNumber,
      'NOMBRE': corredor.nombre || '',
      'EMAIL': corredor.email || '',
      'TELEFONO': corredor.telefono || '',
      'FECHA DE NACIMIENTO': corredor.fecha_nacimiento || '',
      'EQUIPO': corredor.equipo || 'Independiente',
      'CATEGORIA': corredor.categoria || corredor.variant_title || '',
      'SEDE': corredor.product_title || '',
      'EMERGENCIA NOMBRE': corredor.emergencia_nombre || '',
      'EMERGENCIA TEL': corredor.emergencia_telefono || '',
      'QR_CODE': checkInCode,
      'CHECK_IN': 'NO',
      'CHECK_IN_TIME': '',
      'JERSEY': jerseyTalla,
      'PAGO': orderTotal > 0 ? 'shopify' : 'patrocinado',
      'TOTAL PAGO': orderTotal > 0 ? `$${Math.round(orderTotal / (totalCorredores || 1))}` : '$0',
      'TIPO DE SANGRE': corredor.tipo_sangre || ''
    });

    console.log(`✅ Guardado en hoja ${sheetName}`);
    return { success: true, sheet: sheetName };

  } catch (error) {
    console.error('❌ Error guardando en Sheets:', error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR DE EMAIL HTML
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Genera el HTML del email de confirmación
 *
 * Incluye:
 * - Header con logo
 * - Datos del corredor
 * - Código QR de check-in
 * - Boleto de rifa FOX 40
 * - Información del evento
 * - Patrocinadores
 *
 * @param {Object} corredor - Datos del corredor
 * @param {string} orderNumber - Número de orden
 * @param {string} sede - Nombre de la sede
 * @param {string} checkInCode - Código de check-in
 * @param {string} raffleNumber - Número de boleto de rifa
 * @returns {string} HTML del email
 */
function generateEmailHTML(corredor, orderNumber, sede, checkInCode, raffleNumber, runnerNumber) {
  // Datos del corredor
  const nombre = corredor.nombre || 'Corredor';
  const primerNombre = nombre.split(' ')[0];
  const categoria = corredor.categoria || corredor.variant_title || 'N/A';
  const sedeNombre = sede || corredor.product_title || 'DHMEXRACES 2026';

  // URL del QR
  const qrUrl = `${ASSETS.qrApiBase}?size=200x200&data=${encodeURIComponent(checkInCode)}&bgcolor=FFFFFF&color=000000`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media only screen and (max-width: 620px) {
      .mobile-full { width: 100% !important; }
      .mobile-padding { padding: 20px 16px !important; }
      .mobile-center { text-align: center !important; }
      .mobile-img { height: 80px !important; max-width: 100% !important; }
      .mobile-title { font-size: 28px !important; }
      .mobile-logo { height: 50px !important; }
      .mobile-logo-sm { height: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="mobile-full" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- ═══════════════════════════════════════════════ -->
          <!-- HEADER CON LOGO -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td align="center" style="padding-bottom: 40px; border-bottom: 2px solid #E42C2C;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important; border-radius: 12px;">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important; padding: 20px; border-radius: 12px;">
                    <img src="${ASSETS.logo}" alt="COPA SCOTT DHMEXRACES 2026" class="mobile-img" style="height: 110px; max-width: 100%; display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 40px;"></td></tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- MENSAJE PRINCIPAL -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td align="center" style="padding-bottom: 32px; text-align: center;">
              <h2 class="mobile-title" style="font-size: 36px; font-weight: 700; color: #FFFFFF; margin: 0 0 16px 0; letter-spacing: -0.02em; text-align: center;">
                ¡Felicidades ${primerNombre}!
              </h2>
              <p style="font-size: 18px; color: rgba(255,255,255,0.7); margin: 0; text-align: center;">
                Estás oficialmente inscrito en
              </p>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- CARD DE CATEGORÍA Y DATOS -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
              <!-- Badge de categoría -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <span style="display: inline-block; background: #E42C2C; color: #000000; font-weight: 700; font-size: 12px; padding: 8px 16px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.08em;">
                      ${categoria}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Sede -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Sede</p>
                    <p style="font-size: 20px; color: #FFFFFF; margin: 0; font-weight: 600;">${sedeNombre}</p>
                  </td>
                </tr>
              </table>

              <!-- Datos del corredor -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Nombre</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${nombre}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Fecha de Nacimiento</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.fecha_nacimiento || 'N/A'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Equipo</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.equipo || 'Independiente'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.email}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Teléfono</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.telefono || 'N/A'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Contacto Emergencia</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.emergencia_nombre || 'N/A'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Tel. Emergencia</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #FFFFFF; font-weight: 600; font-size: 14px;">${corredor.emergencia_telefono || 'N/A'}</span>
                  </td>
                </tr>
                ${corredor.talla_playera ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Talla de Playera</span>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: right;">
                    <span style="color: #22C55E; font-weight: 600; font-size: 14px;">${corredor.talla_playera}</span>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Confirmación</span>
                  </td>
                  <td style="padding: 12px 0; text-align: right;">
                    <span style="color: #E42C2C; font-weight: 700; font-size: 14px;">#${orderNumber}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 32px;"></td></tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- QR CODE CHECK-IN -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(228,44,44,0.1) 0%, rgba(0,0,0,0.3) 100%); border: 2px solid #E42C2C; border-radius: 16px; padding: 32px; text-align: center;">
              <h3 style="color: #E42C2C; font-size: 14px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.15em;">
                TU PASE DE CHECK-IN
              </h3>
              <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 24px 0;">
                Presenta este código QR el día del evento
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; display: inline-block;">
                      <img src="${qrUrl}" alt="QR Check-in" style="width: 180px; height: 180px; display: block;">
                    </div>
                  </td>
                </tr>
              </table>
              <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 20px 0 8px 0; font-family: monospace; letter-spacing: 0.1em;">
                ${checkInCode}
              </p>
              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                Guarda este correo o toma screenshot del QR
              </p>
            </td>
          </tr>

          <tr><td style="height: 32px;"></td></tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- NUMERO DE CORREDOR (solo si tiene número) -->
          <!-- ═══════════════════════════════════════════════ -->
          ${runnerNumber ? `
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; border: 2px solid #E42C2C;">
                <tr>
                  <td style="background: linear-gradient(135deg, #E42C2C 0%, #B91C1C 100%); padding: 12px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: rgba(0,0,0,0.6); font-size: 8px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.15em;">Copa Scott DHMEXRACES 2026</p>
                          <p style="color: #000000; font-size: 18px; font-weight: 800; margin: 4px 0 0 0; letter-spacing: 0.02em;">NUMERO DE CORREDOR</p>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <div style="background: #000000; border-radius: 6px; padding: 6px 10px; display: inline-block;">
                            <img src="${ASSETS.logo}" alt="DHMEXRACES" style="height: 20px; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0; height: 4px; background: repeating-linear-gradient(90deg, #E42C2C 0px, #E42C2C 10px, transparent 10px, transparent 20px);"></td>
                </tr>
                <tr>
                  <td style="padding: 28px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <p style="color: rgba(255,255,255,0.4); font-size: 9px; font-weight: 600; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.15em;">Categoría</p>
                          <div style="display: inline-block; background: rgba(228,44,44,0.15); border: 1px solid rgba(228,44,44,0.3); border-radius: 6px; padding: 4px 14px; margin-bottom: 20px;">
                            <p style="color: #E42C2C; font-size: 13px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">${categoria}</p>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p style="color: rgba(255,255,255,0.5); font-size: 9px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.15em;">Tu Número de Corredor</p>
                          <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td style="background: linear-gradient(180deg, #E42C2C 0%, #B91C1C 100%); border-radius: 14px; padding: 4px;">
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="background: #000000; border-radius: 11px; padding: 16px 40px;">
                                      <p style="font-family: 'Courier New', monospace; font-size: 52px; font-weight: 900; color: #E42C2C; margin: 0; letter-spacing: 0.15em; text-shadow: 0 0 20px rgba(228,44,44,0.5); line-height: 1;">${runnerNumber}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                          <p style="color: #FFFFFF; font-size: 15px; font-weight: 700; margin: 16px 0 4px 0; letter-spacing: 0.02em;">${nombre}</p>
                          <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 0; font-style: italic;">Este número es tu identificador oficial en la competencia</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background: rgba(228,44,44,0.05); border-top: 1px solid rgba(228,44,44,0.2); padding: 12px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: rgba(255,255,255,0.5); font-size: 9px; margin: 0; line-height: 1.4;">${sedeNombre}<br><strong style="color: #E42C2C;">Copa Scott DHMEXRACES 2026</strong></p>
                        </td>
                        <td align="right">
                          <div style="background: #FFFFFF; border-radius: 5px; padding: 5px 8px; display: inline-block;">
                            <img src="${ASSETS.logo}" alt="DHMEXRACES" style="height: 22px; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 32px;"></td></tr>
          ` : ''}

          <!-- ═══════════════════════════════════════════════ -->
          <!-- BOLETO DE RIFA FOX 40 (solo si tiene boleto) -->
          <!-- ═══════════════════════════════════════════════ -->
          ${raffleNumber ? `
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; border: 2px solid #FF6B00;">
                <!-- Header del ticket -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF6B00 0%, #E55A00 100%); padding: 12px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: #000000; font-size: 8px; font-weight: 700; margin: 0; text-transform: uppercase; letter-spacing: 0.15em; opacity: 0.8;">
                            Copa Scott DHMEXRACES 2026
                          </p>
                          <p style="color: #000000; font-size: 18px; font-weight: 800; margin: 4px 0 0 0; letter-spacing: 0.02em;">
                            RIFA FOX 40
                          </p>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <div style="background: #000000; border-radius: 6px; padding: 6px 10px; display: inline-block;">
                            <img src="${ASSETS.foxLogo}" alt="FOX" style="height: 20px; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Línea decorativa -->
                <tr>
                  <td style="padding: 0; height: 4px; background: repeating-linear-gradient(90deg, #FF6B00 0px, #FF6B00 10px, transparent 10px, transparent 20px);"></td>
                </tr>
                <!-- Cuerpo del ticket -->
                <tr>
                  <td style="padding: 20px 20px 20px 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="100" align="left" style="vertical-align: middle; padding-right: 12px;">
                          <img src="${ASSETS.fox40Image}" alt="${RAFFLE_CONFIG.prize}" style="height: 220px; display: block;">
                        </td>
                        <td style="vertical-align: middle;" align="left">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="left" style="padding-bottom: 16px;">
                                <p style="color: #FF6B00; font-size: 10px; font-weight: 700; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.1em;">
                                  Premio
                                </p>
                                <p style="color: #FFFFFF; font-size: 17px; font-weight: 700; margin: 0; line-height: 1.2;">
                                  ${RAFFLE_CONFIG.prize}
                                </p>
                                <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 6px 0 0 0;">
                                  Valor: ${RAFFLE_CONFIG.prizeValue}
                                </p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 0 0 16px 0;">
                                <div style="border-top: 1px dashed rgba(255,107,0,0.3); width: 100%;"></div>
                              </td>
                            </tr>
                            <tr>
                              <td align="left">
                                <p style="color: rgba(255,255,255,0.5); font-size: 9px; font-weight: 600; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.15em;">
                                  Tu Número de la Suerte
                                </p>
                                <table cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="background: linear-gradient(180deg, #FF6B00 0%, #E55A00 100%); border-radius: 10px; padding: 3px;">
                                      <table cellpadding="0" cellspacing="0">
                                        <tr>
                                          <td style="background: #000000; border-radius: 8px; padding: 12px 24px;">
                                            <p style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #FF6B00; margin: 0; letter-spacing: 0.12em; text-shadow: 0 0 15px rgba(255,107,0,0.5);">
                                              ${raffleNumber}
                                            </p>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                                <p style="color: rgba(255,255,255,0.4); font-size: 10px; margin: 10px 0 0 0; font-style: italic;">
                                  Conserva este boleto para el sorteo
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Footer del ticket -->
                <tr>
                  <td style="background: rgba(255,107,0,0.05); border-top: 1px solid rgba(255,107,0,0.2); padding: 12px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: rgba(255,255,255,0.5); font-size: 9px; margin: 0; line-height: 1.4;">
                            Sorteo en vivo al finalizar<br><strong style="color: #FF6B00;">${RAFFLE_CONFIG.drawDate}</strong>
                          </p>
                        </td>
                        <td align="right">
                          <div style="background: #FFFFFF; border-radius: 5px; padding: 5px 8px; display: inline-block;">
                            <img src="${ASSETS.logo}" alt="DHMEXRACES" style="height: 22px; display: block;">
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 32px;"></td></tr>
          ` : ''}

          <!-- ═══════════════════════════════════════════════ -->
          <!-- TU INSCRIPCIÓN INCLUYE -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="padding: 24px 0;">
              <h3 style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                Tu inscripción incluye
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #E42C2C; margin-right: 8px;">✓</span>
                    <strong>Puntos Copa Nacional</strong> - Acumula puntos para el ranking
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #E42C2C; margin-right: 8px;">✓</span>
                    <strong>Chip de Cronometraje</strong> - Tiempos oficiales en vivo
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #E42C2C; margin-right: 8px;">✓</span>
                    <strong>Acceso a Práctica y Carrera</strong> - Según horarios de tu categoría
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #E42C2C; margin-right: 8px;">✓</span>
                    <strong>Más de $100,000 MXN en premios por sede</strong>
                  </td>
                </tr>
                ${raffleNumber ? `
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #FF6B00; margin-right: 8px;">✓</span>
                    <strong>1 Boleto para Rifa FOX 40</strong> - Sorteo en vivo Sede Puebla
                  </td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          <!-- DESACTIVADO - Shimano ya no es patrocinador
          <tr>
            <td style="background: linear-gradient(135deg, rgba(0,102,179,0.15) 0%, rgba(0,102,179,0.05) 100%); border: 1px solid rgba(0,102,179,0.3); border-radius: 12px; padding: 24px; margin-bottom: 16px;">
              <h3 style="color: #0066B3; font-size: 14px; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em;">
                Mecánica Neutral Shimano
              </h3>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; line-height: 1.6;">
                Tu inscripción incluye acceso a la <strong style="color: #FFFFFF;">Mecánica Neutral</strong> operada por técnicos certificados de <strong style="color: #0066B3;">Shimano México</strong>. Un equipo de profesionales con las herramientas y experiencia para brindarte soporte técnico de clase mundial durante todo el evento.
              </p>
              <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0; font-style: italic;">
                Un respaldo que solo encuentras en DHMEXRACES.
              </p>
            </td>
          </tr>
          -->

          <tr><td style="height: 16px;"></td></tr>

          <!-- Recomendación -->
          <tr>
            <td style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px;">
              <h3 style="color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 700; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.1em;">
                Recomendación
              </h3>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0; line-height: 1.5;">
                Lleva tu bici en óptimas condiciones para disfrutar al máximo la experiencia en pista.
              </p>
            </td>
          </tr>

          <tr><td style="height: 16px;"></td></tr>

          <!-- Obligatorio -->
          <tr>
            <td style="background: rgba(228,44,44,0.08); border: 1px solid rgba(228,44,44,0.2); border-radius: 12px; padding: 20px;">
              <h3 style="color: #E42C2C; font-size: 12px; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.1em;">
                Obligatorio
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Casco full face</td></tr>
                <tr><td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Guantes</td></tr>
                <tr><td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Rodilleras</td></tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 24px;"></td></tr>

          <!-- Card de Instagram -->
          <tr>
            <td style="background: rgba(228,44,44,0.1); border: 1px solid rgba(228,44,44,0.3); border-radius: 12px; padding: 24px; text-align: center;">
              <p style="color: #FFFFFF; font-size: 15px; margin: 0 0 8px 0; font-weight: 600;">
                ¡Mantente pendiente!
              </p>
              <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
                Síguenos en Instagram para horarios, listas de salida y más información del evento.
              </p>
              <a href="https://www.instagram.com/dhmex_races" style="display: inline-block; padding: 14px 32px; background: #E42C2C; color: #000000; font-weight: 700; border-radius: 8px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; font-size: 14px;">
                @dhmex_races
              </a>
            </td>
          </tr>

          <tr><td style="height: 40px;"></td></tr>

          <!-- Mensaje final -->
          <tr>
            <td align="center" style="padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="color: #FFFFFF; font-size: 20px; margin: 0 0 8px 0; font-weight: 700;">
                ¡Te esperamos en la pista!
              </p>
              <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0;">
                DHMEXRACES es la copa de downhill más profesional de México
              </p>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- PATROCINADORES -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.08);">
              <h3 style="color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 600; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.15em; text-align: center;">
                Patrocinadores Oficiales
              </h3>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="background: #FFFFFF !important; background-color: #FFFFFF !important; border-radius: 12px; padding: 24px 16px;">
                    <!-- ORO -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td align="center" style="text-align: center;">
                          <img src="https://endhurorace.com/cdn/shop/files/SCOTTLOGO.png?v=1763690514&width=600" alt="Scott" class="mobile-logo" style="height: 65px; max-width: 45%; margin: 4px 8px; vertical-align: middle;">
                          <!-- DESACTIVADO - Shimano ya no es patrocinador
                          <img src="https://endhurorace.com/cdn/shop/files/SHIMANOLOGO.png?v=1763606659&width=600" alt="Shimano" class="mobile-logo" style="height: 40px; max-width: 45%; margin: 4px 8px; vertical-align: middle;">
                          -->
                        </td>
                      </tr>
                    </table>
                    <!-- PLATA -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                      <tr>
                        <td align="center" style="text-align: center;">
                          <img src="https://endhurorace.com/cdn/shop/files/SRAMLOGO.png?v=1763606698&width=500" alt="SRAM" style="height: 18px; max-width: 30%; margin: 4px 8px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/MOTULLOGO1.png?v=1763690656&width=500" alt="Motul" style="height: 30px; max-width: 30%; margin: 4px 8px; vertical-align: middle;">
                        </td>
                      </tr>
                    </table>
                    <!-- BRONCE -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="text-align: center; line-height: 2.2;">
                          <img src="https://endhurorace.com/cdn/shop/files/REDBULLLOGO1.png?v=1763606717&width=400" alt="Red Bull" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/SCHWALBELOGO.webp?v=1763690728&width=400" alt="Schwalbe" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/FOXLOGO.png?v=1763606761&width=400" alt="Fox" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/GIROLOGO.png?v=1763690436&width=400" alt="Giro" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/VITTORIALOGO.webp?v=1763690758&width=400" alt="Vittoria" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/ALPINELOGO.png?v=1763606851&width=400" alt="Alpine" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/RFLOGO.png?v=1763606866&width=400" alt="RF" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                          <img src="https://endhurorace.com/cdn/shop/files/SYNCROSSLOGO.png?v=1763606881&width=400" alt="Syncross" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 0 8px 0;">
                $530,000 MXN en premios • 5 sedes • 13 categorías
              </p>
              <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 0;">
                <a href="https://endhurorace.com" style="color: rgba(255,255,255,0.4); text-decoration: none;">endhurorace.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESADOR DE CORREDORES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Procesa un corredor individual: genera códigos, asigna rifa, guarda y envía email
 * INCLUYE PROTECCIÓN CONTRA DUPLICADOS
 *
 * @param {Object} corredor - Datos del corredor
 * @param {Object} order - Datos de la orden de Shopify
 * @param {string} orderDate - Fecha de la orden
 * @returns {Promise<Object>} Resultado del procesamiento
 */
async function processCorredor(corredor, order, orderDate) {
  const orderNumber = order.order_number || order.name;
  const result = {
    nombre: corredor.nombre,
    email: corredor.email,
    checkInCode: null,
    raffleNumber: null,
    runnerNumber: null,
    sheetResult: null,
    emailResult: null,
    skipped: false
  };

  try {
    // 1. Determinar la hoja/sede
    const sheetName = getSheetNameFromProduct(corredor.product_title);

    // 2. VERIFICAR SI YA EXISTE (protección contra webhooks duplicados)
    const existsCheck = await checkIfCorredorExists(orderNumber, corredor.email, corredor.nombre, corredor.categoria || corredor.variant_title, sheetName);

    if (existsCheck.exists) {
      console.log(`⚠️ DUPLICADO: Corredor ${corredor.nombre} (Orden ${orderNumber}) ya existe. QR: ${existsCheck.existingCode}`);
      result.skipped = true;
      result.checkInCode = existsCheck.existingCode;
      result.sheetResult = { success: true, skipped: true };
      result.emailResult = { status: 'skipped', reason: 'Duplicate - already processed' };

      // Buscar el boleto de rifa existente (solo si la orden NO es gratis)
      const orderTotal = parseFloat(order.total_price || '0');
      if (orderTotal > 0) {
        const raffleResult = await assignRaffleTicket(corredor, orderNumber, orderDate);
        result.raffleNumber = raffleResult.numero || '---';
      } else {
        result.raffleNumber = null;
      }

      // Buscar número de corredor existente
      const runnerResult = await assignRunnerNumber(corredor, orderNumber, orderDate, sheetName);
      result.runnerNumber = runnerResult.numero || null;

      return result;
    }

    // 3. Generar código de check-in (NUEVO)
    result.checkInCode = generateCheckInCode(sheetName);
    console.log(`🎫 Check-in: ${result.checkInCode}`);

    // 4. Asignar boleto de rifa (solo si la orden NO es gratis)
    const orderTotal = parseFloat(order.total_price || '0');
    if (orderTotal > 0) {
      const raffleResult = await assignRaffleTicket(corredor, orderNumber, orderDate);
      result.raffleNumber = raffleResult.numero || '---';
      console.log(`🎰 Rifa: ${result.raffleNumber}`);
    } else {
      result.raffleNumber = null;
      console.log(`🎰 Rifa: OMITIDA (orden gratis, total: $0)`);
    }

    // 5. Asignar número de corredor
    const runnerResult = await assignRunnerNumber(corredor, orderNumber, orderDate, sheetName);
    result.runnerNumber = runnerResult.numero || null;
    console.log(`🏁 Número corredor: ${result.runnerNumber || 'N/A'}`);

    // 6. Guardar en Google Sheets
    const totalCorredores = order._totalCorredores || 1;
    result.sheetResult = await saveToGoogleSheets(corredor, orderNumber, orderDate, result.checkInCode, orderTotal, totalCorredores);

    // Si fue skipped en el guardado (duplicado detectado ahí también), no enviar email
    if (result.sheetResult.skipped) {
      console.log(`⚠️ Corredor ${corredor.nombre} fue detectado como duplicado durante el guardado`);
      result.skipped = true;
      result.emailResult = { status: 'skipped', reason: 'Duplicate detected during save' };
      return result;
    }

    // 7. Enviar email (si tiene email y no es duplicado)
    if (!corredor.email) {
      console.log(`⚠️ Corredor sin email: ${corredor.nombre}`);
      result.emailResult = { status: 'skipped', reason: 'No email provided' };
      return result;
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: corredor.email,
      subject: `${EMAIL_CONFIG.subjectPrefix} - ${corredor.categoria || corredor.variant_title} | DHMEXRACES 2026`,
      html: generateEmailHTML(corredor, orderNumber, corredor.product_title, result.checkInCode, result.raffleNumber, result.runnerNumber),
    });

    if (error) {
      console.error(`❌ Error enviando email a ${corredor.email}:`, error);
      result.emailResult = { status: 'error', error: error.message };
    } else {
      console.log(`✅ Email enviado a ${corredor.email}`);
      result.emailResult = { status: 'sent', id: data.id };
    }

  } catch (error) {
    console.error(`❌ Error procesando corredor ${corredor.nombre}:`, error);
    result.emailResult = { status: 'error', error: error.message };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GESTIÓN AUTOMÁTICA DEL DESCUENTO DE JERSEY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ejecuta una query/mutation GraphQL en la Shopify Admin API
 * @param {string} query - Query o mutation GraphQL
 * @returns {Promise<Object>} Respuesta de la API
 */
function shopifyGraphQL(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });
    const options = {
      hostname: JERSEY_DISCOUNT_CONFIG.shop,
      port: 443,
      path: `/admin/api/${JERSEY_DISCOUNT_CONFIG.apiVersion}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': (process.env.SHOPIFY_ADMIN_TOKEN || '').trim(),
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Shopify response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Actualiza el descuento de jersey basándose en el conteo del Sheets
 *
 * 1. Cuenta inscritos pagados (PAGO ≠ "patrocinado") en la hoja de la sede
 * 2. Calcula jerseys restantes (máx 50 - pagados)
 * 3. Si restantes > 0: actualiza usesPerOrderLimit y asegura que esté activo
 * 4. Si restantes ≤ 0: desactiva el descuento
 *
 * @param {string} sheetName - Nombre de la hoja de la sede (ej: GUANAJUATO)
 * @returns {Promise<{success: boolean, remaining: number, action: string}>}
 */
async function updateJerseyDiscount(sheetName) {
  try {
    if (!process.env.SHOPIFY_ADMIN_TOKEN) {
      console.log('⚠️ SHOPIFY_ADMIN_TOKEN no configurado, omitiendo actualización de descuento');
      return { success: false, remaining: -1, action: 'skipped_no_token' };
    }

    console.log('🎽 Actualizando descuento de jersey...');

    // 1. Contar inscritos pagados desde Google Sheets
    const doc = await connectToGoogleSheets();
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      console.error(`❌ Hoja "${sheetName}" no encontrada para conteo de jersey`);
      return { success: false, remaining: -1, action: 'sheet_not_found' };
    }

    const rows = await sheet.getRows();
    const paidCount = rows.filter(row => {
      if (!row.NOMBRE || row.NOMBRE.trim() === '') return false;
      const pago = (row.PAGO || '').trim().toLowerCase();
      if (pago === 'patrocinado') return false;
      return true;
    }).length;

    const remaining = JERSEY_DISCOUNT_CONFIG.maxJerseys - paidCount;
    console.log(`   Pagados: ${paidCount} | Restantes: ${remaining}/${JERSEY_DISCOUNT_CONFIG.maxJerseys}`);

    // 2. Obtener estado actual del descuento
    const statusResult = await shopifyGraphQL(`{
      automaticDiscountNode(id: "${JERSEY_DISCOUNT_CONFIG.discountId}") {
        automaticDiscount {
          ... on DiscountAutomaticBxgy { status }
        }
      }
    }`);

    const currentStatus = statusResult?.data?.automaticDiscountNode?.automaticDiscount?.status;
    console.log(`   Estado actual del descuento: ${currentStatus}`);

    // 3. Actualizar según restantes
    if (remaining <= 0) {
      // Desactivar el descuento
      if (currentStatus === 'ACTIVE') {
        const deactivateResult = await shopifyGraphQL(`mutation {
          discountAutomaticDeactivate(id: "${JERSEY_DISCOUNT_CONFIG.discountId}") {
            userErrors { field message }
          }
        }`);

        const errors = deactivateResult?.data?.discountAutomaticDeactivate?.userErrors || [];
        if (errors.length > 0) {
          console.error('❌ Error desactivando descuento:', JSON.stringify(errors));
          return { success: false, remaining, action: 'deactivate_error' };
        }

        console.log('🔴 Descuento DESACTIVADO - Se alcanzó el límite de jerseys');
      } else {
        console.log('🔴 Descuento ya estaba inactivo');
      }

      return { success: true, remaining: 0, action: 'deactivated' };

    } else {
      // Actualizar usesPerOrderLimit con los restantes
      const updateResult = await shopifyGraphQL(`mutation {
        discountAutomaticBxgyUpdate(
          id: "${JERSEY_DISCOUNT_CONFIG.discountId}"
          automaticBxgyDiscount: { usesPerOrderLimit: "${remaining}" }
        ) {
          userErrors { field message }
        }
      }`);

      const updateErrors = updateResult?.data?.discountAutomaticBxgyUpdate?.userErrors || [];
      if (updateErrors.length > 0) {
        console.error('❌ Error actualizando descuento:', JSON.stringify(updateErrors));
        return { success: false, remaining, action: 'update_error' };
      }

      // Si estaba desactivado, reactivarlo
      if (currentStatus !== 'ACTIVE') {
        await shopifyGraphQL(`mutation {
          discountAutomaticActivate(id: "${JERSEY_DISCOUNT_CONFIG.discountId}") {
            userErrors { field message }
          }
        }`);
        console.log('🟢 Descuento REACTIVADO');
      }

      console.log(`🟢 Descuento actualizado: máximo ${remaining} jerseys por orden`);
      return { success: true, remaining, action: 'updated' };
    }

  } catch (error) {
    console.error('❌ Error actualizando descuento de jersey:', error.message);
    return { success: false, remaining: -1, action: 'error', error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL DEL WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handler principal del webhook de Shopify
 *
 * Recibe órdenes de Shopify y procesa las inscripciones:
 * - Valida la request
 * - Extrae los datos de registration_data
 * - Procesa cada corredor
 * - Retorna el resultado
 *
 * @param {Object} req - Request de Vercel
 * @param {Object} res - Response de Vercel
 */
module.exports = async function handler(req, res) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 WEBHOOK DHMEXRACES - ORDEN RECIBIDA');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`📨 Method: ${req.method}`);

  // Validar método
  if (req.method !== 'POST') {
    console.log('❌ Método no permitido');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;

    // Log de la orden
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📦 DATOS DE LA ORDEN');
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`   ID: ${order.id}`);
    console.log(`   Número: ${order.order_number || order.name}`);
    console.log(`   Email: ${order.email || order.customer?.email || 'N/A'}`);
    console.log(`   Items: ${order.line_items?.length || 0}`);

    // Log de line items
    if (order.line_items) {
      order.line_items.forEach((item, i) => {
        console.log(`   └─ ${i + 1}. ${item.title} (x${item.quantity}) - ${item.variant_title || 'N/A'}`);
      });
    }

    // Buscar registration_data
    const noteAttributes = order.note_attributes || [];
    const registrationAttr = noteAttributes.find(attr => attr.name === 'registration_data');

    if (!registrationAttr || !registrationAttr.value) {
      console.log('ℹ️ Orden sin datos de inscripción (orden estándar)');
      return res.status(200).json({
        success: true,
        message: 'Orden estándar sin inscripciones',
        orderNumber: order.order_number
      });
    }

    // Parsear registration_data
    console.log('───────────────────────────────────────────────────────────────');
    console.log('📋 DATOS DE INSCRIPCIÓN');
    console.log('───────────────────────────────────────────────────────────────');

    let registrationData;
    try {
      registrationData = JSON.parse(registrationAttr.value);
    } catch (parseError) {
      console.error('❌ Error parseando registration_data:', parseError);
      return res.status(400).json({
        error: 'Invalid registration_data JSON',
        details: parseError.message
      });
    }

    const corredores = registrationData.registrations || [];
    console.log(`   Total corredores: ${corredores.length}`);

    if (corredores.length === 0) {
      console.log('ℹ️ No hay corredores en registration_data');
      return res.status(200).json({
        success: true,
        message: 'No hay corredores en la inscripción'
      });
    }

    // Procesar cada corredor
    console.log('───────────────────────────────────────────────────────────────');
    console.log('⚙️ PROCESANDO CORREDORES');
    console.log('───────────────────────────────────────────────────────────────');

    const orderDate = order.created_at || new Date().toISOString();
    const results = [];

    order._totalCorredores = corredores.length;
    for (let i = 0; i < corredores.length; i++) {
      const corredor = corredores[i];
      console.log(`\n👤 Corredor ${i + 1}/${corredores.length}: ${corredor.nombre}`);
      console.log(`   Categoría: ${corredor.categoria}`);
      console.log(`   Email: ${corredor.email || 'N/A'}`);
      console.log(`   Talla Playera: ${corredor.talla_playera || 'NO ESPECIFICADA'}`);
      console.log(`   Producto: ${corredor.product_title || 'N/A'}`);

      const result = await processCorredor(corredor, order, orderDate);
      results.push(result);
    }

    // Resumen
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN');
    console.log('═══════════════════════════════════════════════════════════════');

    const emailsSent = results.filter(r => r.emailResult?.status === 'sent').length;
    const emailsSkipped = results.filter(r => r.emailResult?.status === 'skipped').length;
    const emailsError = results.filter(r => r.emailResult?.status === 'error').length;
    const sheetsSuccess = results.filter(r => r.sheetResult?.success && !r.sheetResult?.skipped).length;
    const duplicatesDetected = results.filter(r => r.skipped).length;

    console.log(`   ✅ Emails enviados: ${emailsSent}/${corredores.length}`);
    console.log(`   ⏭️ Emails omitidos: ${emailsSkipped}`);
    console.log(`   ❌ Emails con error: ${emailsError}`);
    console.log(`   📊 Guardados en Sheets: ${sheetsSuccess}/${corredores.length}`);
    console.log(`   ⚠️ Duplicados detectados: ${duplicatesDetected}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Actualizar descuento de jersey basándose en el conteo del Sheets
    let discountResult = null;
    if (corredores.length > 0 && sheetsSuccess > 0) {
      const sheetName = getSheetNameFromProduct(corredores[0].product_title);
      discountResult = await updateJerseyDiscount(sheetName);
      console.log(`🎽 Descuento: ${discountResult.action} (restantes: ${discountResult.remaining})`);
    }

    // Responder al webhook primero (Shopify espera respuesta rápida)
    res.status(200).json({
      success: true,
      orderNumber: order.order_number || order.name,
      totalRunners: corredores.length,
      emailsSent,
      emailsSkipped,
      emailsError,
      savedToSheets: sheetsSuccess,
      duplicatesDetected,
      discountUpdate: discountResult,
      results
    });

    // Triggers post-respuesta (Vercel mantiene la función viva hasta que el async handler termine)
    function triggerEndpoint(url, timeoutMs = 20000) {
      return new Promise((resolve) => {
        const req = https.get(url, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => resolve({ ok: true, data }));
        });
        req.on('error', (err) => resolve({ ok: false, error: err.message }));
        req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      });
    }

    try {
      // Format sheets (solo filas nuevas)
      if (corredores.length > 0) {
        const sede = getSheetNameFromProduct(corredores[0].product_title).toLowerCase();
        console.log('🎨 Format sheets (last rows) starting...');
        const formatResult = await triggerEndpoint(`https://dhmexraces-webhooks.vercel.app/api/format-sheets?sede=${sede}&last=${corredores.length}`);
        console.log('🎨 Format sheets:', formatResult.ok ? 'OK' : formatResult.error);
      }
      // sync-finanzas se ejecuta solo via CRON diario, no en cada inscripción
    } catch (triggerError) {
      console.error('Error en triggers post-respuesta:', triggerError.message);
    }

  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('❌ ERROR GENERAL EN WEBHOOK');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(error);

    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
