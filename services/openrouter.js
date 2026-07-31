const axios = require('axios');
const businessScript = require('../knowledge/businessScript');

async function askAI(userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: businessScript },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct:free',
        messages,
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    let reply = response.data.choices[0].message.content;

    // Aggressive cleanup: remove all markdown and special characters
    reply = reply.replace(/\*\*/g, '');        // bold
    reply = reply.replace(/\*/g, '');          // italic / bullet
    reply = reply.replace(/\_\_/g, '');        // underline
    reply = reply.replace(/\_/g, '');          // underscore
    reply = reply.replace(/`/g, '');           // code
    reply = reply.replace(/#{1,6}\s/g, '');    // headings
    reply = reply.replace(/^[\*\-]\s/gm, '');  // bullet list markers
    reply = reply.replace(/\n{3,}/g, '\n\n');  // excessive newlines
    // Remove any remaining asterisks or underscores (just in case)
    reply = reply.replace(/[*_]/g, '');

    return reply.trim();
  } catch (error) {
    console.error('OpenRouter error:', error.response?.data || error.message);
    return "I apologize, but I'm having trouble connecting right now. Please call our office at (555) 123-4567 for immediate assistance, or try again in a moment.";
  }
}

module.exports = { askAI };