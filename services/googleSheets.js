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
 * Append a row to a Google Sheet.
 *
 * valueInputOption:
 *  - 'USER_ENTERED' (default, original behaviour): Sheets parses values like a typed
 *    cell, so "Mon, Oct 12, 1:00 PM" becomes a date serial number like 46307.54167.
 *  - 'RAW': values are stored exactly as sent (text stays text, phone numbers keep
 *    leading zeros / "+"). Used for appointments and leads.
 */
async function appendToSheet(sheetId, values, valueInputOption = 'USER_ENTERED') {
  try {
    const request = {
      spreadsheetId: sheetId,
      range: 'A:Z',
      valueInputOption,
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
 * Wrapper for agent – saves an appointment.
 *
 * Column order MUST match the "Appointments CRM" sheet headers exactly:
 * A Timestamp | B Name | C Phone | D Email | E Address | F Service |
 * G Priority | H Preferred Time | I Notes | J Source | K Status
 */
async function saveAppointment(payload) {
  const trade = payload.tradeGuess
    ? String(payload.tradeGuess).charAt(0).toUpperCase() + String(payload.tradeGuess).slice(1)
    : '';
  const details = payload.serviceNeeded || '';
  const service = trade && details ? `${trade} - ${details}` : trade || details;

  const row = [
    new Date().toISOString(),                 // A Timestamp
    payload.fullName || '',                   // B Name
    payload.phone || '',                      // C Phone
    payload.email || '',                      // D Email
    payload.address || '',                    // E Address
    service,                                  // F Service
    payload.urgent ? 'URGENT' : 'normal',     // G Priority
    payload.preferredDateTime || '',          // H Preferred Time
    payload.notes || '',                      // I Notes
    payload.channel || 'website',             // J Source
    'Pending confirmation',                   // K Status
  ];
  return appendToSheet(process.env.APPOINTMENTS_SHEET_ID, row, 'RAW');
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
  return appendToSheet(process.env.LEADS_SHEET_ID, row, 'RAW');
}

module.exports = { appendToSheet, saveAppointment, saveLead };
