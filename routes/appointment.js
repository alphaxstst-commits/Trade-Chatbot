// routes/appointment.js
const express = require('express');
const router = express.Router();
const { appendToSheet } = require('../services/googleSheets');
const { sendEmail } = require('../services/email');

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, service, date, time, notes } = req.body;

    // Save to Google Sheets (using the sheet ID from .env)
    await appendToSheet(process.env.APPOINTMENTS_SHEET_ID, [
      new Date().toISOString(),
      name,
      phone,
      email,
      service,
      date,
      time,
      notes || '',
      'Confirmed',
    ]);

    // Send confirmation to customer
    const customerHtml = `
      <h2>Appointment Confirmed</h2>
      <p>Hi ${name},</p>
      <p>Your ${service} appointment is scheduled for <strong>${date} at ${time}</strong>.</p>
      <p>We'll send a reminder 24 hours before.</p>
      <p>Thank you for choosing Summit Trades Group.</p>
    `;
    await sendEmail({
      to: email,
      subject: 'Appointment Confirmed',
      html: customerHtml,
    });

    // Send notification to owner
    const ownerHtml = `
      <h2>New Appointment Booked</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Notes:</strong> ${notes || 'None'}</p>
    `;
    await sendEmail({
      to: process.env.NOTIFY_EMAIL_TO,
      subject: 'New Appointment Booked',
      html: ownerHtml,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Appointment error:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Failed to book appointment', details: err.message });
  }
});

module.exports = router;