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
// TODO INTEGRATION POINT — still not wired to your real services/googleSheets.js
// and services/email.js. This is why bookings/leads are not saving or emailing
// yet. Send me those 3 files (googleSheets.js, email.js, whatsapp.js) and I will
// wire this properly instead of guessing.
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
 * Normal free-text chat turn. THE FIX: this now decides, in code, whether
 * the form should open (`showForm`), and the reply prompt is told the form
 * is already showing rather than being left to invent its own promise about
 * it. The frontend acts on `showForm` directly instead of trying to parse
 * intent out of the AI's sentence.
 */
async function handleMessage({ key, channel, message }) {
  const state = getState(key);
  const isFirstMessage = state.history.length === 0;

  state.history.push({ role: "user", content: message });

  if (isEmergency(message)) {
    state.urgent = true;
    const reply = `That sounds urgent. Please call us right now at ${process.env.BUSINESS_PHONE || "our office"} for immediate help. I have flagged this as priority. You can also fill in the quick form below so a technician can be dispatched.`;
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false, showForm: true, urgent: true, tradeGuess: state.tradeGuess, serviceNeeded: state.serviceNeeded };
  }

  if (isFirstMessage && /^\s*(hi|hello|hey|hola)\s*[!.]?\s*$/i.test(message)) {
    const reply = buildGreeting();
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false, showForm: false };
  }

  const extractionPrompt = buildExtractionPrompt(state, message);
  const extracted = await extractFields(extractionPrompt, message);
  mergeExtracted(state, extracted);

  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const readyToBook = missing.length === 0 && state.wantsToBook !== false;

  // Code decides whether to surface the form — not the LLM's wording.
  // Trigger once: only if they seem to want booking and we haven't already
  // shown it and gotten a submission (stage !== "booked").
  const shouldShowForm =
    state.stage !== "booked" &&
    !state.formShown &&
    (state.wantsToBook === true || Boolean(state.serviceNeeded));

  if (shouldShowForm) {
    state.formShown = true;
  }

  if (readyToBook && state.stage !== "booked") {
    // Extremely unlikely via free text now that booking goes through the form,
    // but kept as a safety net in case someone types every field in chat.
    state.stage = "booked";
    await persistAppointment(state);
  } else if (state.wantsToBook === false && state.fullName && state.stage === "new") {
    state.stage = "lead_saved";
    await persistLead(state);
  } else if (state.stage === "new") {
    state.stage = "collecting";
  }

  const replyPrompt = buildReplyPrompt(state, state.tradeGuess, shouldShowForm);
  const reply = await generateReply(replyPrompt, message);

  state.history.push({ role: "assistant", content: reply });
  saveState(key, state);

  return {
    reply,
    booked: state.stage === "booked",
    showForm: shouldShowForm,
    urgent: state.urgent,
    tradeGuess: state.tradeGuess,
    serviceNeeded: state.serviceNeeded,
  };
}

/**
 * Deterministic booking from the widget's form. No LLM involved in deciding
 * what was booked, so the confirmation can never misstate it.
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
    ? " This has been flagged as a priority and our team will reach out shortly."
    : ` Our office will call ${state.phone} shortly to confirm the exact time.`;

  const reply = `You are all set, ${state.fullName}. I have booked ${state.serviceNeeded} at ${state.address} for ${state.preferredDateTime}.${urgentLine}`;

  return { reply, booked: true };
}

module.exports = { handleMessage, submitBookingForm };
