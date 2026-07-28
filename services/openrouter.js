// services/openrouter.js
const axios = require('axios');
const businessScript = require('../knowledge/businessScript');

async function askAI(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: businessScript },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 800,
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0].message.content;
}

module.exports = { askAI };