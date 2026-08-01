// ---------- JavaScript logic ----------
  const messagesDiv = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const closeBtn = document.getElementById('chat-close');
  const bookBtn = document.getElementById('chat-book');
  const bookingForm = document.getElementById('booking-form');
  const bookSubmit = document.getElementById('book-submit');
  const bookCancel = document.getElementById('book-cancel');

  // This is what was missing: an actual running record of the conversation
  let conversationHistory = [];

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
        body: JSON.stringify({ message: text, history: conversationHistory }),
      });
      const data = await res.json();
      if (data.reply) {
        addMessage('ai', data.reply);
        // Record this turn so the NEXT message includes it
        conversationHistory.push({ role: 'user', content: text });
        conversationHistory.push({ role: 'assistant', content: data.reply });
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