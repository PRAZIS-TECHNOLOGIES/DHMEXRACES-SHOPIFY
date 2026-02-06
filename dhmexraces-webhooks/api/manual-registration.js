/**
 * DHMEXRACES - Manual Registration API
 * Endpoint para inscripciones manuales (pagos por depósito/transferencia)
 */

const { GoogleSpreadsheet } = require('google-spreadsheet');
const { Resend } = require('resend');

// Configuración
const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const ADMIN_PASSWORD = '15211521Gg';

const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de email
const EMAIL_CONFIG = {
  from: 'DHMEXRACES <noreply@endhurorace.com>',
  subjectPrefix: '✅ Inscripción Confirmada'
};

// Configuración de la rifa
const RAFFLE_CONFIG = {
  sheetName: 'RIFA',
  prize: 'FOX 40 Factory GRIP 2',
  prizeValue: '$50,000 MXN',
  drawDate: 'Sede Puebla - 22 Marzo 2026'
};

// URLs de recursos
const ASSETS = {
  logo: 'https://endhurorace.com/cdn/shop/files/dhmexscottshimanologo.png?v=1763690918&width=600',
  foxLogo: 'https://endhurorace.com/cdn/shop/files/FOXLOGO.png?v=1763606761&width=400',
  fox40Image: 'https://cdn.shopify.com/s/files/1/0691/9556/3244/files/910_21_280_40_MY25_F_Orange_GripX2_Front.webp?v=1768319279',
  qrApiBase: 'https://api.qrserver.com/v1/create-qr-code/'
};

// Mapeo de sedes
const SEDE_TO_SHEET = {
  'guanajuato': 'GUANAJUATO',
  'puebla': 'PUEBLA',
  'guadalajara': 'GUADALAJARA',
  'ixtapan': 'IXTAPAN',
  'taxco': 'TAXCO'
};

const SEDE_CODES = {
  'guanajuato': 'GTO',
  'puebla': 'PUE',
  'guadalajara': 'GDL',
  'ixtapan': 'IXT',
  'taxco': 'TAX'
};

// Funciones utilitarias
async function connectToGoogleSheets() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: privateKey,
  });
  await doc.loadInfo();
  return doc;
}

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateCheckInCode(sede) {
  const sedeCode = SEDE_CODES[sede.toLowerCase()] || 'DHM';
  const randomCode = generateRandomCode(8);
  return `DHMEX-${sedeCode}-${randomCode}`;
}

function formatDateMX(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function getNextManualOrderNumber(doc) {
  let maxNumber = 0;
  for (const sheetName of Object.values(SEDE_TO_SHEET)) {
    const sheet = doc.sheetsByTitle[sheetName];
    if (sheet) {
      const rows = await sheet.getRows();
      for (const row of rows) {
        const orden = row.ORDEN || '';
        if (orden.startsWith('MANUAL-')) {
          const num = parseInt(orden.replace('MANUAL-', ''), 10);
          if (num > maxNumber) maxNumber = num;
        }
      }
    }
  }
  return `MANUAL-${String(maxNumber + 1).padStart(3, '0')}`;
}

async function assignRaffleTicket(doc, corredor, orderNumber, orderDate) {
  try {
    const sheet = doc.sheetsByTitle[RAFFLE_CONFIG.sheetName];
    if (!sheet) return { success: false, numero: null };

    const rows = await sheet.getRows();

    const existingTicket = rows.find(row =>
      row.OrderID === String(orderNumber) &&
      row.Email?.toLowerCase() === corredor.email?.toLowerCase()
    );

    if (existingTicket) {
      return { success: true, numero: existingTicket.Numero, skipped: true };
    }

    const availableTicket = rows.find(row => row.Ocupado === '0' || row.Ocupado === 0);

    if (!availableTicket) {
      return { success: false, numero: null, error: 'No hay boletos disponibles' };
    }

    const ticketNumber = availableTicket.Numero;
    availableTicket.Ocupado = '1';
    availableTicket.OrderID = orderNumber;
    availableTicket.Email = corredor.email || '';
    availableTicket.Nombre = corredor.nombre || '';
    availableTicket.Fecha = formatDateMX(orderDate);

    await availableTicket.save();

    return { success: true, numero: ticketNumber };
  } catch (error) {
    console.error('Error asignando rifa:', error);
    return { success: false, numero: null, error: error.message };
  }
}

async function saveToGoogleSheets(doc, corredor, orderNumber, orderDate, checkInCode, sheetName) {
  try {
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      return { success: false, error: `Hoja ${sheetName} no encontrada` };
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(row =>
      row.ORDEN === String(orderNumber) &&
      row.EMAIL?.toLowerCase() === corredor.email?.toLowerCase()
    );

    if (existingRow) {
      return { success: true, skipped: true, existingCode: existingRow.QR_CODE };
    }

    const jerseyTalla = corredor.talla_playera ? `Talla ${corredor.talla_playera}` : '';
    const sedeName = corredor.sede.charAt(0).toUpperCase() + corredor.sede.slice(1);

    // Determinar valor de PAGO según tipo_pago
    const pagoValue = corredor.tipo_pago === 'patrocinado' ? 'patrocinado' : 'deposito 1500';

    await sheet.addRow({
      'FECHA': formatDateMX(orderDate),
      'ORDEN': orderNumber,
      'NOMBRE': corredor.nombre || '',
      'EMAIL': corredor.email || '',
      'TELEFONO': corredor.telefono || '',
      'FECHA DE NACIMIENTO': corredor.fecha_nacimiento || '',
      'EQUIPO': corredor.equipo || 'Independiente',
      'CATEGORIA': corredor.categoria || '',
      'SEDE': `Inscripción Sede - ${sedeName}`,
      'EMERGENCIA NOMBRE': corredor.emergencia_nombre || '',
      'EMERGENCIA TEL': corredor.emergencia_telefono || '',
      'QR_CODE': checkInCode,
      'CHECK_IN': 'NO',
      'CHECK_IN_TIME': '',
      'JERSEY': jerseyTalla,
      'PAGO': pagoValue
    });

    return { success: true, sheet: sheetName };
  } catch (error) {
    console.error('Error guardando en Sheets:', error);
    return { success: false, error: error.message };
  }
}

function generateEmailHTML(corredor, orderNumber, sede, checkInCode, raffleNumber) {
  const nombre = corredor.nombre || 'Corredor';
  const primerNombre = nombre.split(' ')[0];
  const categoria = corredor.categoria || 'N/A';
  const sedeName = sede.charAt(0).toUpperCase() + sede.slice(1);
  const sedeNombre = `Inscripción Sede - ${sedeName}`;

  const qrUrl = `${ASSETS.qrApiBase}?size=200x200&data=${encodeURIComponent(checkInCode)}&bgcolor=FFFFFF&color=000000`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="mobile-full" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- HEADER CON LOGO -->
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

          <!-- MENSAJE PRINCIPAL -->
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

          <!-- CARD DE CATEGORÍA Y DATOS -->
          <tr>
            <td style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <span style="display: inline-block; background: #E42C2C; color: #000000; font-weight: 700; font-size: 12px; padding: 8px 16px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.08em;">
                      ${categoria}
                    </span>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                    <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Sede</p>
                    <p style="font-size: 20px; color: #FFFFFF; margin: 0; font-weight: 600;">${sedeNombre}</p>
                  </td>
                </tr>
              </table>

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

          <!-- QR CODE CHECK-IN -->
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

          <!-- BOLETO DE RIFA FOX 40 -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; overflow: hidden; border: 2px solid #FF6B00;">
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
                <tr>
                  <td style="padding: 0; height: 4px; background: repeating-linear-gradient(90deg, #FF6B00 0px, #FF6B00 10px, transparent 10px, transparent 20px);"></td>
                </tr>
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

          <!-- TU INSCRIPCIÓN INCLUYE -->
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
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #FF6B00; margin-right: 8px;">✓</span>
                    <strong>1 Boleto para Rifa FOX 40</strong> - Sorteo en vivo Sede Puebla
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MECÁNICA NEUTRAL SHIMANO -->
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

          <!-- PATROCINADORES -->
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
                          <img src="https://endhurorace.com/cdn/shop/files/SHIMANOLOGO.png?v=1763606659&width=600" alt="Shimano" class="mobile-logo" style="height: 40px; max-width: 45%; margin: 4px 8px; vertical-align: middle;">
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
                          <img src="https://endhurorace.com/cdn/shop/files/LAZERLOGO.png?v=1763690460&width=400" alt="Lazer" class="mobile-logo-sm" style="height: 18px; max-width: 20%; margin: 4px 6px; vertical-align: middle;">
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

// Handler principal
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password, corredor } = req.body;

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    if (!corredor || !corredor.nombre || !corredor.email || !corredor.sede || !corredor.categoria) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    console.log('=== INSCRIPCIÓN MANUAL ===');
    console.log(`Corredor: ${corredor.nombre}`);
    console.log(`Sede: ${corredor.sede}`);
    console.log(`Categoría: ${corredor.categoria}`);

    const doc = await connectToGoogleSheets();
    const orderNumber = await getNextManualOrderNumber(doc);
    const orderDate = new Date().toISOString();
    const sheetName = SEDE_TO_SHEET[corredor.sede.toLowerCase()];
    const checkInCode = generateCheckInCode(corredor.sede);

    console.log(`Orden: ${orderNumber}`);
    console.log(`QR: ${checkInCode}`);

    const raffleResult = await assignRaffleTicket(doc, corredor, orderNumber, orderDate);
    const raffleNumber = raffleResult.numero;
    console.log(`Rifa: #${raffleNumber || 'N/A'}`);

    const saveResult = await saveToGoogleSheets(doc, corredor, orderNumber, orderDate, checkInCode, sheetName);

    if (!saveResult.success) {
      return res.status(500).json({ error: saveResult.error || 'Error guardando en Sheets' });
    }

    // Enviar email
    let emailResult = { status: 'not_sent' };
    if (corredor.email) {
      try {
        const { data, error } = await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: corredor.email,
          subject: `${EMAIL_CONFIG.subjectPrefix} - ${corredor.categoria} | DHMEXRACES 2026`,
          html: generateEmailHTML(corredor, orderNumber, corredor.sede, checkInCode, raffleNumber),
        });

        if (error) {
          console.error('Error email:', error);
          emailResult = { status: 'error', error: error.message };
        } else {
          console.log('✅ Email enviado');
          emailResult = { status: 'sent', id: data.id };
        }
      } catch (emailError) {
        emailResult = { status: 'error', error: emailError.message };
      }
    }

    console.log('=== INSCRIPCIÓN COMPLETADA ===\n');

    return res.status(200).json({
      success: true,
      orderNumber,
      checkInCode,
      raffleNumber,
      email: emailResult,
      corredor: {
        nombre: corredor.nombre,
        email: corredor.email,
        categoria: corredor.categoria,
        sede: corredor.sede
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
