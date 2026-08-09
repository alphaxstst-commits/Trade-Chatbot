(function () {
  var scriptTag = document.currentScript;
  var API_URL = (scriptTag && scriptTag.getAttribute("data-api")) || "/api/chat";
  var COMPANY_NAME = (scriptTag && scriptTag.getAttribute("data-name")) || "Chat with us";
  var ACCENT = (scriptTag && scriptTag.getAttribute("data-accent")) || "#1d4ed8";

  // --- Session ID: generated once, persisted in sessionStorage so a page
  // refresh doesn't wipe conversation state on the server (this was the
  // cause of the bot "restarting mid-conversation" bug). Cleared when the
  // browser tab is closed, which is the right lifetime for a chat widget.
  var SESSION_KEY = "trade_chatbot_session_id";
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  var style = document.createElement("style");
  style.textContent = `
    .bca-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%;
      background: ${ACCENT}; color: white; border: none; box-shadow: 0 4px 14px rgba(0,0,0,.25);
      cursor: pointer; font-size: 26px; z-index: 999999; display:flex; align-items:center; justify-content:center; }
    .bca-window { position: fixed; bottom: 92px; right: 20px; width: 340px; max-width: 90vw; height: 480px;
      background: #fff; border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,.25); display: none;
      flex-direction: column; overflow: hidden; z-index: 999999; font-family: system-ui, -apple-system, sans-serif; }
    .bca-window.open { display: flex; }
    .bca-header { background: ${ACCENT}; color: white; padding: 14px 16px; font-weight: 600; }
    .bca-messages { flex: 1; overflow-y: auto; padding: 12px; background: #f7f8fa; }
    .bca-msg { margin: 8px 0; max-width: 80%; padding: 9px 12px; border-radius: 12px; font-size: 14px; line-height: 1.4; white-space: pre-wrap; }
    .bca-msg.user { background: ${ACCENT}; color: white; margin-left: auto; border-bottom-right-radius: 2px; }
    .bca-msg.bot { background: #fff; color: #222; border: 1px solid #e5e7eb; border-bottom-left-radius: 2px; }
    .bca-inputrow { display: flex; border-top: 1px solid #e5e7eb; padding: 8px; gap: 6px; }
    .bca-input { flex: 1; border: 1px solid #d1d5db; border-radius: 20px; padding: 8px 12px; font-size: 14px; outline: none; }
    .bca-send { background: ${ACCENT}; color: white; border: none; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; }
    .bca-typing { font-size: 12px; color: #888; padding: 0 12px 8px; }
  `;
  document.head.appendChild(style);

  var button = document.createElement("button");
  button.className = "bca-btn";
  button.innerHTML = "💬";

  var win = document.createElement("div");
  win.className = "bca-window";
  win.innerHTML = `
    <div class="bca-header">${COMPANY_NAME}</div>
    <div class="bca-messages" id="bca-messages"></div>
    <div class="bca-typing" id="bca-typing" style="display:none;">Typing…</div>
    <div class="bca-inputrow">
      <input class="bca-input" id="bca-input" placeholder="Type your question..." />
      <button class="bca-send" id="bca-send">➤</button>
    </div>
  `;

  document.body.appendChild(button);
  document.body.appendChild(win);

  var messagesEl = win.querySelector("#bca-messages");
  var inputEl = win.querySelector("#bca-input");
  var sendBtn = win.querySelector("#bca-send");
  var typingEl = win.querySelector("#bca-typing");

  // Restore visible chat bubbles on refresh too, so the UI matches server state.
  var TRANSCRIPT_KEY = "trade_chatbot_transcript";
  function loadTranscript() {
    try {
      return JSON.parse(sessionStorage.getItem(TRANSCRIPT_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveTranscript(t) {
    sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(t));
  }
  var transcript = loadTranscript();

  function addMessage(role, text, persist) {
    var div = document.createElement("div");
    div.className = "bca-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    if (persist !== false) {
      transcript.push({ role: role, text: text });
      saveTranscript(transcript);
    }
  }

  function renderRestoredTranscript() {
    transcript.forEach(function (m) {
      addMessage(m.role, m.text, false);
    });
  }

  function greet() {
    if (transcript.length === 0) {
      addMessage("bot", "Hi! I'm the virtual assistant. Ask me about services, pricing, or say what you need help with.");
    } else {
      renderRestoredTranscript();
    }
  }

  var greeted = false;
  button.addEventListener("click", function () {
    win.classList.toggle("open");
    if (win.classList.contains("open") && !greeted) {
      greet();
      greeted = true;
      inputEl.focus();
    }
  });

  async function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    addMessage("user", text);
    typingEl.style.display = "block";

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      });
      var data = await res.json();
      typingEl.style.display = "none";
      if (data.reply) {
        addMessage("bot", data.reply);
      } else {
        addMessage("bot", "Sorry, something went wrong. Please try again or call us directly.");
      }
    } catch (e) {
      typingEl.style.display = "none";
      addMessage("bot", "Sorry, I couldn't connect. Please try again shortly.");
    }
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });
})();
