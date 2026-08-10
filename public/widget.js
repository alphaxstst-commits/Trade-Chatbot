(function () {
  var scriptTag = document.currentScript;
  var API_URL = (scriptTag && scriptTag.getAttribute("data-api")) || "/api/chat";
  var COMPANY = (scriptTag && scriptTag.getAttribute("data-company")) || "Ironclad Home Services";
  var TAGLINE = (scriptTag && scriptTag.getAttribute("data-tagline")) || "Plumbing, HVAC, Excavation, Electrical, Handyman";
  var BOT_NAME = (scriptTag && scriptTag.getAttribute("data-bot-name")) || "Nova";
  var PHONE = (scriptTag && scriptTag.getAttribute("data-phone")) || "(555) 010-2030";
  // Single premium accent (brass/amber) instead of a rainbow gradient.
  var ACCENT = (scriptTag && scriptTag.getAttribute("data-accent")) || "#c9974c";
  var ACCENT_SOFT = "rgba(201,151,76,0.14)";

  // Every page load starts a brand-new conversation on purpose — a plain
  // in-memory id/array naturally resets on reload since the script re-runs
  // from scratch. (Previously this used sessionStorage to survive refreshes
  // mid-conversation; that's intentionally removed now per your request.)
  var sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  var transcript = [];
  var formAlreadyShown = false;

  // ---------------------------------------------------------------- styles
  var style = document.createElement("style");
  style.textContent = `
    .ic-root, .ic-root * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    .ic-root { text-align: left; line-height: normal; }

    .ic-btn {
      position: fixed; bottom: 22px; right: 22px; width: 60px; height: 60px; border-radius: 50%;
      background: #16171a; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; z-index: 999999;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,151,76,0.15);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    .ic-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.45), 0 0 0 1px ${ACCENT}55; }
    .ic-btn svg { width: 24px; height: 24px; stroke: ${ACCENT}; }

    .ic-window {
      position: fixed; bottom: 94px; right: 22px; width: 380px; max-width: 92vw; height: 560px; max-height: 82vh;
      border-radius: 16px; overflow: hidden; z-index: 999999; display: none; flex-direction: column;
      background: rgba(12, 13, 15, 0.97);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 24px 70px rgba(0,0,0,0.6);
      opacity: 0; transform: translateY(12px); transition: opacity .2s ease, transform .2s ease;
    }
    .ic-window.open { display: flex; opacity: 1; transform: translateY(0); }

    .ic-header {
      position: relative; z-index: 1; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, rgba(201,151,76,0.06), rgba(0,0,0,0));
    }
    .ic-logo {
      width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
      background: #17181b; border: 1px solid rgba(255,255,255,0.1);
      display: flex; align-items: center; justify-content: center;
    }
    .ic-logo svg { width: 18px; height: 18px; stroke: ${ACCENT}; }
    .ic-header-text { flex: 1; min-width: 0; }
    .ic-company { color: #f2f2f0; font-weight: 600; font-size: 14.5px; line-height: 1.2; letter-spacing: 0.2px; }
    .ic-tagline { color: #83868c; font-size: 10.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ic-close { background: none; border: none; color: #83868c; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1; }
    .ic-close:hover { color: #f2f2f0; background: rgba(255,255,255,0.05); }

    .ic-messages { position: relative; z-index: 1; flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .ic-messages::-webkit-scrollbar { width: 5px; }
    .ic-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

    .ic-msg { max-width: 84%; padding: 10px 13px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; white-space: pre-wrap; }
    .ic-msg.bot { align-self: flex-start; background: rgba(255,255,255,0.045); border: 1px solid rgba(255,255,255,0.07); color: #dcdde0; border-bottom-left-radius: 3px; }
    .ic-msg.user { align-self: flex-end; background: ${ACCENT}; color: #14110a; font-weight: 500; border-bottom-right-radius: 3px; }

    .ic-quickrow { align-self: stretch; display: flex; flex-direction: column; gap: 7px; margin-top: 2px; }
    .ic-quickbtn {
      display: flex; align-items: center; gap: 10px; padding: 10px 13px; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); color: #d8d9dc;
      font-size: 13px; cursor: pointer; text-align: left; transition: all .15s ease;
    }
    .ic-quickbtn:hover { background: ${ACCENT_SOFT}; border-color: ${ACCENT}66; color: #f2f2f0; }
    .ic-quickbtn svg { width: 16px; height: 16px; stroke: ${ACCENT}; flex-shrink: 0; }

    .ic-urgent-banner {
      align-self: stretch; padding: 12px 14px; border-radius: 10px; font-size: 13px;
      background: rgba(200, 80, 60, 0.1); border: 1px solid rgba(200,80,60,0.35); color: #e8b8ac;
    }
    .ic-urgent-banner a { color: #f0c4b8; font-weight: 700; text-decoration: none; }

    .ic-form-card {
      align-self: stretch; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 9px;
    }
    .ic-form-title { color: #f2f2f0; font-size: 12.5px; font-weight: 600; margin-bottom: 2px; letter-spacing: 0.3px; text-transform: uppercase; opacity: 0.85; }
    .ic-form-card input, .ic-form-card select {
      width: 100%; padding: 9px 11px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03); color: #f2f2f0; font-size: 13px; outline: none;
    }
    .ic-form-card select { color: #f2f2f0; }
    .ic-form-card option { color: #14161a; background: #ffffff; }
    .ic-form-card input::placeholder { color: #6b6e73; }
    .ic-form-card input:focus, .ic-form-card select:focus { border-color: ${ACCENT}; }
    .ic-form-row { display: flex; gap: 8px; }
    .ic-form-row > * { flex: 1; min-width: 0; }
    .ic-form-check { display: flex; align-items: center; gap: 8px; color: #b9bbbe; font-size: 12.5px; }
    .ic-form-submit {
      margin-top: 4px; padding: 10px; border-radius: 8px; border: none; cursor: pointer;
      background: ${ACCENT}; color: #14110a; font-weight: 700; font-size: 13px;
      transition: filter .15s ease;
    }
    .ic-form-submit:hover { filter: brightness(1.08); }
    .ic-form-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    .ic-typing { position: relative; z-index: 1; padding: 0 16px 8px; display: none; align-items: center; gap: 5px; }
    .ic-typing span { width: 5px; height: 5px; border-radius: 50%; background: ${ACCENT}; animation: ic-bounce 1.2s infinite; }
    .ic-typing span:nth-child(2) { animation-delay: .15s; }
    .ic-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes ic-bounce { 0%,60%,100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-4px); opacity: 1; } }

    .ic-inputrow { position: relative; z-index: 1; display: flex; gap: 8px; padding: 12px; border-top: 1px solid rgba(255,255,255,0.07); }
    .ic-input {
      flex: 1; padding: 10px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03); color: #f2f2f0; font-size: 13.5px; outline: none;
    }
    .ic-input::placeholder { color: #6b6e73; }
    .ic-input:focus { border-color: ${ACCENT}66; }
    .ic-send {
      width: 38px; height: 38px; border-radius: 50%; border: none; cursor: pointer; flex-shrink: 0;
      background: ${ACCENT}; color: #14110a; display: flex; align-items: center; justify-content: center;
    }
    .ic-send svg { width: 15px; height: 15px; }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------- icons (monochrome, no emoji)
  var ICON_WRENCH = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>';
  var ICON_CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>';
  var ICON_QUESTION = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4"></path><path d="M12 17h.01"></path></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4M12 17h.01"></path></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="#14110a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"></path><path d="M22 2 15 22l-4-9-9-4 20-7z"></path></svg>';

  // ---------------------------------------------------------------- markup
  var root = document.createElement("div");
  root.className = "ic-root";

  var button = document.createElement("button");
  button.className = "ic-btn";
  button.innerHTML = ICON_CHAT;

  var win = document.createElement("div");
  win.className = "ic-window";
  win.innerHTML = `
    <div class="ic-header">
      <div class="ic-logo">${ICON_WRENCH}</div>
      <div class="ic-header-text">
        <div class="ic-company">${COMPANY}</div>
        <div class="ic-tagline">${TAGLINE}</div>
      </div>
      <button class="ic-close" aria-label="Close">&times;</button>
    </div>
    <div class="ic-messages" id="ic-messages"></div>
    <div class="ic-typing" id="ic-typing"><span></span><span></span><span></span></div>
    <div class="ic-inputrow">
      <input class="ic-input" id="ic-input" placeholder="Type a message..." />
      <button class="ic-send" id="ic-send">${ICON_SEND}</button>
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

  function addBubble(role, text) {
    var div = document.createElement("div");
    div.className = "ic-msg " + (role === "user" ? "user" : "bot");
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function addUrgentBanner() {
    var div = document.createElement("div");
    div.className = "ic-urgent-banner";
    div.innerHTML = `This sounds urgent. Please call us right now at <a href="tel:${PHONE.replace(/[^0-9+]/g, "")}">${PHONE}</a>. You can also fill in the quick form below.`;
    messagesEl.appendChild(div);
    scrollDown();
  }

  function addQuickReplies() {
    var wrap = document.createElement("div");
    wrap.className = "ic-quickrow";
    var options = [
      { icon: ICON_CALENDAR, label: "Book a service", action: "book" },
      { icon: ICON_QUESTION, label: "Ask a question", action: "ask" },
      { icon: ICON_ALERT, label: "Something urgent", action: "urgent" },
    ];
    options.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.className = "ic-quickbtn";
      btn.innerHTML = opt.icon + "<span>" + opt.label + "</span>";
      btn.addEventListener("click", function () {
        wrap.remove();
        handleQuickAction(opt.action);
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollDown();
  }

  function handleQuickAction(action) {
    if (action === "book") {
      addBubble("user", "Book a service", true);
      showBookingForm();
    } else if (action === "ask") {
      addBubble("user", "I have a question", true);
      addBubble("bot", "Go ahead, ask about pricing, services, or anything else.", true);
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

  var TIME_SLOTS = [
    { value: "morning", label: "Morning (8am - 11am)" },
    { value: "midday", label: "Midday (11am - 2pm)" },
    { value: "afternoon", label: "Afternoon (2pm - 5pm)" },
    { value: "evening", label: "Evening (5pm - 7pm)" },
    { value: "asap", label: "As soon as possible" },
  ];

  function buildDateOptions() {
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var opts = [];
    for (var i = 0; i < 14; i++) {
      var d = new Date();
      d.setDate(d.getDate() + i);
      var label;
      if (i === 0) label = "Today (" + months[d.getMonth()] + " " + d.getDate() + ")";
      else if (i === 1) label = "Tomorrow (" + months[d.getMonth()] + " " + d.getDate() + ")";
      else label = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate();
      opts.push({ value: label, label: label });
    }
    return opts;
  }

  function showBookingForm(urgent, prefillTrade, prefillService) {
    if (formAlreadyShown && !urgent) return; // avoid duplicate auto-triggers in the same session
    formAlreadyShown = true;

    var card = document.createElement("div");
    card.className = "ic-form-card";
    var tradeOptionsHtml = TRADE_OPTIONS.map(function (t) {
      var sel = prefillTrade === t.value ? " selected" : "";
      return '<option value="' + t.value + '"' + sel + ">" + t.label + "</option>";
    }).join("");
    var dateOptionsHtml = buildDateOptions().map(function (d) { return '<option value="' + d.value + '">' + d.label + "</option>"; }).join("");
    var timeOptionsHtml = TIME_SLOTS.map(function (t) { return '<option value="' + t.label + '">' + t.label + "</option>"; }).join("");

    card.innerHTML = `
      <div class="ic-form-title">${urgent ? "Priority booking" : "Book a service"}</div>
      <input type="text" placeholder="Full name" data-field="fullName" />
      <input type="tel" placeholder="Phone number" data-field="phone" />
      <input type="text" placeholder="Service address" data-field="address" />
      <select data-field="tradeGuess">${tradeOptionsHtml}</select>
      <input type="text" placeholder="What do you need done?" data-field="serviceNeeded" value="${prefillService ? prefillService.replace(/"/g, "&quot;") : ""}" />
      <div class="ic-form-row">
        <select data-field="dateSelect">${dateOptionsHtml}</select>
        <select data-field="timeSelect">${timeOptionsHtml}</select>
      </div>
      <label class="ic-form-check"><input type="checkbox" data-field="urgent" ${urgent ? "checked" : ""} /> This is urgent</label>
      <button class="ic-form-submit">Book appointment</button>
    `;
    messagesEl.appendChild(card);
    scrollDown();

    var submitBtn = card.querySelector(".ic-form-submit");
    submitBtn.addEventListener("click", async function () {
      var data = {};
      card.querySelectorAll("[data-field]").forEach(function (el) {
        if (el.type === "checkbox") data[el.getAttribute("data-field")] = el.checked;
        else data[el.getAttribute("data-field")] = el.value.trim();
      });
      data.preferredDateTime = data.dateSelect + ", " + data.timeSelect;
      delete data.dateSelect;
      delete data.timeSelect;

      if (!data.fullName || !data.phone || !data.address || !data.serviceNeeded) {
        submitBtn.textContent = "Please fill all fields";
        setTimeout(function () { submitBtn.textContent = "Book appointment"; }, 1800);
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
        if (result.reply) addBubble("bot", result.reply, true);
        else addBubble("bot", "Something went wrong submitting that, please call us at " + PHONE + ".", true);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Book appointment";
        addBubble("bot", "Could not connect, please try again or call " + PHONE + ".", true);
      }
    });
  }

  function greet() {
    addBubble("bot", `Hi, I am ${BOT_NAME}, the assistant for ${COMPANY}. We handle ${TAGLINE}. How can I help you today?`);
    addQuickReplies();
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
        // THE FIX: open the form because the backend said to, not because
        // we tried to guess it from the sentence the AI wrote.
        if (data.showForm) {
          showBookingForm(data.urgent, data.tradeGuess, data.serviceNeeded);
        }
      } else {
        addBubble("bot", "Sorry, something went wrong. Please try again or call " + PHONE + ".", true);
      }
    } catch (e) {
      typingEl.style.display = "none";
      addBubble("bot", "Sorry, I could not connect. Please try again shortly.", true);
    }
  }

  sendBtn.addEventListener("click", sendFreeText);
  inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") sendFreeText(); });
})();
