// services/sessionStore.js
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
