// routes/whatsappWebhook.js
const express = require("express");
const router = express.Router();
const { handleMessage } = require("../services/agent");

// ---------------------------------------------------------------------------
// TODO INTEGRATION POINT #2
// Replace this with your real services/whatsapp.js send function — I don't
// have that file, so this is a safe placeholder using the raw Graph API call.
// If your services/whatsapp.js already exports something like
// `sendMessage(to, text)`, just delete this function and
// `const { sendMessage } = require("../services/whatsapp");` instead.
// ---------------------------------------------------------------------------
async function sendMessage(to, text) {
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!res.ok) console.error("WhatsApp send error:", await res.text());
}
// ---------------------------------------------------------------------------

// Meta webhook verification handshake
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
});

router.post("/", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) return res.status(200).send("ignored"); // status callbacks, not real messages

    const from = message.from;
    const text = message.text?.body || message.button?.text || "";

    if (!text) {
      await sendMessage(from, "Could you send that as a text message so I can help right away?");
      return res.status(200).send("ok");
    }

    const result = await handleMessage({ key: `wa:${from}`, channel: "whatsapp", message: text });
    await sendMessage(from, result.reply);

    return res.status(200).send("ok");
  } catch (err) {
    console.error("routes/whatsappWebhook.js error:", err);
    return res.status(200).send("error handled"); // always 200 so Meta doesn't retry-storm you
  }
});

module.exports = router;
