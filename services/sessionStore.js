// services/sessionStore.js
//
// Tracks per-conversation state: what fields we already know about this
// customer, and the recent message history. Keyed by a "key" the caller
// provides — `web:<sessionId>` for the widget, `wa:<phoneNumber>` for WhatsApp.
//
// LIMITATION (important): this is in-memory, so on Vercel it resets whenever
// the serverless function cold-starts (can happen between requests, especially
// after periods of no traffic). Fine for a demo. For production, swap the
// get/save functions below to read/write a real store — Vercel KV, Upstash
// Redis, or a "Sessions" tab in your Google Sheet via services/googleSheets.js
// are all reasonable upgrades later; the rest of the code doesn't need to change.

const store = new Map();

function freshState() {
  return {
    fullName: null,
    phone: null,
    address: null,
    serviceNeeded: null,
    preferredDateTime: null,
    tradeGuess: null,
    urgent: false,
    wantsToBook: null,
    stage: "new", // "new" | "collecting" | "booked" | "lead_saved"
    history: [], // [{role: "user"|"assistant", content}]
  };
}

function getState(key) {
  if (!store.has(key)) {
    store.set(key, freshState());
  }
  return store.get(key);
}

function saveState(key, state) {
  store.set(key, state);
}

module.exports = { getState, saveState };
