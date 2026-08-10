// services/googleSheets.js
const { google } = require('googleapis');

const auth = new google.auth.JWT(
  process.env.GOOGLE_CLIENT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Append a row to a Google Sheet (original function)
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

/**
 * Wrapper for agent – saves an appointment
 */
async function saveAppointment(payload) {
  const row = [
    new Date().toISOString(),
    payload.fullName || '',
    payload.phone || '',
    payload.address || '',
    payload.serviceNeeded || '',
    payload.preferredDateTime || '',
    payload.urgent ? 'URGENT' : 'normal',
    payload.notes || '',
    payload.channel || 'website',
    'Pending confirmation',
  ];
  return appendToSheet(process.env.APPOINTMENTS_SHEET_ID, row);
}

/**
 * Wrapper for agent – saves a lead
 */
async function saveLead(payload) {
  const row = [
    new Date().toISOString(),
    payload.fullName || '',
    payload.phone || '',
    payload.email || '',
    payload.serviceNeeded || payload.interest || '',
    payload.channel || 'website',
    'New',
  ];
  return appendToSheet(process.env.LEADS_SHEET_ID, row);
}

module.exports = { appendToSheet, saveAppointment, saveLead };