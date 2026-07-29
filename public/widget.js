// public/widget.js
(function() {
  const API_BASE = window.CHAT_API_BASE || '/api';

  // Create floating button
  const btn = document.createElement('div');
  btn.id = 'chat-widget-toggle';
  btn.innerHTML = '💬';
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    width: 60px; height: 60px; border-radius: 50%;
    background: #2563eb; color: white; font-size: 30px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999; transition: transform 0.2s;
  `;
  btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
  btn.onmouseout = () => btn.style.transform = 'scale(1)';
  document.body.appendChild(btn);

  // Chat window
  const chatWindow = document.createElement('div');
  chatWindow.id = 'chat-widget-window';
  chatWindow.style.cssText = `
    position: fixed; bottom: 90px; right: 20px;
    width: 380px; max-width: 92vw; height: 520px;
    background: white; border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    display: none; flex-direction: column;
    overflow: hidden; z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid #e5e7eb;
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(chatWindow);

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bounceIn {
      0% { transform: scale(0.8); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    .chat-message {
      padding: 10px 14px;
      border-radius: 18px;
      margin: 6px 0;
      max-width: 80%;
      word-wrap: break-word;
      animation: bounceIn 0.2s ease;
    }
    .chat-message.user {
      background: #2563eb; color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    .chat-message.ai {
      background: #f3f4f6; color: #1f2937;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .chat-message.system {
      background: #fef3c7; color: #92400e;
      align-self: center;
      font-size: 12px;
      max-width: 90%;
    }
    .chat-message.error {
      background: #fee2e2; color: #991b1b;
      align-self: center;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // Chat window HTML
  chatWindow.innerHTML = `
    <div style="background:#2563eb; color:white; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
      <span style="font-weight:600;">Summit Trades AI</span>
      <div>
        <span id="chat-book" style="cursor:pointer; margin-right:12px; font-size:14px; background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:12px;">📅 Book</span>
        <span id="chat-close" style="cursor:pointer; font-size:20px;">✕</span>
      </div>
    </div>
    <div id="chat-messages" style="flex:1; padding:12px; overflow-y:auto; display:flex; flex-direction:column; background:#f9fafb;"></div>
    <div style="display:flex; border-top:1px solid #e5e7eb; padding:8px; flex-shrink:0;">
      <input id="chat-input" type="text" placeholder="Ask about plumbing, HVAC..." style="flex:1; border:none; outline:none; padding:8px 12px; border-radius:20px; background:#f3f4f6; font-size:14px;">
      <button id="chat-send" style="background:#2563eb; color:white; border:none; border-radius:50%; width:40px; height:40px; margin-left:8px; cursor:pointer; font-size:18px;">➤</button>
    </div>
    <!-- Booking form (hidden by default) -->
    <div id="booking-form" style="display:none; padding:16px; background:#f9fafb; border-top:1px solid #e5e7eb; flex-shrink:0;">
      <h4 style="margin:0 0 10px; font-size:16px;">Book Appointment</h4>
      <input id="book-name" placeholder="Full Name" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
      <input id="book-phone" placeholder="Phone" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
      <input id="book-email" placeholder="Email" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
      <select id="book-service" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
        <option value="">Select Service</option>
        <option>Plumbing</option>
        <option>HVAC</option>
        <option>Excavation</option>
        <option>Earthwork</option>
        <option>Mulching</option>
      </select>
      <input id="book-date" type="date" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
      <input id="book-time" type="time" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box;">
      <textarea id="book-notes" placeholder="Notes" style="width:100%; padding:8px; margin-bottom:8px; border:1px solid #d1d5db; border-radius:6px; box-sizing:border-box; height:50px;"></textarea>
      <button id="book-submit" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; width:100%;">Submit</button>
      <button id="book-cancel" style="background:#e5e7eb; color:#1f2937; border:none; padding:8px; border-radius:6px; cursor:pointer; width:100%; margin-top:6px;">Cancel</button>
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
      // Hide booking form when opening chat
      bookingForm.style.display = 'none';
    }
  });
  closeBtn.addEventListener('click', () => chatWindow.style.display = 'none');

  // Book toggle
  bookBtn.addEventListener('click', () => {
    if (bookingForm.style.display === 'none') {
      bookingForm.style.display = 'block';
    } else {
      bookingForm.style.display = 'none';
    }
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
        addMessage('error', 'No response from AI.');
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
        // clear form
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