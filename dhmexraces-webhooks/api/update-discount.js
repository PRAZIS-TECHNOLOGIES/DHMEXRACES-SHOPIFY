/**
 * Actualiza el descuento de jersey basándose en el conteo del Sheets
 * GET /api/update-discount?sede=guanajuato
 *
 * 1. Cuenta inscritos pagados (PAGO ≠ "patrocinado")
 * 2. Calcula jerseys restantes (máx 50 - pagados)
 * 3. Si restantes > 0: actualiza usesPerOrderLimit y asegura ACTIVE
 * 4. Si restantes ≤ 0: desactiva el descuento
 */

const https = require('https');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';
const DISCOUNT_ID = 'gid://shopify/DiscountAutomaticNode/1888870433004';
const SHOP = '18d06f-7a.myshopify.com';
const API_VERSION = '2026-01';
const MAX_JERSEYS = 50;

function shopifyGQL(query) {
  return new Promise((resolve, reject) => {
    const token = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
    if (!token) return reject(new Error('SHOPIFY_ADMIN_TOKEN no configurado'));
    const postData = JSON.stringify({ query });
    const req = https.request({
      hostname: SHOP, port: 443,
      path: `/admin/api/${API_VERSION}/graphql.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const sede = (req.query.sede || 'GUANAJUATO').toUpperCase();

  try {
    // 1. Contar pagados en Sheets
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle[sede];
    if (!sheet) {
      return res.status(404).json({ error: `Hoja ${sede} no encontrada` });
    }

    const rows = await sheet.getRows();
    const paidCount = rows.filter(row => {
      if (!row.NOMBRE || row.NOMBRE.trim() === '') return false;
      const pago = (row.PAGO || '').trim().toLowerCase();
      if (pago === 'patrocinado') return false;
      return true;
    }).length;

    const remaining = Math.max(0, MAX_JERSEYS - paidCount);
    console.log(`Descuento jersey: ${paidCount} pagados, ${remaining} restantes`);

    // 2. Obtener estado actual
    const statusResult = await shopifyGQL(`{
      automaticDiscountNode(id: "${DISCOUNT_ID}") {
        automaticDiscount {
          ... on DiscountAutomaticBxgy { status usesPerOrderLimit }
        }
      }
    }`);

    const currentDiscount = statusResult?.data?.automaticDiscountNode?.automaticDiscount;
    const currentStatus = currentDiscount?.status;
    const currentLimit = currentDiscount?.usesPerOrderLimit;

    // 3. Actualizar
    if (remaining <= 0) {
      // Desactivar
      if (currentStatus === 'ACTIVE') {
        await shopifyGQL(`mutation {
          discountAutomaticDeactivate(id: "${DISCOUNT_ID}") {
            userErrors { field message }
          }
        }`);
        console.log('Descuento DESACTIVADO - 0 jerseys restantes');
      }

      return res.status(200).json({
        success: true,
        action: 'deactivated',
        paidCount,
        remaining: 0,
        previousLimit: currentLimit
      });

    } else {
      // Actualizar límite
      const updateResult = await shopifyGQL(`mutation {
        discountAutomaticBxgyUpdate(
          id: "${DISCOUNT_ID}"
          automaticBxgyDiscount: { usesPerOrderLimit: "${remaining}" }
        ) {
          userErrors { field message }
        }
      }`);

      const errors = updateResult?.data?.discountAutomaticBxgyUpdate?.userErrors || [];
      if (errors.length > 0) {
        return res.status(500).json({ error: 'Error actualizando descuento', details: errors });
      }

      // Reactivar si estaba inactivo
      if (currentStatus !== 'ACTIVE') {
        await shopifyGQL(`mutation {
          discountAutomaticActivate(id: "${DISCOUNT_ID}") {
            userErrors { field message }
          }
        }`);
        console.log('Descuento REACTIVADO');
      }

      return res.status(200).json({
        success: true,
        action: remaining === currentLimit ? 'no_change' : 'updated',
        paidCount,
        remaining,
        previousLimit: currentLimit,
        newLimit: remaining
      });
    }

  } catch (error) {
    console.error('Error update-discount:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
