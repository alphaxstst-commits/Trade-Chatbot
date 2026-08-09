// routes/chat.js
const express = require("express");
const router = express.Router();
const { handleMessage } = require("../services/agent");

router.post("/", async (req, res) => {
  try {
    const { message, sessionId } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string in request body." });
    }
    if (!sessionId || typeof sessionId !== "string") {
      // sessionId must be generated + persisted client-side (see public/widget.js)
      // so the same browser tab keeps talking to the same conversation state.
      return res.status(400).json({ error: "Missing 'sessionId' — the widget should generate and send one." });
    }

    const result = await handleMessage({ key: `web:${sessionId}`, channel: "website", message });
    return res.json({ reply: result.reply, booked: result.booked });
  } catch (err) {
    console.error("routes/chat.js error:", err);
    return res.status(500).json({ error: "Something went wrong generating a reply." });
  }
});

module.exports = router;
