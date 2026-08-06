const axios = require('axios');

let businessScript = "You are a helpful assistant for a contracting company.";
try {
  businessScript = require('../knowledge/businessScript');
} catch (e) {
  console.warn('Failed to load businessScript, using fallback.');
}

async function askAI(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: businessScript },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free';
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is missing!');
    return "We're experiencing technical difficulties. Please call our office for immediate assistance.";
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages,
        temperature: 0.3,
        max_tokens: 150,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 6000,
      }
    );

    let reply = response.data.choices[0].message.content || '';
    reply = reply.replace(/[*_`#]/g, '');
    reply = reply.replace(/\n{2,}/g, '\n\n');
    return reply.trim() || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    // Log the full error response for debugging
    console.error('OpenRouter error:', error.response?.data || error.message);
    return "I apologize, but I'm having trouble connecting right now. Please call our office at (555) 123-4567 for immediate assistance, or try again in a moment.";
  }
}

module.exports = { askAI };