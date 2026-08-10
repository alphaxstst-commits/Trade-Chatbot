// routes/appointment.js
const express = require('express');
const router = express.Router();
const { saveAppointment } = require('../services/googleSheets');
const { sendAppointmentEmail } = require('../services/email');

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, service, date, time, notes } = req.body;

    // Build the payload for saveAppointment
    const payload = {
      fullName: name || '',
      phone: phone || '',
      address: 'Not provided', // optional – add to form if needed
      serviceNeeded: service || '',
      preferredDateTime: `${date} ${time}`.trim(),
      urgent: false,
      notes: notes || '',
      channel: 'website',
    };

    // Save to Google Sheets via webhook
    const sheetResult = await saveAppointment(payload);
    if (!sheetResult.ok) {
      console.error('Sheet save failed:', sheetResult);
    }

    // Send email notifications via EmailJS
    const emailResult = await sendAppointmentEmail(payload);
    if (!emailResult) {
      console.error('Email send failed');
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Appointment error:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Failed to book appointment', details: err.message });
  }
});

module.exports = router;