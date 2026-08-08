// routes/whatsappWebhook.js
const express = require('express');
const router = express.Router();
const { callOpenRouter } = require('../services/openrouter');
const business = require('../knowledge/JS businessScript.js');
const { sendWhatsAppMessage } = require('../services/whatsapp');

// Session store keyed by phone number
const sessionStore = new Map();

router.post('/', async (req, res) => {
  const { body } = req;
  const message = body.message || body.text;
  const from = body.from; // phone number

  // Load existing state
  let state = sessionStore.get(from) || {};

  // 1. Emergency check
  if (business.isEmergency(message)) {
    const reply = `🚨 URGENT – Please call us immediately at 1‑800‑555‑0199 for emergency assistance.`;
    await sendWhatsAppMessage(from, reply);
    return res.sendStatus(200);
  }

  // 2. Extract fields (same as chat.js)
  const extractionPrompt = `...`; // same as above
  let extracted = {};
  try {
    const extRes = await callOpenRouter(extractionPrompt, { temperature: 0.1 });
    // parse JSON
    const jsonMatch = extRes.match(/\{.*\}/s);
    if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
  } catch (e) { /* fallback */ }

  // Merge
  const newState = { ...state };
  for (const [key, value] of Object.entries(extracted)) {
    if (value && value.trim() !== '') newState[key] = value.trim();
  }
  // identify service if missing
  if (!newState.service) {
    const found = business.findService(message);
    if (found) newState.service = found.name;
  }

  // 3. Generate reply (same logic as chat)
  const complete = isBookingComplete(newState);
  let reply = '';
  if (complete) {
    reply = `✅ Booking confirmed! ...`; // as above
    // Optionally clear state after booking?
  } else {
    // Build missing list and price info
    const missing = [];
    if (!newState.name) missing.push('your full name');
    if (!newState.phone) missing.push('your phone number');
    if (!newState.address) missing.push('your address');
    if (!newState.service) missing.push('what service you need');
    if (!newState.preferredTime) missing.push('your preferred date/time');

    const knownSummary = buildStateSummary(newState);
    const replyPrompt = `...`; // same as in chat.js
    const genResponse = await callOpenRouter(replyPrompt, { temperature: 0.7 });
    reply = genResponse;
  }

  // Save updated state
  sessionStore.set(from, newState);

  // Send reply via WhatsApp
  await sendWhatsAppMessage(from, reply);

  res.sendStatus(200);
});

module.exports = router;