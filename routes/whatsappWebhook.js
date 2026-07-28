// routes/whatsappWebhook.js
const express = require('express');
const router = express.Router();
const { askAI } = require('../services/openrouter');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const { appendToSheet } = require('../services/googleSheets');
const { sendEmail } = require('../services/email');

// Verify webhook (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Handle incoming messages and calls (POST)
router.post('/', async (req, res) => {
  try {
    const { entry } = req.body;
    for (const e of entry) {
      for (const change of e.changes) {
        const value = change.value;

        // --- Incoming text messages ---
        if (value.messages) {
          for (const msg of value.messages) {
            if (msg.type === 'text') {
              const from = msg.from;
              const text = msg.text.body;
              // Use AI to generate reply (no history for simplicity)
              const aiReply = await askAI(text, []);
              await sendWhatsAppMessage(from, aiReply);

              // Optionally capture lead if user provides name/phone/email
              // For now, just log as conversation
            }
          }
        }

        // --- Missed calls ---
        if (value.calls) {
          for (const call of value.calls) {
            if (call.call_status === 'missed') {
              const from = call.from;
              // Send a message to schedule
              await sendWhatsAppMessage(
                from,
                "Hi there! We noticed you called but we couldn't answer. Let's schedule a time to chat. Please reply with your name and preferred time."
              );
              // Log as lead with follow-up needed
              await appendToSheet(process.env.LEADS_SHEET_ID, [
                new Date().toISOString(),
                from,
                '',
                '',
                'Missed Call',
                'Follow-up needed',
                'Missed call - auto message sent',
                'Follow-up',
              ]);
              // Notify owner
              const ownerHtml = `<p>Missed call from ${from}. Auto-follow-up sent.</p>`;
              await sendEmail({
                to: process.env.NOTIFY_EMAIL_TO,
                subject: 'Missed Call - WhatsApp',
                html: ownerHtml,
              });
            }
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;