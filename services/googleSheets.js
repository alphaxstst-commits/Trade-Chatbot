// services/googleSheets.js
const { google } = require('googleapis');

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

async function appendToSheet(sheetId, values) {
  const request = {
    spreadsheetId: sheetId,
    range: 'A:Z',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: { values: [values] },
  };
  const result = await sheets.spreadsheets.values.append(request);
  return result.data;
}

module.exports = { appendToSheet };