// routes/chat.js
const express = require("express");
const router = express.Router();
const { handleMessage, submitBookingForm } = require("../services/agent");

router.post("/", async (req, res) => {
  try {
    const { message, sessionId, bookingForm } = req.body || {};

    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ error: "Missing 'sessionId' — the widget should generate and send one." });
    }

    // Path 1: structured booking form submission (deterministic, no LLM extraction needed)
    if (bookingForm && typeof bookingForm === "object") {
      const required = ["fullName", "phone", "address", "serviceNeeded", "preferredDateTime"];
      const missing = required.filter((f) => !bookingForm[f] || !String(bookingForm[f]).trim());
      if (missing.length) {
        return res.status(400).json({ error: `Missing required booking fields: ${missing.join(", ")}` });
      }
      const result = await submitBookingForm({ key: `web:${sessionId}`, channel: "website", formData: bookingForm });
      return res.json({ reply: result.reply, booked: result.booked });
    }

    // Path 2: normal free-text chat message
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string in request body." });
    }

    const result = await handleMessage({ key: `web:${sessionId}`, channel: "website", message });
    return res.json({ reply: result.reply, booked: result.booked });
  } catch (err) {
    console.error("routes/chat.js error:", err);
    return res.status(500).json({ error: "Something went wrong generating a reply." });
  }
});

module.exports = router;
