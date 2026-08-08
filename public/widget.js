// public/widget.js

// ----------------------------------------------
// 1. CONFIG
// ----------------------------------------------
const API_URL = '/api/chat';          // your chat endpoint
const WIDGET_ID = 'trade-chatbot';
const STORAGE_KEY = 'chatbot_session';

// ----------------------------------------------
// 2. STATE MANAGEMENT (sessionStorage)
// ----------------------------------------------
function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { messages: [], state: {} };
  } catch { return { messages: [], state: {} }; }
}

function saveSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// ----------------------------------------------
// 3. UI RENDERING (Dark Theme + Animations)
// ----------------------------------------------
function renderWidget() {
  // Container
  const container = document.createElement('div');
  container.id = WIDGET_ID;
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 380px;
    max-height: 560px;
    background: #1e1e2f;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.7);
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: #e0e0e0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 10000;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid #2a2a3c;
    backdrop-filter: blur(12px);
  `;
  document.body.appendChild(container);

  // Header (animated gradient)
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #2b2b44, #1a1a2e);
    padding: 16px 20px;
    border-bottom: 1px solid #3a3a52;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;">🛠️</span>
      <span style="font-weight:600;font-size:16px;letter-spacing:0.3px;">TradePro Assistant</span>
    </div>
    <button id="close-chatbot" style="background:none;border:none;color:#a0a0c0;font-size:18px;cursor:pointer;">✕</button>
  `;
  container.appendChild(header);

  // Messages area (with scroll)
  const messagesDiv = document.createElement('div');
  messagesDiv.id = 'chat-messages';
  messagesDiv.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #161621;
    scroll-behavior: smooth;
  `;
  container.appendChild(messagesDiv);

  // Input area (dark style)
  const inputArea = document.createElement('div');
  inputArea.style.cssText = `
    padding: 12px 16px;
    background: #1e1e2f;
    border-top: 1px solid #2a2a3c;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  `;
  inputArea.innerHTML = `
    <input id="chat-input" type="text" placeholder="Type your message..." style="
      flex:1;
      background:#2a2a3c;
      border:none;
      border-radius:12px;
      padding:10px 14px;
      color:#e0e0e0;
      font-size:14px;
      outline:none;
      transition:background 0.2s;
    " />
    <button id="send-btn" style="
      background: #3b3b5a;
      border:none;
      border-radius:12px;
      padding:10px 16px;
      color: #c0c0e0;
      font-weight:600;
      cursor:pointer;
      transition: background 0.2s;
    ">Send</button>
  `;
  container.appendChild(inputArea);

  // Restore session messages
  const session = getSession();
  session.messages.forEach(msg => appendMessage(msg.role, msg.text));

  // Auto-focus
  document.getElementById('chat-input').focus();

  // Event listeners
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('close-chatbot').addEventListener('click', () => {
    container.style.display = 'none';
  });
}

// Helper to append a message with animation
function appendMessage(role, text) {
  const messagesDiv = document.getElementById('chat-messages');
  const msgDiv = document.createElement('div');
  msgDiv.style.cssText = `
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 16px;
    margin-bottom: 4px;
    animation: fadeIn 0.3s ease-out;
    word-wrap: break-word;
    align-self: ${role === 'user' ? 'flex-end' : 'flex-start'};
    background: ${role === 'user' ? '#2d2d4a' : '#252540'};
    border: 1px solid ${role === 'user' ? '#3b3b5a' : '#2a2a3c'};
    color: #e8e8f0;
    font-size: 14px;
    line-height: 1.5;
  `;
  // Simple markdown to line breaks
  msgDiv.innerHTML = text.replace(/\n/g, '<br>');
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Animation keyframes (injected once)
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  #chat-input:focus { background: #32324a !important; }
  #send-btn:hover { background: #4b4b6a !important; }
`;
document.head.appendChild(styleSheet);

// ----------------------------------------------
// 4. SEND MESSAGE LOGIC (with state tracking)
// ----------------------------------------------
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Show user message immediately
  appendMessage('user', text);

  // Get current session (state + history)
  const session = getSession();
  session.messages.push({ role: 'user', text });
  saveSession(session);

  // Show typing indicator
  const typingId = showTyping();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        sessionId: session.sessionId || null, // for WhatsApp, we'll use phone number
        state: session.state || {},
        history: session.messages.map(m => m.text) // send last few
      })
    });

    const data = await response.json();
    const botReply = data.reply || "I didn't understand that. Could you rephrase?";

    // Update state from server (if any new fields extracted)
    if (data.state) {
      session.state = data.state;
    }

    // Add bot reply to history
    session.messages.push({ role: 'bot', text: botReply });
    saveSession(session);

    // Remove typing and show bot reply
    removeTyping(typingId);
    appendMessage('bot', botReply);

    // If the bot requested more info (like address), we'll continue next turn
  } catch (err) {
    removeTyping(typingId);
    appendMessage('bot', '⚠️ Sorry, I’m having trouble connecting. Please try again or call us directly.');
    console.error(err);
  }
}

function showTyping() {
  const messagesDiv = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.style.cssText = `
    align-self: flex-start;
    background: #252540;
    padding: 8px 14px;
    border-radius: 16px;
    border: 1px solid #2a2a3c;
    color: #a0a0c0;
    font-size: 14px;
    animation: fadeIn 0.2s ease-out;
  `;
  div.textContent = 'Typing...';
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div.id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ----------------------------------------------
// 5. INIT
// ----------------------------------------------
document.addEventListener('DOMContentLoaded', renderWidget);