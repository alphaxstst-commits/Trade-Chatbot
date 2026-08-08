// routes/chat.js
const express = require('express');
const router = express.Router();
const { callOpenRouter } = require('../services/openrouter');
const business = require('../knowledge/JS businessScript.js');

// In‑memory store for WhatsApp sessions (key: phone number)
// For production, you'd persist to Google Sheets or DB
const sessionStore = new Map();

// Helper: Check if we have all required fields
function isBookingComplete(state) {
  const required = ['name', 'phone', 'address', 'service', 'preferredTime'];
  return required.every(f => state[f] && state[f].trim() !== '');
}

// Helper: Build the "known so far" summary
function buildStateSummary(state) {
  const known = Object.entries(state)
    .filter(([k, v]) => v && v.trim() !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return known || 'Nothing yet.';
}

// Main chat endpoint
router.post('/', async (req, res) => {
  const { message, sessionId, state = {}, history = [] } = req.body;

  // 1. Emergency detection (priority)
  if (business.isEmergency(message)) {
    const reply = `🚨 **URGENT** — This appears to be an emergency. Please call us immediately at **1‑800‑555‑0199** for priority assistance. Do not wait for a chat response.`;
    return res.json({ reply, state: { ...state, emergency: true } });
  }

  // 2. Check business hours (if not emergency)
  const now = new Date();
  const hour = now.getHours();
  const isOpen = hour >= business.businessHours.open && hour < business.businessHours.close;
  if (!isOpen) {
    const reply = `⏰ Our business hours are ${business.businessHours.open}:00 – ${business.businessHours.close}:00. We'll respond first thing tomorrow morning. Please leave your message and we'll get back to you.`;
    // But we still continue to collect info; we just add the notice.
  }

  // 3. Extract fields from message using LLM (structured)
  const extractionPrompt = `
You are a data extraction assistant. Extract the following fields from the user's latest message, if present:
- name (full name)
- phone (phone number)
- address (street, city, or full address)
- service (type of service, e.g., plumbing, HVAC, electrical)
- preferredTime (any date/time mention)

Return ONLY valid JSON with keys: name, phone, address, service, preferredTime.
If a field is not mentioned, set it to null.

User message: "${message}"
`;

  let extracted = {};
  try {
    const extractionResponse = await callOpenRouter(extractionPrompt, { temperature: 0.1 });
    // Expect JSON in response
    const jsonMatch = extractionResponse.match(/\{.*\}/s);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
    } else {
      // fallback: manual regex (simple)
      extracted = {};
    }
  } catch (e) {
    console.warn('Extraction failed, using fallback:', e);
    extracted = {};
  }

  // Merge extracted into state (only non‑null)
  const newState = { ...state };
  for (const [key, value] of Object.entries(extracted)) {
    if (value && value.trim() !== '') {
      newState[key] = value.trim();
    }
  }

  // Also try to identify service from message if not extracted
  if (!newState.service) {
    const found = business.findService(message);
    if (found) newState.service = found.name;
  }

  // 4. Generate reply based on completeness
  let reply = '';
  const complete = isBookingComplete(newState);

  if (complete) {
    // All fields present → trigger booking
    reply = `✅ Great! I have everything we need.\n\n📋 **Booking Summary:**\n- Name: ${newState.name}\n- Phone: ${newState.phone}\n- Address: ${newState.address}\n- Service: ${newState.service}\n- Preferred time: ${newState.preferredTime}\n\nI'll confirm this booking with you shortly. Thank you!`;
    // You can also send email notification here via email.js
  } else {
    // Build the "missing fields" list
    const missing = [];
    if (!newState.name) missing.push('your full name');
    if (!newState.phone) missing.push('your phone number');
    if (!newState.address) missing.push('your address');
    if (!newState.service) missing.push('what service you need');
    if (!newState.preferredTime) missing.push('your preferred date/time');

    // If we have some info, we can give a price estimate
    let priceInfo = '';
    if (newState.service) {
      const serviceObj = business.services.find(s => s.name.toLowerCase() === newState.service.toLowerCase());
      if (serviceObj) {
        priceInfo = `\n\n💰 **Price estimate**: ${serviceObj.typicalPriceRange} (final price depends on site inspection)`;
      }
    }

    // Generate a friendly prompt asking only for missing fields
    const knownSummary = buildStateSummary(newState);
    const replyPrompt = `
You are a professional customer service assistant for a blue‑collar trade company.

The customer has provided the following information so far:
${knownSummary}

The following information is still needed (ask only for these, never ask for what's already provided):
- ${missing.join('\n- ')}

Your task: Write a polite, concise reply that:
- Greets the customer professionally (if this is the first interaction)
- Asks ONLY for the missing information (list them clearly)
- If any service was mentioned, include the typical price range (${priceInfo || 'we can provide a quote after we know the service'})
- Do not ask for anything already known.
- Do not mention anything about emergency (that's already handled).

Keep the tone friendly and helpful. Use bullet points if needed.
`;

    try {
      const genResponse = await callOpenRouter(replyPrompt, { temperature: 0.7 });
      reply = genResponse;
    } catch (e) {
      console.error('Reply generation failed:', e);
      reply = "Could you please provide your full name, phone number, address, what service you need, and your preferred time?";
    }
  }

  // 5. If we have a phone number, we could store session in Google Sheets for persistence
  // (optional)

  // Return updated state and reply
  res.json({ reply, state: newState });
});

module.exports = router;