// routes/chat.js
const express = require('express');
const router = express.Router();
const { askAI } = require('../services/openrouter');

router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const reply = await askAI(message, history);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI failed' });
  }
});

module.exports = router;