// routes/lead.js
const express = require('express');
const router = express.Router();
const { appendToSheet } = require('../services/googleSheets');
const { sendEmail } = require('../services/email');

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, service, message, intent } = req.body;
    await appendToSheet(process.env.LEADS_SHEET_ID, [
      new Date().toISOString(),
      name,
      phone,
      email,
      service,
      message,
      intent || 'General Inquiry',
      'New',
    ]);

    // Notify owner
    const ownerHtml = `
      <h2>New Lead</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Intent:</strong> ${intent}</p>
      <p><strong>Message:</strong> ${message}</p>
    `;
    await sendEmail({
      to: process.env.NOTIFY_EMAIL_TO,
      subject: 'New Lead Captured',
      html: ownerHtml,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

module.exports = router;