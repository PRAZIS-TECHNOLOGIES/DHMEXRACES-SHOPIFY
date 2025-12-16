const { Resend } = require('resend');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// Inicializar Resend con API Key desde variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

// ID del Google Spreadsheet
const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

// Función para generar código único de check-in
function generateCheckInCode(sede) {
  const sedeCode = {
    'GUANAJUATO': 'GTO',
    'PUEBLA': 'PUE',
    'GUADALAJARA': 'GDL',
    'IXTAPAN': 'IXT',
    'TAXCO': 'TAX'
  }[sede] || 'DHM';

  // Generar código alfanumérico único (8 caracteres)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 0, 1 para evitar confusión
  let uniqueId = '';
  for (let i = 0; i < 8; i++) {
    uniqueId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `DHMEX-${sedeCode}-${uniqueId}`;
}

// Función para determinar la hoja según el producto
function getSheetNameFromProduct(productTitle) {
  const title = (productTitle || '').toLowerCase();

  if (title.includes('guanajuato')) return 'GUANAJUATO';
  if (title.includes('puebla')) return 'PUEBLA';
  if (title.includes('guadalajara')) return 'GUADALAJARA';
  if (title.includes('ixtapan')) return 'IXTAPAN';
  if (title.includes('taxco')) return 'TAXCO';

  return 'GUANAJUATO'; // Default
}

// Función para guardar en Google Sheets (v3 syntax)
async function saveToGoogleSheets(corredor, orderNumber, orderDate, checkInCode) {
  try {
    // Verificar variables de entorno
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.error('❌ Variables de Google no configuradas');
      return { success: false, error: 'Missing Google credentials' };
    }

    console.log('📊 Conectando a Google Sheets...');

    // Procesar la private key
    let privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // Conectar usando v3 syntax
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    console.log('📊 Conectado a:', doc.title);

    // Determinar la hoja según la sede
    const sheetName = getSheetNameFromProduct(corredor.product_title);
    console.log(`📊 Sede detectada: ${sheetName}`);

    // Obtener la hoja por nombre
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      console.error(`❌ Hoja "${sheetName}" no encontrada`);
      return { success: false, error: `Sheet "${sheetName}" not found` };
    }

    // Agregar fila con los datos del corredor (incluyendo código QR y check-in)
    await sheet.addRow({
      'FECHA': new Date(orderDate).toLocaleDateString('es-MX'),
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
      'CHECK_IN_TIME': ''
    });

    console.log(`📊 Guardado en hoja ${sheetName}: ${corredor.nombre} - QR: ${checkInCode}`);
    return { success: true, sheet: sheetName, checkInCode: checkInCode };
  } catch (error) {
    console.error('❌ Error guardando en Sheets:', error.message);
    return { success: false, error: error.message };
  }
}

// Plantilla HTML del email - Estética DHMEXRACES (negro, rojo #E42C2C, azul shimano #0066B3)
function generateEmailHTML(corredor, orderNumber, sede, checkInCode) {
  const nombre = corredor.nombre || 'Corredor';
  const primerNombre = nombre.split(' ')[0];
  const categoria = corredor.categoria || corredor.variant_title || 'N/A';
  const sedeNombre = sede || corredor.product_title || 'DHMEXRACES 2026';

  // URL del QR - usa API pública para generar la imagen del QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInCode)}&bgcolor=FFFFFF&color=000000`;

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

          <!-- Header con Logo Oficial -->
          <tr>
            <td align="center" style="padding-bottom: 40px; border-bottom: 2px solid #E42C2C;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important; border-radius: 12px;">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important; padding: 20px; border-radius: 12px;">
                    <img src="https://endhurorace.com/cdn/shop/files/dhmexscottshimanologo.png?v=1763690918&width=600" alt="COPA SCOTT DHMEXRACES 2026" class="mobile-img" style="height: 110px; max-width: 100%; display: block; margin: 0 auto;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height: 40px;"></td></tr>

          <!-- Mensaje principal -->
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

          <!-- Card de Categoría -->
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
                    <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">
                      Sede
                    </p>
                    <p style="font-size: 20px; color: #FFFFFF; margin: 0; font-weight: 600;">
                      ${sedeNombre}
                    </p>
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

              <!-- QR Code Image -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="background: #FFFFFF; border-radius: 12px; padding: 16px; display: inline-block;">
                      <img src="${qrUrl}" alt="QR Check-in" style="width: 180px; height: 180px; display: block;">
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Código legible -->
              <p style="color: #FFFFFF; font-size: 18px; font-weight: 700; margin: 20px 0 8px 0; font-family: monospace; letter-spacing: 0.1em;">
                ${checkInCode}
              </p>
              <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0;">
                Guarda este correo o toma screenshot del QR
              </p>
            </td>
          </tr>

          <tr><td style="height: 32px;"></td></tr>

          <!-- Tu inscripción incluye -->
          <tr>
            <td style="padding: 24px 0;">
              <h3 style="color: #FFFFFF; font-size: 14px; font-weight: 700; margin: 0 0 20px 0; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px;">
                Tu inscripción incluye
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;">
                    <span style="color: #E42C2C; margin-right: 8px;">✓</span>
                    <strong>Puntos Campeonato Nacional</strong> - Acumula puntos para el ranking
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
              </table>
            </td>
          </tr>

          <!-- Mecánica Neutral Shimano -->
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
                <tr>
                  <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Casco full face</td>
                </tr>
                <tr>
                  <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Guantes</td>
                </tr>
                <tr>
                  <td style="color: rgba(255,255,255,0.8); font-size: 14px; padding: 4px 0;">• Rodilleras</td>
                </tr>
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
              <a href="https://www.instagram.com/dhmex_races"
                 style="display: inline-block; padding: 14px 32px; background: #E42C2C; color: #000000; font-weight: 700; border-radius: 8px; text-decoration: none; text-transform: uppercase; letter-spacing: 0.05em; font-size: 14px;">
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
                El campeonato nacional de downhill MTB más grande de México
              </p>
            </td>
          </tr>

          <!-- Patrocinadores -->
          <tr>
            <td style="padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.08);">
              <h3 style="color: rgba(255,255,255,0.4); font-size: 11px; font-weight: 600; margin: 0 0 24px 0; text-transform: uppercase; letter-spacing: 0.15em; text-align: center;">
                Patrocinadores Oficiales
              </h3>

              <!-- Recuadro blanco para logos -->
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

// Handler principal del webhook
module.exports = async function handler(req, res) {
  console.log('🚀 Webhook recibido - Method:', req.method);

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const order = req.body;

    console.log('═══════════════════════════════════════════════');
    console.log('📦 NUEVO PEDIDO RECIBIDO');
    console.log('═══════════════════════════════════════════════');
    console.log('📦 Order ID:', order.id);
    console.log('📦 Order Number:', order.order_number || order.name);
    console.log('📦 Customer Email:', order.email || order.customer?.email || 'N/A');
    console.log('📦 Total Line Items:', order.line_items?.length || 0);

    // Log de line items para ver cantidades
    if (order.line_items) {
      order.line_items.forEach((item, i) => {
        console.log(`   📦 Item ${i+1}: ${item.title} (Qty: ${item.quantity}) - ${item.variant_title || 'N/A'}`);
      });
    }

    console.log('📦 Note Attributes Count:', (order.note_attributes || []).length);
    console.log('📦 Note Attributes (raw):', JSON.stringify(order.note_attributes || [], null, 2));

    // Buscar registration_data en note_attributes
    const noteAttributes = order.note_attributes || [];
    const registrationAttr = noteAttributes.find(
      attr => attr.name === 'registration_data'
    );

    if (!registrationAttr || !registrationAttr.value) {
      console.log('ℹ️ No hay registration_data en este pedido - es una orden normal sin inscripciones');
      return res.status(200).json({
        success: true,
        message: 'No registration data found - standard order',
        orderNumber: order.order_number
      });
    }

    // Log del valor raw antes de parsear
    console.log('═══════════════════════════════════════════════');
    console.log('📋 REGISTRATION_DATA ENCONTRADO');
    console.log('═══════════════════════════════════════════════');
    console.log('📋 Raw Value Length:', registrationAttr.value.length, 'chars');
    console.log('📋 Raw Value (primeros 500 chars):', registrationAttr.value.substring(0, 500));

    // Parsear JSON de registros
    let registrationData;
    try {
      registrationData = JSON.parse(registrationAttr.value);
      console.log('📋 Parsed successfully');
      console.log('📋 Timestamp:', registrationData.timestamp || 'N/A');
    } catch (parseError) {
      console.error('❌ Error parseando registration_data:', parseError);
      console.error('❌ Raw value that failed:', registrationAttr.value);
      return res.status(400).json({
        error: 'Invalid registration_data JSON',
        details: parseError.message
      });
    }

    const corredores = registrationData.registrations || [];

    console.log('📋 Total corredores encontrados:', corredores.length);
    console.log('📋 Datos de corredores:', JSON.stringify(corredores, null, 2));

    if (corredores.length === 0) {
      console.log('ℹ️ No hay corredores en registration_data');
      return res.status(200).json({
        success: true,
        message: 'No runners in registration data'
      });
    }

    console.log(`📧 Enviando ${corredores.length} email(s) de confirmación...`);

    // Log de cada corredor
    corredores.forEach((c, i) => {
      console.log(`👤 Corredor ${i + 1}: ${c.nombre} - Email: ${c.email} - Categoria: ${c.categoria}`);
    });

    // Enviar email a cada corredor y guardar en Google Sheets
    const emailResults = [];
    const sheetsResults = [];
    const orderDate = order.created_at || new Date().toISOString();

    for (const corredor of corredores) {
      // Generar código único de check-in para este corredor
      const sheetName = getSheetNameFromProduct(corredor.product_title);
      const checkInCode = generateCheckInCode(sheetName);
      console.log(`🎫 Código generado para ${corredor.nombre}: ${checkInCode}`);

      // Guardar en Google Sheets (siempre, aunque no tenga email)
      const sheetResult = await saveToGoogleSheets(corredor, order.order_number || order.name, orderDate, checkInCode);
      sheetsResults.push({
        nombre: corredor.nombre,
        checkInCode: checkInCode,
        ...sheetResult
      });

      if (!corredor.email) {
        console.log(`⚠️ Corredor sin email: ${corredor.nombre}`);
        emailResults.push({
          nombre: corredor.nombre,
          status: 'skipped',
          reason: 'No email provided',
          checkInCode: checkInCode
        });
        continue;
      }

      try {
        const { data, error } = await resend.emails.send({
          from: 'DHMEXRACES <noreply@endhurorace.com>',
          to: corredor.email,
          subject: `✅ Inscripción Confirmada - ${corredor.categoria || corredor.variant_title} | DHMEXRACES 2026`,
          html: generateEmailHTML(corredor, order.order_number || order.name, corredor.product_title, checkInCode),
        });

        if (error) {
          console.error(`❌ Error enviando a ${corredor.email}:`, error);
          emailResults.push({
            nombre: corredor.nombre,
            email: corredor.email,
            status: 'error',
            error: error.message
          });
        } else {
          console.log(`✅ Email enviado a ${corredor.email} - ID: ${data.id}`);
          emailResults.push({
            nombre: corredor.nombre,
            email: corredor.email,
            status: 'sent',
            id: data.id
          });
        }
      } catch (sendError) {
        console.error(`❌ Exception enviando a ${corredor.email}:`, sendError);
        emailResults.push({
          nombre: corredor.nombre,
          email: corredor.email,
          status: 'error',
          error: sendError.message
        });
      }
    }

    const sentCount = emailResults.filter(r => r.status === 'sent').length;
    const savedCount = sheetsResults.filter(r => r.success).length;
    console.log(`📊 Resultado: ${sentCount}/${corredores.length} emails enviados`);
    console.log(`📊 Resultado: ${savedCount}/${corredores.length} guardados en Sheets`);

    return res.status(200).json({
      success: true,
      orderNumber: order.order_number || order.name,
      totalRunners: corredores.length,
      emailsSent: sentCount,
      savedToSheets: savedCount,
      emailResults: emailResults,
      sheetsResults: sheetsResults
    });

  } catch (error) {
    console.error('❌ Error general en webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
