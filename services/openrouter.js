// services/openrouter.js
const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(prompt, options = {}) {
  const temperature = options.temperature || 0.7;

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: 'deepseek/deepseek-chat-v3-0324:free',
        messages: [
          { role: 'system', content: 'You are a helpful, professional assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: temperature,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
          'X-Title': 'TradePro Chatbot'
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { callOpenRouter };