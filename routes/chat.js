// routes/chat.js
const express = require('express');
const router = express.Router();
const { callOpenRouter } = require('../services/openrouter');
const business = require('../knowledge/businessScript.js');

// In-memory session store (for WhatsApp, use phone number as key)
// For web, we pass state from frontend
const sessionStore = new Map();

// Required fields to complete a booking
const REQUIRED_FIELDS = ['name', 'phone', 'address', 'service', 'preferredTime'];

// Helper: Check if all required fields are present
function isBookingComplete(state) {
  return REQUIRED_FIELDS.every(f => state[f] && state[f].trim() !== '');
}

// Helper: Get missing fields
function getMissingFields(state) {
  const missing = [];
  if (!state.name) missing.push('your full name');
  if (!state.phone) missing.push('your phone number');
  if (!state.address) missing.push('your address');
  if (!state.service) missing.push('what service you need');
  if (!state.preferredTime) missing.push('your preferred date/time');
  return missing;
}

// Helper: Build "known so far" summary
function getKnownSummary(state) {
  const known = Object.entries(state)
    .filter(([k, v]) => v && v.trim() !== '')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return known || 'Nothing provided yet.';
}

// Helper: Find service from message
function findServiceInMessage(message) {
  const lower = message.toLowerCase();
  for (const service of business.services) {
    if (lower.includes(service.name.toLowerCase()) || 
        service.description.toLowerCase().split(' ').some(word => lower.includes(word))) {
      return service;
    }
  }
  return null;
}

// Helper: Get price for a service
function getPriceForService(serviceName) {
  const service = business.services.find(s => 
    s.name.toLowerCase() === serviceName.toLowerCase()
  );
  return service ? service.typicalPriceRange : null;
}

// ---- MAIN CHAT ENDPOINT ----
router.post('/', async (req, res) => {
  const { message, sessionId, state = {}, history = [] } = req.body;

  console.log('📩 Received message:', message);
  console.log('📦 Current state:', state);

  // ---- STEP 1: EMERGENCY CHECK ----
  if (business.isEmergency(message)) {
    const reply = `🚨 **URGENT** – This appears to be an emergency. Please call us immediately at **1-800-555-0199** for priority assistance. Do not wait for a chat response.`;
    return res.json({ reply, state: { ...state, emergency: true } });
  }

  // ---- STEP 2: EXTRACT INFORMATION FROM MESSAGE ----
  // We'll use the LLM to extract structured data from the user's message
  const extractionPrompt = `
You are a data extraction assistant. Extract the following fields from the user's latest message, if present.
If a field is not mentioned, set it to null.

Fields to extract:
- name: the user's full name (e.g., "John Smith")
- phone: phone number (e.g., "555-1234" or "416-555-1234")
- address: street address or city (e.g., "123 Main St, Toronto")
- service: the type of service needed (e.g., "plumbing", "HVAC", "excavation", "electrical")
- preferredTime: any date or time mentioned (e.g., "tomorrow", "Monday", "3pm")

Return ONLY valid JSON. No other text.

User message: "${message}"
`;

  let extracted = {};
  try {
    const extResponse = await callOpenRouter(extractionPrompt, { temperature: 0.1 });
    // Try to parse JSON from the response
    const jsonMatch = extResponse.match(/\{[^]*\}/);
    if (jsonMatch) {
      extracted = JSON.parse(jsonMatch[0]);
      console.log('✅ Extracted:', extracted);
    } else {
      console.log('⚠️ No JSON found in extraction response');
    }
  } catch (e) {
    console.error('❌ Extraction failed:', e.message);
  }

  // ---- STEP 3: MERGE EXTRACTED DATA INTO STATE ----
  const newState = { ...state };
  for (const [key, value] of Object.entries(extracted)) {
    if (value && value.trim() !== '' && value !== 'null') {
      newState[key] = value.trim();
    }
  }

  // If no service was extracted, try to detect it from the message
  if (!newState.service) {
    const foundService = findServiceInMessage(message);
    if (foundService) {
      newState.service = foundService.name;
      console.log('🔍 Detected service from message:', foundService.name);
    }
  }

  // ---- STEP 4: CHECK IF BOOKING IS COMPLETE ----
  const complete = isBookingComplete(newState);
  console.log('📋 Booking complete?', complete);
  console.log('📋 Current state:', newState);

  // ---- STEP 5: GENERATE REPLY ----
  let reply = '';

  if (complete) {
    // ---- ALL FIELDS PRESENT → CONFIRM BOOKING ----
    const priceRange = getPriceForService(newState.service);
    reply = `✅ **Booking Confirmed!** Here's your summary:

📋 **Service:** ${newState.service}
👤 **Name:** ${newState.name}
📱 **Phone:** ${newState.phone}
📍 **Address:** ${newState.address}
📅 **Preferred Time:** ${newState.preferredTime}
${priceRange ? `💰 **Price Range:** ${priceRange} (final price depends on site inspection)` : ''}

We'll contact you shortly to confirm. Thank you for choosing TradePro! 🛠️`;

    // Optional: Send email notification here
    // await sendEmailBooking(newState);

  } else {
    // ---- MISSING FIELDS → ASK FOR WHAT'S MISSING ----
    const missing = getMissingFields(newState);
    const knownSummary = getKnownSummary(newState);
    const priceInfo = newState.service ? getPriceForService(newState.service) : null;

    // Build the reply prompt for the LLM
    const replyPrompt = `
You are a professional, friendly customer service assistant for a blue-collar trade company called "TradePro" that does plumbing, HVAC, excavation, electrical, and handyman services.

The customer has provided this information so far:
${knownSummary}

The following information is still needed (ask ONLY for these):
- ${missing.join('\n- ')}

${priceInfo ? `The customer mentioned they need "${newState.service}". The typical price range for this service is ${priceInfo}. Only mention this if they ask about pricing, otherwise don't bring it up.` : ''}

Your task:
- Write a polite, professional reply.
- Ask ONLY for the missing information listed above. Never ask for anything already provided.
- If this is the first message, greet them professionally.
- If they mentioned a specific service, acknowledge it briefly.
- Keep it short and friendly. 2-3 sentences max, plus a bullet list if needed.
- Do NOT ask about emergency (that's already handled separately).

IMPORTANT: The customer said: "${message}"
`;

    try {
      const genResponse = await callOpenRouter(replyPrompt, { temperature: 0.7 });
      reply = genResponse;
      console.log('💬 Generated reply:', reply);
    } catch (e) {
      console.error('❌ Reply generation failed:', e.message);
      // Fallback reply
      reply = `Thanks for reaching out. I just need a few more details to help you:\n\n• ${missing.join('\n• ')}\n\nPlease provide those and I'll get you sorted!`;
    }
  }

  // ---- STEP 6: RETURN RESPONSE ----
  res.json({
    reply: reply,
    state: newState
  });
});

module.exports = router;