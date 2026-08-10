// services/sessionStore.js
//
// Tracks per-conversation state, keyed by `web:<sessionId>` or `wa:<phone>`.
// LIMITATION: in-memory, resets on serverless cold starts. Fine for a demo.
// For production, swap get/save to a real store (Vercel KV, Upstash Redis,
// or a Sheet-backed store) — nothing else in the codebase needs to change.

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
    stage: "new",
    history: [],
  };
}

function getState(key) {
  if (!store.has(key)) store.set(key, freshState());
  return store.get(key);
}

function saveState(key, state) {
  store.set(key, state);
}

module.exports = { getState, saveState };
