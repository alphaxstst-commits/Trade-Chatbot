// services/agent.js
const { getState, saveState } = require("./sessionStore");
const { extractFields, generateReply } = require("./openrouter");
const {
  REQUIRED_BOOKING_FIELDS,
  isEmergency,
  buildExtractionPrompt,
  buildReplyPrompt,
  buildGreeting,
} = require("../knowledge/businessScript");

// ---------------------------------------------------------------------------
// TODO INTEGRATION POINT #1
// Replace these two functions with calls into YOUR existing services/googleSheets.js
// and services/email.js — whatever their real exported function names are.
// I don't have those files, so these are safe placeholders that log instead
// of silently failing. Swap the body of each function only; keep the names
// `persistAppointment` / `persistLead` used below as-is, or update both the
// definition and the call sites together.
// ---------------------------------------------------------------------------
async function persistAppointment(state) {
  console.log("TODO: wire to services/googleSheets.js + services/email.js -> appointment:", {
    fullName: state.fullName,
    phone: state.phone,
    address: state.address,
    serviceNeeded: state.serviceNeeded,
    preferredDateTime: state.preferredDateTime,
    urgent: state.urgent,
  });
  // Example of what this should become, once you tell me your real function names:
  // await googleSheets.saveAppointment({...});
  // await email.sendAppointmentEmail({...});
}

async function persistLead(state) {
  console.log("TODO: wire to services/googleSheets.js + services/email.js -> lead:", {
    fullName: state.fullName,
    phone: state.phone,
    serviceNeeded: state.serviceNeeded,
  });
  // await googleSheets.saveLead({...});
  // await email.sendLeadEmail({...});
}
// ---------------------------------------------------------------------------

function mergeExtracted(state, extracted) {
  const fieldMap = ["fullName", "phone", "address", "serviceNeeded", "preferredDateTime"];
  for (const f of fieldMap) {
    if (extracted[f] && typeof extracted[f] === "string" && extracted[f].trim()) {
      state[f] = extracted[f].trim();
    }
  }
  if (extracted.wantsToBook === true || extracted.wantsToBook === false) {
    state.wantsToBook = extracted.wantsToBook;
  }
  if (extracted.tradeGuess && !state.tradeGuess) {
    state.tradeGuess = extracted.tradeGuess;
  }
  return state;
}

/**
 * Main entry point. Both the website widget route and the WhatsApp webhook
 * call this with a unique `key` per conversation (session id or phone number).
 *
 * @param {object} params
 * @param {string} params.key - unique conversation key, e.g. "web:abc123" or "wa:15551234567"
 * @param {string} params.channel - "website" | "whatsapp"
 * @param {string} params.message - the customer's latest message
 * @returns {Promise<{reply: string, booked: boolean}>}
 */
async function handleMessage({ key, channel, message }) {
  const state = getState(key);
  const isFirstMessage = state.history.length === 0;

  state.history.push({ role: "user", content: message });

  // --- Deterministic emergency fast-path (never left to the LLM alone) ---
  if (isEmergency(message)) {
    state.urgent = true;
    const reply = `That sounds urgent — please call us right now at ${process.env.BUSINESS_PHONE || "our office"} for immediate help. I've also flagged this so our team follows up right away. Can you also share your name and address so a technician can be dispatched?`;
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false };
  }

  // --- First message that's just a bare greeting ("hi", "hello") gets the menu ---
  if (isFirstMessage && /^\s*(hi|hello|hey|hola)\s*[!.]?\s*$/i.test(message)) {
    const reply = buildGreeting();
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false };
  }

  // --- CALL #1: extract structured fields from the latest message ---
  const extractionPrompt = buildExtractionPrompt(state, message);
  const extracted = await extractFields(extractionPrompt, message);
  mergeExtracted(state, extracted);

  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const readyToBook = missing.length === 0 && state.wantsToBook !== false;

  // --- Code decides the outcome — not the LLM ---
  if (readyToBook && state.stage !== "booked") {
    state.stage = "booked";
    await persistAppointment(state);
  } else if (state.wantsToBook === false && state.fullName && state.stage === "new") {
    // They shared contact info but don't want to book yet -> lead, not appointment.
    state.stage = "lead_saved";
    await persistLead(state);
  } else if (state.stage === "new") {
    state.stage = "collecting";
  }

  // --- CALL #2: generate the actual reply, given known/missing state ---
  const replyPrompt = buildReplyPrompt(state, state.tradeGuess);
  const reply = await generateReply(replyPrompt, message);

  state.history.push({ role: "assistant", content: reply });
  saveState(key, state);

  return { reply, booked: state.stage === "booked" };
}

module.exports = { handleMessage };
