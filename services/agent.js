// services/agent.js
const { getState, saveState } = require("./sessionStore");
const { extractFields, generateReply } = require("./openrouter");
const {
  REQUIRED_BOOKING_FIELDS,
  isEmergency,
  buildExtractionPrompt,
  buildReplyPrompt,
  buildGreeting,
  BOT_NAME,
} = require("../knowledge/businessScript");

// ---------------------------------------------------------------------------
// TODO INTEGRATION POINT — wire these to your real services/googleSheets.js
// and services/email.js. Still placeholders until you send me those files.
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
}

async function persistLead(state) {
  console.log("TODO: wire to services/googleSheets.js + services/email.js -> lead:", {
    fullName: state.fullName,
    phone: state.phone,
    serviceNeeded: state.serviceNeeded,
  });
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
 * Normal free-text chat turn (used for the "Ask a question" flow, and for WhatsApp).
 */
async function handleMessage({ key, channel, message }) {
  const state = getState(key);
  const isFirstMessage = state.history.length === 0;

  state.history.push({ role: "user", content: message });

  if (isEmergency(message)) {
    state.urgent = true;
    const reply = `That sounds urgent — please call us right now at ${process.env.BUSINESS_PHONE || "our office"} for immediate help. I've flagged this as priority. Can you also share your name and address so a technician can be dispatched?`;
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false };
  }

  if (isFirstMessage && /^\s*(hi|hello|hey|hola)\s*[!.]?\s*$/i.test(message)) {
    const reply = buildGreeting();
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false };
  }

  const extractionPrompt = buildExtractionPrompt(state, message);
  const extracted = await extractFields(extractionPrompt, message);
  mergeExtracted(state, extracted);

  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const readyToBook = missing.length === 0 && state.wantsToBook !== false;

  if (readyToBook && state.stage !== "booked") {
    state.stage = "booked";
    await persistAppointment(state);
  } else if (state.wantsToBook === false && state.fullName && state.stage === "new") {
    state.stage = "lead_saved";
    await persistLead(state);
  } else if (state.stage === "new") {
    state.stage = "collecting";
  }

  const replyPrompt = buildReplyPrompt(state, state.tradeGuess);
  const reply = await generateReply(replyPrompt, message);

  state.history.push({ role: "assistant", content: reply });
  saveState(key, state);

  return { reply, booked: state.stage === "booked" };
}

/**
 * Deterministic booking from the widget's form — no LLM extraction needed
 * since the fields are already structured. This is both more reliable and
 * faster than round-tripping through chat. Confirmation text is also
 * deterministic (not LLM-generated) so it can never be wrong about what
 * was actually booked.
 */
async function submitBookingForm({ key, channel, formData }) {
  const state = getState(key);

  state.fullName = (formData.fullName || "").trim();
  state.phone = (formData.phone || "").trim();
  state.address = (formData.address || "").trim();
  state.serviceNeeded = (formData.serviceNeeded || "").trim();
  state.preferredDateTime = (formData.preferredDateTime || "").trim();
  state.urgent = Boolean(formData.urgent);
  state.tradeGuess = formData.tradeGuess || state.tradeGuess;
  state.stage = "booked";

  await persistAppointment(state);
  saveState(key, state);

  const urgentLine = state.urgent
    ? ` Since this is urgent, we've flagged it as a priority and our team will reach out shortly.`
    : ` Our office will call ${state.phone} shortly to confirm the exact time.`;

  const reply = `You're all set, ${state.fullName}! I've booked ${state.serviceNeeded} at ${state.address} for ${state.preferredDateTime}.${urgentLine} — ${BOT_NAME}`;

  return { reply, booked: true };
}

module.exports = { handleMessage, submitBookingForm };
