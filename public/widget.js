(function () {
  var scriptTag = document.currentScript;
  var API_URL = (scriptTag && scriptTag.getAttribute("data-api")) || "/api/chat";
  var COMPANY = (scriptTag && scriptTag.getAttribute("data-company")) || "Ironclad Home Services";
  var TAGLINE = (scriptTag && scriptTag.getAttribute("data-tagline")) || "Plumbing · HVAC · Excavation · Electrical · Handyman";
  var BOT_NAME = (scriptTag && scriptTag.getAttribute("data-bot-name")) || "Nova";
  var PHONE = (scriptTag && scriptTag.getAttribute("data-phone")) || "(555) 010-2030";
  var ACCENT_1 = (scriptTag && scriptTag.getAttribute("data-accent1")) || "#38bdf8"; // sky blue
  var ACCENT_2 = (scriptTag && scriptTag.getAttribute("data-accent2")) || "#a855f7"; // violet

  var SESSION_KEY = "trade_chatbot_session_id";
  var sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  var TRANSCRIPT_KEY = "trade_chatbot_transcript";
  function loadTranscript() {
    try { return JSON.parse(sessionStorage.getItem(TRANSCRIPT_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveTranscript(t) { sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(t)); }
  var transcript = loadTranscript();

  // ---------------------------------------------------------------- styles
  var style = document.createElement("style");
  style.textContent = `
    .ic-root, .ic-root * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }

    .ic-btn {
      position: fixed; bottom: 22px; right: 22px; width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, ${ACCENT_1}, ${ACCENT_2});
      border: none; cursor: pointer; z-index: 999999; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 0 rgba(56,189,248,0.4); animation: ic-pulse 2.6s infinite;
      transition: transform .2s ease;
    }
    .ic-btn:hover { transform: scale(1.07); }
    .ic-btn svg { width: 28px; height: 28px; }
    @keyframes ic-pulse {
      0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.45); }
      70% { box-shadow: 0 0 0 16px rgba(56,189,248,0); }
      100% { box-shadow: 0 0 0 0 rgba(56,189,248,0); }
    }

    .ic-window {
      position: fixed; bottom: 98px; right: 22px; width: 380px; max-width: 92vw; height: 560px; max-height: 82vh;
      border-radius: 20px; overflow: hidden; z-index: 999999; display: none; flex-direction: column;
      background: rgba(13, 17, 28, 0.86); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 20px 60px rgba(0,0,0,0.55), 0 0 40px rgba(56,189,248,0.08);
      opacity: 0; transform: translateY(16px) scale(.97); transition: opacity .25s ease, transform .25s ease;
    }
    .ic-window.open { display: flex; opacity: 1; transform: translateY(0) scale(1); }

    .ic-bg-blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.35; pointer-events: none; z-index: 0; }
    .ic-blob-1 { width: 220px; height: 220px; background: ${ACCENT_1}; top: -60px; left: -60px; animation: ic-float 9s ease-in-out infinite; }
    .ic-blob-2 { width: 200px; height: 200px; background: ${ACCENT_2}; bottom: -60px; right: -50px; animation: ic-float 11s ease-in-out infinite reverse; }
    @keyframes ic-float { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-18px) translateX(10px); } }

    .ic-header {
      position: relative; z-index: 1; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
    }
    .ic-logo {
      width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
      background: linear-gradient(135deg, ${ACCENT_1}, ${ACCENT_2});
      display: flex; align-items: center; justify-content: center; font-size: 18px;
      box-shadow: 0 0 18px rgba(56,189,248,0.35);
    }
    .ic-header-text { flex: 1; min-width: 0; }
    .ic-company { color: #f1f5f9; font-weight: 700; font-size: 15px; line-height: 1.2; }
    .ic-tagline { color: #94a3b8; font-size: 11px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ic-close { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
    .ic-close:hover { color: #f1f5f9; background: rgba(255,255,255,0.06); }

    .ic-messages { position: relative; z-index: 1; flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .ic-messages::-webkit-scrollbar { width: 6px; }
    .ic-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }

    .ic-msg { max-width: 82%; padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; animation: ic-msg-in .2s ease; }
    @keyframes ic-msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .ic-msg.bot { align-self: flex-start; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; border-bottom-left-radius: 3px; }
    .ic-msg.user { align-self: flex-end; background: linear-gradient(135deg, ${ACCENT_1}, ${ACCENT_2}); color: #0b0f19; font-weight: 500; border-bottom-right-radius: 3px; }

    .ic-quickrow { align-self: flex-start; display: flex; flex-direction: column; gap: 8px; max-width: 90%; margin-top: 2px; }
    .ic-quickbtn {
      display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: #e2e8f0;
      font-size: 13px; cursor: pointer; text-align: left; transition: all .15s ease;
    }
    .ic-quickbtn:hover { background: rgba(255,255,255,0.1); border-color: ${ACCENT_1}; transform: translateX(2px); box-shadow: 0 0 14px rgba(56,189,248,0.15); }
    .ic-quickbtn .ic-emoji { font-size: 16px; }

    .ic-urgent-banner {
      align-self: flex-start; max-width: 90%; padding: 12px 14px; border-radius: 12px; font-size: 13px;
      background: rgba(248, 113, 113, 0.12); border: 1px solid rgba(248,113,113,0.4); color: #fecaca;
    }
    .ic-urgent-banner a { color: #fca5a5; font-weight: 700; text-decoration: none; }

    .ic-form-card {
      align-self: stretch; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 9px;
    }
    .ic-form-title { color: #f1f5f9; font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .ic-form-card input, .ic-form-card select {
      width: 100%; padding: 9px 11px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(0,0,0,0.25); color: #f1f5f9; font-size: 13px; outline: none;
    }
    .ic-form-card input::placeholder { color: #64748b; }
    .ic-form-card input:focus, .ic-form-card select:focus { border-color: ${ACCENT_1}; box-shadow: 0 0 0 3px rgba(56,189,248,0.15); }
    .ic-form-check { display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 12.5px; }
    .ic-form-submit {
      margin-top: 4px; padding: 10px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, ${ACCENT_1}, ${ACCENT_2}); color: #0b0f19; font-weight: 700; font-size: 13px;
      box-shadow: 0 0 18px rgba(56,189,248,0.25); transition: transform .15s ease;
    }
    .ic-form-submit:hover { transform: translateY(-1px); }
    .ic-form-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    .ic-typing { position: relative; z-index: 1; padding: 0 16px 8px; display: none; align-items: center; gap: 5px; }
    .ic-typing span { width: 6px; height: 6px; border-radius: 50%; background: ${ACCENT_1}; animation: ic-bounce 1.2s infinite; }
    .ic-typing span:nth-child(2) { animation-delay: .15s; }
    .ic-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes ic-bounce { 0%,60%,100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-4px); opacity: 1; } }

    .ic-inputrow { position: relative; z-index: 1; display: flex; gap: 8px; padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
    .ic-input {
      flex: 1; padding: 10px 14px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05); color: #f1f5f9; font-size: 13.5px; outline: none;
    }
    .ic-input::placeholder { color: #64748b; }
    .ic-input:focus { border-color: ${ACCENT_1}; }
    .ic-send {
      width: 40px; height: 40px; border-radius: 50%; border: none; cursor: pointer; flex-shrink: 0;
      background: linear-gradient(135deg, ${ACCENT_1}, ${ACCENT_2}); color: #0b0f19; font-size: 16px;
      display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(56,189,248,0.25);
    }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------- markup
  var root = document.createElement("div");
  root.className = "ic-root";

  var button = document.createElement("button");
  button.className = "ic-btn";
  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#0b0f19" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';

  var win = document.createElement("div");
  win.className = "ic-window";
  win.innerHTML = `
    <div class="ic-bg-blob ic-blob-1"></div>
    <div class="ic-bg-blob ic-blob-2"></div>
    <div class="ic-header">
      <div class="ic-logo">🛠️</div>
      <div class="ic-header-text">
        <div class="ic-company">${COMPANY}</div>
        <div class="ic-tagline">${TAGLINE}</div>
      </div>
      <button class="ic-close" aria-label="Close">✕</button>
    </div>
    <div class="ic-messages" id="ic-messages"></div>
    <div class="ic-typing" id="ic-typing"><span></span><span></span><span></span></div>
    <div class="ic-inputrow">
      <input class="ic-input" id="ic-input" placeholder="Type a message..." />
      <button class="ic-send" id="ic-send">➤</button>
    </div>
  `;

  root.appendChild(button);
  root.appendChild(win);
  document.body.appendChild(root);

  var messagesEl = win.querySelector("#ic-messages");
  var inputEl = win.querySelector("#ic-input");
  var sendBtn = win.querySelector("#ic-send");
  var typingEl = win.querySelector("#ic-typing");
  var closeBtn = win.querySelector(".ic-close");

  function scrollDown() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function addBubble(role, text, persist) {
    var div = document.createElement("div");
    div.className = "ic-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollDown();
    if (persist !== false) {
      transcript.push({ kind: "bubble", role: role, text: text });
      saveTranscript(transcript);
    }
  }

  function addUrgentBanner(persist) {
    var div = document.createElement("div");
    div.className = "ic-urgent-banner";
    div.innerHTML = `This sounds urgent. Please call us right now at <a href="tel:${PHONE.replace(/[^0-9+]/g, "")}">${PHONE}</a>. You can also fill the quick form below and we'll prioritize it.`;
    messagesEl.appendChild(div);
    scrollDown();
    if (persist !== false) {
      transcript.push({ kind: "urgent" });
      saveTranscript(transcript);
    }
  }

  function addQuickReplies(persist) {
    var wrap = document.createElement("div");
    wrap.className = "ic-quickrow";
    var options = [
      { emoji: "📅", label: "Book a service", action: "book" },
      { emoji: "❓", label: "Ask a question", action: "ask" },
      { emoji: "🚨", label: "Something urgent", action: "urgent" },
    ];
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "ic-quickbtn";
      btn.innerHTML = '<span class="ic-emoji">' + opt.emoji + "</span><span>" + opt.label + "</span>";
      btn.addEventListener("click", function () {
        wrap.remove();
        handleQuickAction(opt.action);
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollDown();
    if (persist !== false) {
      transcript.push({ kind: "quickrow" });
      saveTranscript(transcript);
    }
  }

  function handleQuickAction(action) {
    if (action === "book") {
      addBubble("user", "Book a service", true);
      showBookingForm();
    } else if (action === "ask") {
      addBubble("user", "I have a question", true);
      addBubble("bot", "Sure — go ahead and ask about pricing, services, or anything else. I'll do my best to answer right here.", true);
      inputEl.focus();
    } else if (action === "urgent") {
      addBubble("user", "This is urgent", true);
      addUrgentBanner(true);
      showBookingForm(true);
    }
  }

  var TRADE_OPTIONS = [
    { value: "plumbing", label: "Plumbing" },
    { value: "hvac", label: "HVAC" },
    { value: "excavation", label: "Excavation" },
    { value: "electrical", label: "Electrical" },
    { value: "handyman", label: "Handyman" },
  ];

  function showBookingForm(urgent, persist) {
    var card = document.createElement("div");
    card.className = "ic-form-card";
    var tradeOptionsHtml = TRADE_OPTIONS.map(function (t) { return '<option value="' + t.value + '">' + t.label + "</option>"; }).join("");
    card.innerHTML = `
      <div class="ic-form-title">${urgent ? "Priority booking" : "Book a service"} — quick details</div>
      <input type="text" placeholder="Full name" data-field="fullName" />
      <input type="tel" placeholder="Phone number" data-field="phone" />
      <input type="text" placeholder="Service address" data-field="address" />
      <select data-field="tradeGuess">${tradeOptionsHtml}</select>
      <input type="text" placeholder="What do you need done? (e.g. leaking pipe under sink)" data-field="serviceNeeded" />
      <input type="text" placeholder="Preferred date/time (e.g. tomorrow morning)" data-field="preferredDateTime" />
      <label class="ic-form-check"><input type="checkbox" data-field="urgent" ${urgent ? "checked" : ""} /> This is urgent</label>
      <button class="ic-form-submit">Book appointment</button>
    `;
    messagesEl.appendChild(card);
    scrollDown();
    if (persist !== false) {
      transcript.push({ kind: "form", urgent: !!urgent });
      saveTranscript(transcript);
    }

    var submitBtn = card.querySelector(".ic-form-submit");
    submitBtn.addEventListener("click", async function () {
      var data = {};
      card.querySelectorAll("[data-field]").forEach(function (el) {
        data[el.getAttribute("data-field")] = el.type === "checkbox" ? el.checked : el.value.trim();
      });
      if (!data.fullName || !data.phone || !data.address || !data.serviceNeeded || !data.preferredDateTime) {
        submitBtn.textContent = "Please fill all fields";
        submitBtn.style.background = "#ef4444";
        setTimeout(function () {
          submitBtn.textContent = "Book appointment";
          submitBtn.style.background = "";
        }, 1800);
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = "Booking...";
      try {
        var res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId, bookingForm: data }),
        });
        var result = await res.json();
        card.remove();
        if (result.reply) {
          addBubble("bot", result.reply, true);
        } else {
          addBubble("bot", "Something went wrong submitting that — please call us directly at " + PHONE + ".", true);
        }
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Book appointment";
        addBubble("bot", "Couldn't connect — please try again or call " + PHONE + ".", true);
      }
    });
  }

  function renderRestoredTranscript() {
    transcript.forEach(function (item) {
      if (item.kind === "bubble") addBubble(item.role, item.text, false);
      else if (item.kind === "quickrow") addQuickReplies(false);
      else if (item.kind === "urgent") addUrgentBanner(false);
      else if (item.kind === "form") showBookingForm(item.urgent, false);
    });
  }

  function greet() {
    if (transcript.length === 0) {
      addBubble("bot", `Hi, I'm ${BOT_NAME} — the virtual assistant for ${COMPANY}. We handle ${TAGLINE}. How can I help you today?`, true);
      addQuickReplies(true);
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
  closeBtn.addEventListener("click", function () { win.classList.remove("open"); });

  async function sendFreeText() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    addBubble("user", text, true);
    typingEl.style.display = "flex";

    try {
      var res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      });
      var data = await res.json();
      typingEl.style.display = "none";
      if (data.reply) {
        addBubble("bot", data.reply, true);
      } else {
        addBubble("bot", "Sorry, something went wrong. Please try again or call " + PHONE + ".", true);
      }
    } catch (e) {
      typingEl.style.display = "none";
      addBubble("bot", "Sorry, I couldn't connect. Please try again shortly.", true);
    }
  }

  sendBtn.addEventListener("click", sendFreeText);
  inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") sendFreeText(); });
})();
