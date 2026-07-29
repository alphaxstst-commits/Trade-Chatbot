// public/widget.js
(function() {
  const API_BASE = window.CHAT_API_BASE || '/api';

  // Create floating button – gradient neon glow
  const btn = document.createElement('div');
  btn.id = 'chat-widget-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #6C3CE1, #E94E77);
    color: white; font-size: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 20px rgba(108, 60, 225, 0.5);
    z-index: 9999; transition: transform 0.25s, box-shadow 0.25s;
    animation: pulse-glow 2s infinite;
  `;
  btn.onmouseover = () => { btn.style.transform = 'scale(1.1)'; btn.style.boxShadow = '0 0 35px rgba(108,60,225,0.8)'; };
  btn.onmouseout = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 0 20px rgba(108,60,225,0.5)'; };
  document.body.appendChild(btn);

  // Chat window – dark glass
  const chatWindow = document.createElement('div');
  chatWindow.id = 'chat-widget-window';
  chatWindow.style.cssText = `
    position: fixed; bottom: 100px; right: 24px;
    width: 400px; max-width: 92vw; height: 560px;
    background: rgba(20, 20, 30, 0.92);
    backdrop-filter: blur(12px);
    border-radius: 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6);
    display: none; flex-direction: column;
    overflow: hidden; z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(255,255,255,0.1);
    animation: slideUp 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.1);
  `;
  document.body.appendChild(chatWindow);

  // CSS animations & dark theme
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      0% { opacity: 0; transform: translateY(30px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(108,60,225,0.4); }
      50% { box-shadow: 0 0 35px rgba(233,78,119,0.6); }
    }
    .chat-message {
      padding: 10px 16px;
      border-radius: 18px;
      margin: 6px 8px;
      max-width: 80%;
      word-wrap: break-word;
      animation: slideUp 0.2s ease;
      font-size: 14px;
      line-height: 1.5;
    }
    .chat-message.user {
      background: linear-gradient(135deg, #6C3CE1, #E94E77);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(108,60,225,0.3);
    }
    .chat-message.ai {
      background: rgba(255,255,255,0.08);
      color: #e8e8e8;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .chat-message.system {
      background: rgba(255,215,0,0.15);
      color: #ffd966;
      align-self: center;
      font-size: 12px;
      max-width: 90%;
      text-align: center;
    }
    .chat-message.error {
      background: rgba(255,0,0,0.15);
      color: #ff6b6b;
      align-self: center;
      font-size: 12px;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 8px; }
  `;
  document.head.appendChild(style);

  // Chat window HTML
  chatWindow.innerHTML = `
    <div style="background: rgba(255,255,255,0.05); backdrop-filter: blur(4px); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink:0;">
      <span style="font-weight:600; font-size:18px; background: linear-gradient(135deg, #6C3CE1, #E94E77); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Summit Trades AI</span>
      <div style="display:flex; gap:12px; align-items:center;">
        <span id="chat-book" style="cursor:pointer; font-size:13px; background: rgba(255,255,255,0.08); padding:6px 14px; border-radius:20px; color:#ccc; border:1px solid rgba(255,255,255,0.06); transition:0.2s;">📅 Book</span>
        <span id="chat-close" style="cursor:pointer; font-size:22px; color:#aaa; line-height:1;">✕</span>
      </div>
    </div>
    <div id="chat-messages" style="flex:1; padding:16px 12px; overflow-y:auto; display:flex; flex-direction:column; background: transparent;"></div>
    <div style="display:flex; border-top:1px solid rgba(255,255,255,0.06); padding:12px 16px; gap:10px; flex-shrink:0; background: rgba(0,0,0,0.2);">
      <input id="chat-input" type="text" placeholder="Ask about plumbing, HVAC..." style="flex:1; border:none; outline:none; padding:10px 16px; border-radius:40px; background: rgba(255,255,255,0.06); color:#eee; font-size:14px; border:1px solid rgba(255,255,255,0.05);">
      <button id="chat-send" style="background: linear-gradient(135deg, #6C3CE1, #E94E77); color:white; border:none; border-radius:50%; width:44px; height:44px; cursor:pointer; font-size:20px; transition:0.2s; box-shadow:0 2px 12px rgba(108,60,225,0.3);">➤</button>
    </div>
    <div id="booking-form" style="display:none; padding:20px; background: rgba(0,0,0,0.4); border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0;">
      <h4 style="margin:0 0 12px; color:#eee; font-weight:500;">Book Appointment</h4>
      <input id="book-name" placeholder="Full Name" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
      <input id="book-phone" placeholder="Phone" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
      <input id="book-email" placeholder="Email" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
      <select id="book-service" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
        <option value="">Select Service</option>
        <option>Plumbing</option>
        <option>HVAC</option>
        <option>Excavation</option>
        <option>Earthwork</option>
        <option>Mulching</option>
      </select>
      <input id="book-date" type="date" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
      <input id="book-time" type="time" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05);">
      <textarea id="book-notes" placeholder="Notes" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.06); color:#eee; border:1px solid rgba(255,255,255,0.05); height:50px;"></textarea>
      <button id="book-submit" style="background: linear-gradient(135deg, #6C3CE1, #E94E77); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; font-weight:600;">Submit</button>
      <button id="book-cancel" style="background: rgba(255,255,255,0.05); color:#aaa; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; margin-top:8px;">Cancel</button>
    </div>
  `;

  // DOM refs
  const messagesDiv = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const closeBtn = document.getElementById('chat-close');
  const bookBtn = document.getElementById('chat-book');
  const bookingForm = document.getElementById('booking-form');
  const bookSubmit = document.getElementById('book-submit');
  const bookCancel = document.getElementById('book-cancel');

  // Toggle chat
  btn.addEventListener('click', () => {
    if (chatWindow.style.display === 'flex') {
      chatWindow.style.display = 'none';
    } else {
      chatWindow.style.display = 'flex';
      if (messagesDiv.children.length === 0) {
        addMessage('system', 'Hi! How can I help you with plumbing, HVAC, excavation, or land clearing?');
      }
      bookingForm.style.display = 'none';
    }
  });
  closeBtn.addEventListener('click', () => chatWindow.style.display = 'none');

  // Book toggle
  bookBtn.addEventListener('click', () => {
    bookingForm.style.display = bookingForm.style.display === 'none' ? 'block' : 'none';
  });

  // Add message
  function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Send message to AI
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    input.disabled = true;
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: [] }),
      });
      const data = await res.json();
      if (data.reply) {
        addMessage('ai', data.reply);
      } else {
        addMessage('error', data.error || 'No response from AI.');
      }
    } catch (e) {
      addMessage('error', 'Error connecting to server. Please try again.');
    }
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

  // Booking form submit
  bookSubmit.addEventListener('click', async () => {
    const name = document.getElementById('book-name').value.trim();
    const phone = document.getElementById('book-phone').value.trim();
    const email = document.getElementById('book-email').value.trim();
    const service = document.getElementById('book-service').value;
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const notes = document.getElementById('book-notes').value.trim();

    if (!name || !phone || !email || !service || !date || !time) {
      addMessage('system', 'Please fill in all required fields.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, service, date, time, notes }),
      });
      const data = await res.json();
      if (data.success) {
        addMessage('system', 'Appointment booked! Check your email for confirmation.');
        bookingForm.style.display = 'none';
        document.getElementById('book-name').value = '';
        document.getElementById('book-phone').value = '';
        document.getElementById('book-email').value = '';
        document.getElementById('book-service').value = '';
        document.getElementById('book-date').value = '';
        document.getElementById('book-time').value = '';
        document.getElementById('book-notes').value = '';
      } else {
        addMessage('error', 'Failed to book. Please try again.');
      }
    } catch (e) {
      addMessage('error', 'Error booking appointment.');
    }
  });

  bookCancel.addEventListener('click', () => {
    bookingForm.style.display = 'none';
  });
})();