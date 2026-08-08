// public/widget.js

const API_URL = '/api/chat';
const STORAGE_KEY = 'tradebot_session';

// ---- STATE MANAGEMENT ----
function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch (e) { console.warn('Session parse error:', e); }
  return { messages: [], state: {} };
}

function saveSession(session) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) { console.warn('Session save error:', e); }
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// ---- UI RENDERING ----
function renderWidget() {
  // Container
  const container = document.createElement('div');
  container.id = 'trade-chatbot';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 400px;
    max-height: 600px;
    background: #1a1a2e;
    border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.8);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e8e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100000;
    border: 1px solid #2a2a4a;
  `;
  document.body.appendChild(container);

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    background: linear-gradient(135deg, #1e1e3a, #12122a);
    padding: 16px 20px;
    border-bottom: 1px solid #2a2a4a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  `;
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:22px;">🛠️</span>
      <div>
        <div style="font-weight:600;font-size:15px;color:#e8e8f0;">TradePro AI</div>
        <div style="font-size:11px;color:#7a7aaa;">Online — Ready to help</div>
      </div>
    </div>
    <button id="close-chatbot" style="background:none;border:none;color:#6a6a8a;font-size:18px;cursor:pointer;padding:4px 8px;">✕</button>
  `;
  container.appendChild(header);

  // Messages area
  const messagesDiv = document.createElement('div');
  messagesDiv.id = 'chat-messages';
  messagesDiv.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: #13131f;
    min-height: 200px;
    max-height: 400px;
  `;
  container.appendChild(messagesDiv);

  // Input area
  const inputArea = document.createElement('div');
  inputArea.style.cssText = `
    padding: 12px 16px;
    background: #1a1a2e;
    border-top: 1px solid #2a2a4a;
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  `;
  inputArea.innerHTML = `
    <input id="chat-input" type="text" placeholder="Type your message..." style="
      flex:1;
      background:#252540;
      border:none;
      border-radius:12px;
      padding:10px 14px;
      color:#e8e8f0;
      font-size:14px;
      outline:none;
      transition:background 0.2s;
    " />
    <button id="send-btn" style="
      background: #3a3a5a;
      border:none;
      border-radius:12px;
      padding:10px 18px;
      color: #c0c0e0;
      font-weight:600;
      cursor:pointer;
      transition:all 0.2s;
    ">Send</button>
  `;
  container.appendChild(inputArea);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #chat-messages::-webkit-scrollbar { width: 4px; }
    #chat-messages::-webkit-scrollbar-track { background: #1a1a2e; }
    #chat-messages::-webkit-scrollbar-thumb { background: #3a3a5a; border-radius: 4px; }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .message-bubble {
      animation: fadeInUp 0.3s ease-out;
    }
    #chat-input:focus { background: #2d2d4a !important; }
    #send-btn:hover { background: #4a4a6a !important; }
    .typing-dots::after {
      content: '...';
      animation: dots 1.2s steps(3, end) infinite;
    }
    @keyframes dots {
      0% { content: ''; }
      33% { content: '.'; }
      66% { content: '..'; }
      100% { content: '...'; }
    }
  `;
  document.head.appendChild(style);

  // Restore session
  const session = getSession();
  session.messages.forEach(msg => appendMessage(msg.role, msg.text));

  // Event listeners
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('close-chatbot').addEventListener('click', () => {
    container.style.display = 'none';
  });

  // Focus input
  setTimeout(() => document.getElementById('chat-input').focus(), 100);
}

// ---- APPEND MESSAGE ----
function appendMessage(role, text) {
  const messagesDiv = document.getElementById('chat-messages');
  if (!messagesDiv) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = 'message-bubble';
  const isUser = role === 'user';
  msgDiv.style.cssText = `
    max-width: 85%;
    padding: 10px 14px;
    border-radius: ${isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
    margin-bottom: 2px;
    align-self: ${isUser ? 'flex-end' : 'flex-start'};
    background: ${isUser ? '#2a2a4a' : '#1f1f38'};
    border: 1px solid ${isUser ? '#3a3a5a' : '#2a2a42'};
    color: #e8e8f0;
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  `;
  // Convert markdown-like bold and line breaks
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  msgDiv.innerHTML = formatted;
  messagesDiv.appendChild(msgDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ---- TYPING INDICATOR ----
function showTyping() {
  const messagesDiv = document.getElementById('chat-messages');
  if (!messagesDiv) return null;
  const div = document.createElement('div');
  div.id = 'typing-indicator';
  div.className = 'message-bubble';
  div.style.cssText = `
    align-self: flex-start;
    background: #1f1f38;
    padding: 10px 16px;
    border-radius: 16px 16px 16px 4px;
    border: 1px solid #2a2a42;
    color: #8888aa;
    font-size: 13px;
  `;
  div.innerHTML = 'Typing <span class="typing-dots"></span>';
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return div;
}

function removeTyping(el) {
  if (el && el.parentNode) el.remove();
}

// ---- SEND MESSAGE ----
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  // Show user message
  appendMessage('user', text);

  // Get session
  const session = getSession();
  session.messages.push({ role: 'user', text });
  saveSession(session);

  // Show typing indicator
  const typingEl = showTyping();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        state: session.state || {},
        history: session.messages.map(m => m.text)
      })
    });

    const data = await response.json();
    const botReply = data.reply || "Sorry, I didn't understand that. Could you rephrase?";

    // Update state
    if (data.state) {
      session.state = data.state;
    }
    session.messages.push({ role: 'bot', text: botReply });
    saveSession(session);

    // Remove typing and show reply
    removeTyping(typingEl);
    appendMessage('bot', botReply);

  } catch (err) {
    console.error('Chat error:', err);
    removeTyping(typingEl);
    appendMessage('bot', '⚠️ Sorry, I\'m having trouble connecting. Please try again or call us directly.');
  }
}

// ---- OPEN/CLOSE TOGGLE (Floating button) ----
function createToggleButton() {
  const btn = document.createElement('button');
  btn.id = 'chat-toggle';
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3a3a6a, #2a2a4a);
    border: 2px solid #4a4a7a;
    color: white;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    z-index: 99999;
    transition: all 0.3s ease;
  `;
  btn.textContent = '💬';
  document.body.appendChild(btn);

  let isOpen = true;

  btn.addEventListener('click', () => {
    const widget = document.getElementById('trade-chatbot');
    if (isOpen) {
      widget.style.display = 'none';
      btn.textContent = '💬';
      btn.style.background = 'linear-gradient(135deg, #3a3a6a, #2a2a4a)';
    } else {
      widget.style.display = 'flex';
      btn.textContent = '✕';
      btn.style.background = 'linear-gradient(135deg, #5a2a2a, #4a1a1a)';
      document.getElementById('chat-input').focus();
    }
    isOpen = !isOpen;
  });
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  renderWidget();
  createToggleButton();
});