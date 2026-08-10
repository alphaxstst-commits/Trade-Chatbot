// knowledge/businessScript.js
const trades = require("./trades.json");

const REQUIRED_BOOKING_FIELDS = ["fullName", "phone", "address", "serviceNeeded", "preferredDateTime"];

// Mock company identity for the demo — override any of these with real env
// vars later (BUSINESS_NAME, BOT_NAME, etc.) once this becomes a real client site.
const COMPANY_NAME = process.env.BUSINESS_NAME || "Ironclad Home Services";
const BOT_NAME = process.env.BOT_NAME || "Nova";
const TAGLINE = process.env.BUSINESS_TAGLINE || "Plumbing · HVAC · Excavation · Electrical · Handyman";

const businessInfo = () => `
Business name: ${COMPANY_NAME}
Bot persona name: ${BOT_NAME}
Tagline / services: ${TAGLINE}
Phone: ${process.env.BUSINESS_PHONE || "(not set)"}
Email: ${process.env.BUSINESS_EMAIL || "(not set)"}
Service area: ${process.env.BUSINESS_SERVICE_AREA || "(not set)"}
Business hours: ${process.env.BUSINESS_HOURS || "(not set)"}
`.trim();

const EMERGENCY_PATTERNS = [
  /burst pipe/i, /flooding/i, /sewage/i, /no water at all/i,
  /gas smell/i, /no heat.*freez/i, /freez.*no heat/i,
  /structural collapse/i, /fire damage/i, /roof caved/i,
  /no ac.*(heat wave|extreme heat)/i,
  /sparking outlet/i, /burning smell/i, /exposed wire/i, /power out.*whole house/i,
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

function buildExtractionPrompt(state, latestMessage) {
  return `
Extract structured info from the customer's latest message below. Return ONLY a JSON object, nothing else — no explanation, no markdown fences.

Fields to extract (use null for anything not present in the LATEST message):
{
  "fullName": string or null,
  "phone": string or null,
  "address": string or null,
  "serviceNeeded": string or null,
  "preferredDateTime": string or null,
  "wantsToBook": true | false | null,
  "tradeGuess": one of "hvac", "plumbing", "excavation", "electrical", "handyman", or null
}

Already known about this customer:
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

function buildReplyPrompt(state, tradeKey) {
  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const known = REQUIRED_BOOKING_FIELDS.filter((f) => state[f]);

  return `
You are ${BOT_NAME}, the professional AI front-desk assistant for ${COMPANY_NAME} (${TAGLINE}). Reply directly to the customer now — write ONLY the message they should see, nothing else.

BUSINESS INFO
${businessInfo()}

CUSTOMER STATE SO FAR (do not ask about anything already known):
${known.length ? known.map((f) => `- ${f}: ${state[f]}`).join("\n") : "- (nothing confirmed yet)"}

STILL NEEDED before booking: ${missing.length ? missing.join(", ") : "nothing — all required info is present"}

RULES
- If the customer only wants information, answer from the knowledge below — don't push booking fields uninvited.
- If they want to book, tell them you'll pull up the booking form rather than asking questions one by one in chat — the interface shows a form for that.
- Never invent prices or services not listed below.
- Keep it to 2-4 sentences, plain language.
- Never re-introduce yourself mid-conversation — that only happens once, at the very start.

Urgent: ${state.urgent ? "YES — treat as priority" : "no"}

KNOWLEDGE BASE
${knowledgeBlock(tradeKey)}
`.trim();
}

function buildGreeting() {
  return `Hi, I'm ${BOT_NAME} — the virtual assistant for ${COMPANY_NAME}. We handle ${TAGLINE}. How can I help you today?`;
}

module.exports = {
  REQUIRED_BOOKING_FIELDS,
  isEmergency,
  buildExtractionPrompt,
  buildReplyPrompt,
  buildGreeting,
  trades,
  COMPANY_NAME,
  BOT_NAME,
  TAGLINE,
};
