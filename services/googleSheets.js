// services/googleSheets.js
const { google } = require('googleapis');

// Authenticate using the service account
const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Append a row to a Google Sheet
 * @param {string} sheetId - The spreadsheet ID
 * @param {Array} values - Array of values for the new row
 */
async function appendToSheet(sheetId, values) {
  try {
    const request = {
      spreadsheetId: sheetId,
      range: 'A:Z',
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [values] },
    };
    const result = await sheets.spreadsheets.values.append(request);
    return result.data;
  } catch (err) {
    console.error('Google Sheets append error:', err.message);
    throw err;
  }
}

module.exports = { appendToSheet };