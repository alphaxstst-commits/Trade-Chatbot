// public/widget.js – Fully responsive with scrollable booking form
(function() {
  const API_BASE = window.CHAT_API_BASE || '/api';

  // Floating button
  const btn = document.createElement('div');
  btn.id = 'chat-widget-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px;
    width: 64px; height: 64px; border-radius: 50%;
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    color: white; font-size: 32px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 0 25px rgba(59, 130, 246, 0.6);
    z-index: 9999; transition: transform 0.3s, box-shadow 0.3s;
    animation: pulse-blue 2.5s infinite;
  `;
  btn.onmouseover = () => {
    btn.style.transform = 'scale(1.1)';
    btn.style.boxShadow = '0 0 40px rgba(59,130,246,0.9)';
  };
  btn.onmouseout = () => {
    btn.style.transform = 'scale(1)';
    btn.style.boxShadow = '0 0 25px rgba(59,130,246,0.6)';
  };
  document.body.appendChild(btn);

  // Chat window
  const chatWindow = document.createElement('div');
  chatWindow.id = 'chat-widget-window';
  chatWindow.style.cssText = `
    position: fixed; bottom: 100px; right: 24px;
    width: 400px;
    max-width: calc(100vw - 48px);
    height: 560px;
    max-height: calc(100vh - 140px);
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(16px);
    border-radius: 24px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.7);
    display: none; flex-direction: column;
    overflow: hidden;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid rgba(59, 130, 246, 0.25);
    animation: slideUpBlue 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  `;
  document.body.appendChild(chatWindow);

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUpBlue {
      0% { opacity: 0; transform: translateY(30px) scale(0.96); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse-blue {
      0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.4); }
      50% { box-shadow: 0 0 40px rgba(59,130,246,0.8); }
    }
    .chat-message {
      padding: 10px 16px;
      border-radius: 18px;
      margin: 6px 8px;
      max-width: 80%;
      word-wrap: break-word;
      animation: slideUpBlue 0.25s ease;
      font-size: 14px;
      line-height: 1.5;
    }
    .chat-message.user {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(59,130,246,0.3);
    }
    .chat-message.ai {
      background: rgba(255,255,255,0.06);
      color: #e2e8f0;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .chat-message.system {
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
      align-self: center;
      font-size: 12px;
      max-width: 90%;
      text-align: center;
      border: 1px solid rgba(59,130,246,0.1);
    }
    .chat-message.error {
      background: rgba(239,68,68,0.12);
      color: #fca5a5;
      align-self: center;
      font-size: 12px;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 8px; }
    .chat-input {
      flex:1; border:none; outline:none; padding:10px 16px; border-radius:40px;
      background: rgba(255,255,255,0.04); color:#e2e8f0; font-size:14px;
      border:1px solid rgba(59,130,246,0.15);
      transition: border 0.2s;
    }
    .chat-input:focus {
      border-color: rgba(59,130,246,0.5);
      background: rgba(255,255,255,0.06);
    }
    .chat-input::placeholder {
      color: #64748b;
    }
    /* Booking form scroll container */
    .booking-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0 4px;
    }
    .booking-scroll::-webkit-scrollbar {
      width: 3px;
    }
    .booking-scroll::-webkit-scrollbar-thumb {
      background: rgba(59,130,246,0.3);
      border-radius: 8px;
    }

    @media (max-width: 480px) {
      #chat-widget-window {
        bottom: 80px !important;
        right: 12px !important;
        left: 12px !important;
        width: auto !important;
        max-width: none !important;
        height: 60vh !important;
        max-height: 70vh !important;
        border-radius: 16px !important;
      }
      #chat-widget-toggle {
        width: 56px !important;
        height: 56px !important;
        font-size: 26px !important;
        bottom: 16px !important;
        right: 16px !important;
      }
      .chat-message {
        font-size: 13px !important;
        padding: 8px 12px !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Chat HTML – booking form wrapped in a scrollable div
  chatWindow.innerHTML = `
    <div style="background: rgba(30,58,138,0.3); backdrop-filter: blur(4px); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(59,130,246,0.15); flex-shrink:0;">
      <span style="font-weight:600; font-size:18px; background: linear-gradient(135deg, #60a5fa, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Summit Trades AI</span>
      <div style="display:flex; gap:12px; align-items:center;">
        <span id="chat-book" style="cursor:pointer; font-size:13px; background: rgba(59,130,246,0.15); padding:6px 14px; border-radius:20px; color:#93c5fd; border:1px solid rgba(59,130,246,0.15);">📅 Book</span>
        <span id="chat-close" style="cursor:pointer; font-size:22px; color:#94a3b8; line-height:1;">✕</span>
      </div>
    </div>
    <div id="chat-messages" style="flex:1; padding:16px 12px; overflow-y:auto; display:flex; flex-direction:column; background: transparent;"></div>
    <div style="display:flex; border-top:1px solid rgba(59,130,246,0.1); padding:12px 16px; gap:10px; flex-shrink:0; background: rgba(0,0,0,0.2);">
      <input id="chat-input" class="chat-input" type="text" placeholder="Ask about plumbing, HVAC...">
      <button id="chat-send" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color:white; border:none; border-radius:50%; width:44px; height:44px; cursor:pointer; font-size:20px; box-shadow:0 2px 12px rgba(59,130,246,0.3);">➤</button>
    </div>
    <div id="booking-form" style="display:none; flex-direction:column; background: rgba(0,0,0,0.4); border-top:1px solid rgba(59,130,246,0.1); flex-shrink:0; max-height:60%; overflow:hidden;">
      <div class="booking-scroll" style="padding:16px 20px;">
        <h4 style="margin:0 0 12px; color:#e2e8f0; font-weight:500;">Book Appointment</h4>
        <input id="book-name" placeholder="Full Name" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
        <input id="book-phone" placeholder="Phone" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
        <input id="book-email" placeholder="Email" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
        <select id="book-service" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
          <option value="">Select Service</option>
          <option>Plumbing</option>
          <option>HVAC</option>
          <option>Excavation</option>
          <option>Earthwork</option>
          <option>Mulching</option>
        </select>
        <input id="book-date" type="date" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
        <input id="book-time" type="time" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); box-sizing:border-box;">
        <textarea id="book-notes" placeholder="Notes" style="width:100%; padding:10px; margin-bottom:8px; border:none; border-radius:8px; background: rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid rgba(59,130,246,0.15); height:50px; box-sizing:border-box;"></textarea>
        <button id="book-submit" style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; font-weight:600;">Submit</button>
        <button id="book-cancel" style="background: rgba(255,255,255,0.04); color:#94a3b8; border:none; padding:10px; border-radius:8px; cursor:pointer; width:100%; margin-top:8px;">Cancel</button>
      </div>
    </div>
  `;

  // ---------- JavaScript logic ----------
  const messagesDiv = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const closeBtn = document.getElementById('chat-close');
  const bookBtn = document.getElementById('chat-book');
  const bookingForm = document.getElementById('booking-form');
  const bookSubmit = document.getElementById('book-submit');
  const bookCancel = document.getElementById('book-cancel');

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

  bookBtn.addEventListener('click', () => {
    if (bookingForm.style.display === 'none') {
      bookingForm.style.display = 'flex';
    } else {
      bookingForm.style.display = 'none';
    }
  });

  function addMessage(type, text) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

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