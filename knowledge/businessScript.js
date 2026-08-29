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
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return `
Extract structured info from the customer's latest message below. Return ONLY a JSON object, nothing else.

Today's date is ${todayStr}. Use this to resolve any relative or partial dates the customer mentions (e.g. "tomorrow," "next Monday," "5 sep," "in 3 days").

{
  "fullName": string or null,
  "phone": string or null,
  "address": string or null,
  "serviceNeeded": string or null,
  "preferredDateTime": string or null,
  "wantsToBook": true | false | null,
  "tradeGuess": one of "hvac", "plumbing", "excavation", "electrical", "handyman", or null
}

If the latest message mentions a date and/or time for the appointment, normalize "preferredDateTime" into exactly one of these two formats, do not return the customer's raw wording:
- If an exact time is given: "Ddd, Mon D, h:mm AM/PM" (example: "Fri, Sep 5, 11:00 AM")
- If only a rough time of day is given (morning, afternoon, etc, no exact time): "Ddd, Mon D, <bucket>" where bucket is one of: Morning (8am - 11am), Midday (11am - 2pm), Afternoon (2pm - 5pm), Evening (5pm - 7pm), As soon as possible

If no date or time is mentioned in the latest message at all, return null for preferredDateTime, do not guess one.

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

const FIELD_LABELS = {
  fullName: "Name",
  phone: "Phone",
  address: "Address",
  serviceNeeded: "Service",
  preferredDateTime: "Preferred Date/Time",
};

function buildReplyPrompt(state, tradeKey, showForm, channel, justBooked) {
  const missing = REQUIRED_BOOKING_FIELDS.filter((f) => !state[f]);
  const known = REQUIRED_BOOKING_FIELDS.filter((f) => state[f]);

  let flowInstruction;
  if (channel === "website" && showForm) {
    flowInstruction =
      "A booking form is being shown to the customer right now, automatically, at the same time as your reply. Do NOT say you will pull up a form or that a form is coming, it is already visible below your message. Just give one short, warm sentence acknowledging what they need, and mention the form is right there for them to fill in.";
  } else if (channel === "whatsapp" && state.stage !== "booked") {
    const missingTemplate = missing.map((f) => `${FIELD_LABELS[f]}: `).join("\n");
    flowInstruction = `This conversation is happening over WhatsApp text messages only. There is no form, button, or visual interface of any kind, never mention or refer to a "form" or anything they need to "fill out" or "click."

Already known: ${known.length ? known.map((f) => `${FIELD_LABELS[f]}: ${state[f]}`).join(", ") : "nothing yet"}
Still needed: ${missing.length ? missing.map((f) => FIELD_LABELS[f]).join(", ") : "nothing, all required info is present"}

${
  missing.length >= 2
    ? `When 2 or more details are still needed (as is the case now), do NOT ask for them in a prose sentence. Instead, write one short warm opening line, then paste this exact template on its own lines so the customer can copy it and fill it in directly:
${missingTemplate}
Do not add extra punctuation or change the template field names. Only include lines for fields listed as "Still needed" above, never repeat fields already known.`
    : missing.length === 1
    ? `Only one detail is still needed (${FIELD_LABELS[missing[0]]}), just ask for it directly in one short plain sentence, no template needed for a single field.`
    : `All required info is present. This message should be a warm plain-text confirmation that the appointment is booked, do not ask further questions.`
}`;
  } else if (state.stage === "booked" && justBooked) {
    flowInstruction =
      "The appointment was JUST booked in this exact turn. Confirm it clearly once, in plain text, stating the service, address, and time.";
  } else if (state.stage === "booked" && !justBooked) {
    flowInstruction =
      'The appointment was already booked earlier in this conversation, do NOT restate or re-confirm the booking again unless the customer explicitly asks about their appointment status. Just respond naturally to whatever they just said, based on the actual conversation history you can see. If they said something like "ok" or "thanks" with nothing else to address, a brief natural acknowledgment is enough, e.g. "You are welcome, let us know if you need anything else."';
  } else {
    flowInstruction = "The customer is not in a booking flow right now, just answer their question naturally using the knowledge below, based on the actual conversation history you can see.";
  }

  return `
You are ${BOT_NAME}, the front-desk assistant for ${COMPANY_NAME} (${TAGLINE}). You can see the full conversation history above this message, use it, do not treat each message as if it's the first one. Reply directly to the customer now. Write ONLY the message they should see.

BUSINESS INFO
${businessInfo()}

CONTEXT: the customer's service of interest, from earlier in this same conversation (this stays true for the rest of the conversation, including after booking):
${state.serviceNeeded ? `"${state.serviceNeeded}"` : "not yet mentioned"}
${state.tradeGuess ? `Trade: ${state.tradeGuess}` : ""}

If the customer asks a vague follow-up like "how much is it," "the one I picked," or "that service," they are referring to the CONTEXT above, resolve it yourself using the conversation, never ask them to re-specify something already established here.

${flowInstruction}

STRICT STYLE RULES
- Never use an em dash (—) anywhere in your reply. Use a period or comma instead.
- Never invent prices or services not listed below.
- Keep it to 1-3 sentences, plain and natural, like a real person texting, not a script.
- Never re-introduce yourself mid-conversation.
- Never use hype or salesy phrases like "Great choice!", "Awesome!", "Perfect!", "Wonderful!", "Excellent!", or similar exclamations. You are a calm, competent professional handling a routine service request, not an overeager assistant. Acknowledge plainly instead, e.g. "Got it," "Sure," "Okay," or just move straight into the next step with no acknowledgment word at all.
- Avoid exclamation marks entirely unless relaying something genuinely urgent.

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
