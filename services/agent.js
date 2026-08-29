// services/agent.js
const { getState, saveState } = require("./sessionStore");
const { extractFields, generateReply } = require("./openrouter");
const { saveAppointment, saveLead } = require("./googleSheets");
const { sendAppointmentEmail, sendLeadEmail } = require("./email");
const {
  REQUIRED_BOOKING_FIELDS,
  isEmergency,
  buildExtractionPrompt,
  buildReplyPrompt,
  buildGreeting,
} = require("../knowledge/businessScript");

async function persistAppointment(state) {
  const payload = {
    fullName: state.fullName,
    phone: state.phone,
    address: state.address,
    serviceNeeded: state.serviceNeeded,
    preferredDateTime: state.preferredDateTime,
    urgent: state.urgent,
    channel: state.channel || "website",
  };
  const sheetResult = await saveAppointment(payload);
  const emailResult = await sendAppointmentEmail(payload);
  if (!sheetResult.ok) console.error("persistAppointment: Sheets save failed", sheetResult);
  if (!emailResult) console.error("persistAppointment: email send failed");
}

async function persistLead(state) {
  const payload = {
    fullName: state.fullName,
    phone: state.phone,
    serviceNeeded: state.serviceNeeded,
    channel: state.channel || "website",
  };
  const sheetResult = await saveLead(payload);
  const emailResult = await sendLeadEmail(payload);
  if (!sheetResult.ok) console.error("persistLead: Sheets save failed", sheetResult);
  if (!emailResult) console.error("persistLead: email send failed");
}

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

async function handleMessage({ key, channel, message }) {
  const state = getState(key);
  state.channel = channel;
  const isFirstMessage = state.history.length === 0;

  state.history.push({ role: "user", content: message });

  if (isEmergency(message)) {
    state.urgent = true;
    const reply = `That sounds urgent. Please call us right now at ${process.env.BUSINESS_PHONE || "our office"} for immediate help. I have flagged this as priority.${channel === "website" ? " You can also fill in the quick form below so a technician can be dispatched." : " Can you also share your name and address so a technician can be dispatched?"}`;
    state.history.push({ role: "assistant", content: reply });
    saveState(key, state);
    return { reply, booked: false, showForm: channel === "website", urgent: true, tradeGuess: state.tradeGuess, serviceNeeded: state.serviceNeeded };
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

  const shouldShowForm =
    channel === "website" &&
    state.stage !== "booked" &&
    !state.formShown &&
    (state.wantsToBook === true || Boolean(state.serviceNeeded));

  if (shouldShowForm) state.formShown = true;

  const justBooked = readyToBook && state.stage !== "booked";

  if (justBooked) {
    state.stage = "booked";
    await persistAppointment(state);
  } else if (state.wantsToBook === false && state.fullName && state.stage === "new") {
    state.stage = "lead_saved";
    await persistLead(state);
  } else if (state.stage === "new") {
    state.stage = "collecting";
  }

  const replyPrompt = buildReplyPrompt(state, state.tradeGuess, shouldShowForm, channel, justBooked);
  const reply = await generateReply(replyPrompt, state.history);

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

async function submitBookingForm({ key, channel, formData }) {
  const state = getState(key);
  state.channel = channel;

  state.fullName = (formData.fullName || "").trim();
  state.phone = (formData.phone || "").trim();
  state.address = (formData.address || "").trim();
  state.serviceNeeded = (formData.serviceNeeded || "").trim();
  state.preferredDateTime = (formData.preferredDateTime || "").trim();
  state.urgent = Boolean(formData.urgent);
  state.tradeGuess = formData.tradeGuess || state.tradeGuess;
  state.stage = "booked";

  await persistAppointment(state);

  state.history.push({ role: "assistant", content: `[Booking confirmed via form: ${state.serviceNeeded} at ${state.address} on ${state.preferredDateTime}]` });
  saveState(key, state);

  const urgentLine = state.urgent
    ? " This has been flagged as a priority and our team will reach out shortly."
    : ` Our office will call ${state.phone} shortly to confirm the exact time.`;

  const reply = `You are all set, ${state.fullName}. I have booked ${state.serviceNeeded} at ${state.address} for ${state.preferredDateTime}.${urgentLine}`;

  return { reply, booked: true };
}

module.exports = { handleMessage, submitBookingForm };
