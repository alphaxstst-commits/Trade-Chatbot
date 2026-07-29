// routes/chat.js
const express = require('express');
const router = express.Router();
const { askAI } = require('../services/openrouter');

router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    const reply = await askAI(message, history);
    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    console.error(err.stack);
    res.status(500).json({ 
      error: 'AI failed', 
      details: err.message 
    });
  }
});

module.exports = router;