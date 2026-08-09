// knowledge/businessScript.js
// This replaces a single static "script" string with prompt BUILDERS, because
// the bot needs a different, smaller prompt for two different jobs each turn:
//   1. extracting structured facts from the customer's latest message
//   2. writing the next reply, given what's already known
// Keeping these separate (instead of one giant prompt) is what fixes the
// "keeps re-asking / restarts the conversation" problem — see the README.

const trades = require("./trades.json");

const REQUIRED_BOOKING_FIELDS = ["fullName", "phone", "address", "serviceNeeded", "preferredDateTime"];

const businessInfo = () => `
Business name: ${process.env.BUSINESS_NAME || "Our Company"}
Phone: ${process.env.BUSINESS_PHONE || "(not set)"}
Email: ${process.env.BUSINESS_EMAIL || "(not set)"}
Service area: ${process.env.BUSINESS_SERVICE_AREA || "(not set)"}
Business hours: ${process.env.BUSINESS_HOURS || "(not set)"}
`.trim();

// Simple deterministic emergency check — NOT left to the LLM, because a missed
// emergency is too costly to trust to a probabilistic classifier alone.
const EMERGENCY_PATTERNS = [
  /burst pipe/i, /flooding/i, /sewage/i, /no water at all/i,
  /gas smell/i, /no heat.*freez/i, /freez.*no heat/i,
  /structural collapse/i, /fire damage/i, /roof caved/i,
  /no ac.*(heat wave|extreme heat)/i,
];

function isEmergency(message) {
  return EMERGENCY_PATTERNS.some((re) => re.test(message));
}

function knowledgeBlock(tradeKey) {
  const keys = tradeKey && trades[tradeKey] ? [tradeKey] : Object.keys(trades);
  return keys
    .map((k) => {
      const t = trades[k];
      const services = t.services
        .map((s) => `- ${s.name}: ${s.description} | Price: ${s.typicalPriceRange} | Emergency: ${s.emergencyAvailable ? "yes" : "no"}`)
        .join("\n");
      const faqs = t.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n");
      return `### ${t.trade}\n${t.summary}\nServices:\n${services}\nFAQs:\n${faqs}`;
    })
    .join("\n\n");
}

/**
 * Prompt for CALL #1: pure structured extraction. Ask the model to return
 * ONLY JSON — no conversation, no filler — describing what the LATEST
 * message adds to what we already know. This keeps extraction reliable
 * because the model isn't also trying to be chatty at the same time.
 */
function buildExtractionPrompt(state, latestMessage) {
  return `
Extract structured info from the customer's latest message below. Return ONLY a JSON object, nothing else — no explanation, no markdown fences.

Fields to extract (use null for anything not present in the LATEST message):
{
  "fullName": string or null,
  "phone": string or null,
  "address": string or null,
  "serviceNeeded": string or null (a short description of the job, e.g. "leaking pipe joint under sink"),
  "preferredDateTime": string or null (in the customer's own words),
  "wantsToBook": true | false | null (true if they clearly want to schedule/book service; false if they're just asking a question; null if unclear),
  "tradeGuess": one of "hvac", "plumbing", "excavation", "homebuilders", or null
}

Already known about this customer (do not re-extract these unless the latest message changes them):
${JSON.stringify(
  {
    fullName: state.fullName,
    phone: state.phone,
    address: state.address,
    serviceNeeded: state.serviceNeeded,
    preferredDateTime: state.preferredDateTime,
  },
  null,
  2
)}

Latest customer message: "${latestMessage}"
`.trim();
}

/**
 * Prompt for CALL #2: generate the actual reply, given explicit "known /
 * still needed" state built by OUR code (not left for the model to infer).
 */
function buildReplyPrompt(state, tradeKey) {
  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const known = REQUIRED_BOOKING_FIELDS.filter((f) => state[f]);

  return `
You are the professional AI front-desk assistant for a blue-collar home services company (plumbing, HVAC, excavation, home builders). Reply directly to the customer now — write ONLY the message they should see, nothing else.

BUSINESS INFO
${businessInfo()}

CUSTOMER STATE SO FAR (do not ask about anything already known — this list is authoritative, trust it over your own reading of the transcript):
${known.length ? known.map((f) => `- ${f}: ${state[f]}`).join("\n") : "- (nothing confirmed yet)"}

STILL NEEDED before booking: ${missing.length ? missing.join(", ") : "nothing — all required info is present"}

RULES
- If the customer only wants information (not booking), just answer their question from the knowledge below — do not push booking fields on them uninvited, but you may mention you can book it if they'd like.
- If they want to book (or already gave booking-relevant info), ask ONLY for the fields listed as "still needed" above, in one short message. Do not ask about anything already known.
- If "still needed" is empty, this message should be a warm confirmation that the appointment is booked — do not ask any further questions.
- If this is flagged urgent below, prioritize telling them to call ${process.env.BUSINESS_PHONE || "the office"} directly right now, in addition to anything else.
- Never invent prices, availability, or services not listed below.
- Keep it to 2-4 sentences, plain language, no jargon.
- Never open with a greeting like "Hi, I'm here to help with..." — that only happens on the very first message of a new conversation, and this isn't necessarily that.

Urgent: ${state.urgent ? "YES — treat as priority" : "no"}

KNOWLEDGE BASE
${knowledgeBlock(tradeKey)}
`.trim();
}

function buildGreeting() {
  return `Hi! I'm the virtual assistant for ${process.env.BUSINESS_NAME || "our company"}. I can help you:\n1) Book a service\n2) Answer a question about pricing or what we offer\n3) Handle something urgent\n\nJust tell me what's going on, in your own words.`;
}

module.exports = {
  REQUIRED_BOOKING_FIELDS,
  isEmergency,
  buildExtractionPrompt,
  buildReplyPrompt,
  buildGreeting,
  trades,
};
