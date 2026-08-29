// services/openrouter.js

async function callModel(messages, { jsonMode = false } = {}) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "https://example.com",
      "X-Title": process.env.SITE_NAME || "Trade Chatbot",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages,
      temperature: jsonMode ? 0 : 0.4,
      max_tokens: jsonMode ? 300 : 500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content || "";
}

async function extractFields(extractionPrompt, latestMessage) {
  const raw = await callModel(
    [
      { role: "system", content: extractionPrompt },
      { role: "user", content: latestMessage },
    ],
    { jsonMode: true }
  );
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("extractFields: failed to parse model output as JSON:", raw);
    return {};
  }
}

async function generateReply(replyPrompt, history) {
  const trimmedHistory = history.slice(-16);
  const messages = [{ role: "system", content: replyPrompt }, ...trimmedHistory];
  return callModel(messages, { jsonMode: false });
}

module.exports = { extractFields, generateReply };
