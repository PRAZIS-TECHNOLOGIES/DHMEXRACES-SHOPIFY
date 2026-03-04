// Test Google Sheets v3
const { GoogleSpreadsheet } = require('google-spreadsheet');

const SPREADSHEET_ID = '1XGe4vuVxsPQAE10deD-bYUVxKjUbeclyDx3m1CqpFBg';

module.exports = async function handler(req, res) {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let key = process.env.GOOGLE_PRIVATE_KEY;

    // Procesar key
    key = key.replace(/\\n/g, '\n');

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: email,
      private_key: key,
    });

    await doc.loadInfo();

    const sheets = doc.sheetsByIndex.map(s => s.title);

    return res.status(200).json({
      success: true,
      title: doc.title,
      sheets: sheets
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};
