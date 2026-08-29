// knowledge/businessScript.js
const trades = require("./trades.json");

const REQUIRED_BOOKING_FIELDS = ["fullName", "phone", "address", "serviceNeeded", "preferredDateTime"];

const COMPANY_NAME = process.env.BUSINESS_NAME || "Ironclad Home Services";
const BOT_NAME = process.env.BOT_NAME || "Nova";
const TAGLINE = process.env.BUSINESS_TAGLINE || "Plumbing, HVAC, Excavation, Electrical, Handyman";

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
Extract structured info from the customer's latest message below. Return ONLY a JSON object, nothing else.

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

/**
 * @param {object} state
 * @param {string} tradeKey
 * @param {boolean} showForm - only meaningful when channel === "website"
 * @param {string} channel - "website" | "whatsapp"
 */
function buildReplyPrompt(state, tradeKey, showForm, channel) {
  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const known = REQUIRED_BOOKING_FIELDS.filter((f) => state[f]);

  let flowInstruction;
  if (channel === "website" && showForm) {
    flowInstruction =
      "A booking form is being shown to the customer right now, automatically, at the same time as your reply. Do NOT say you will pull up a form or that a form is coming, it is already visible below your message. Just give one short, warm sentence acknowledging what they need, and mention the form is right there for them to fill in.";
  } else if (channel === "whatsapp") {
    flowInstruction = `This conversation is happening over WhatsApp text messages only. There is no form, button, or visual interface of any kind, never mention or refer to a "form" or anything they need to "fill out" or "click." If they want to book, collect the missing details below directly through normal conversation, asking for what's still needed in plain text, one or two items per message.

Already known: ${known.length ? known.map((f) => `${f}: ${state[f]}`).join(", ") : "nothing yet"}
Still needed: ${missing.length ? missing.join(", ") : "nothing, all required info is present"}

If nothing is still needed, this message should be a warm plain-text confirmation that the appointment is booked, do not ask further questions.`;
  } else {
    flowInstruction = "The customer is not in a booking flow right now, just answer their question naturally using the knowledge below.";
  }

  return `
You are ${BOT_NAME}, the front-desk assistant for ${COMPANY_NAME} (${TAGLINE}). Reply directly to the customer now. Write ONLY the message they should see.

BUSINESS INFO
${businessInfo()}

CONTEXT: the customer's service of interest, from earlier in this same conversation (this stays true for the rest of the conversation, including after booking):
${state.serviceNeeded ? `"${state.serviceNeeded}"` : "not yet mentioned"}
${state.tradeGuess ? `Trade: ${state.tradeGuess}` : ""}
${state.stage === "booked" ? "This has already been booked. If they ask about cost, timing, or details of it, they mean this service. Answer directly using the knowledge below, do not ask them to repeat or clarify what service they mean." : ""}

If the customer asks a vague follow-up like "how much is it," "the one I picked," or "that service," they are referring to the CONTEXT above, resolve it yourself using the conversation, never ask them to re-specify something already established here.

${flowInstruction}

STRICT STYLE RULES
- Never use an em dash (—) anywhere in your reply. Use a period or comma instead.
- Never invent prices or services not listed below.
- Keep it to 1-3 sentences, plain and natural, like a real person texting, not a script.
- Never re-introduce yourself mid-conversation.

KNOWLEDGE BASE
${knowledgeBlock(tradeKey)}
`.trim();
}

function buildGreeting() {
  return `Hi, I am ${BOT_NAME}, the assistant for ${COMPANY_NAME}. We handle ${TAGLINE}. How can I help you today?`;
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