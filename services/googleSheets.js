// services/googleSheets.js
//
// Writes to your Google Sheet CRM via Apps Script Web App webhooks — the
// GOOGLE_SHEETS_LEADS_WEBHOOK_URL and GOOGLE_SHEETS_APPOINTMENTS_WEBHOOK_URL
// you already have set in Vercel. No service account needed.

async function postToWebhook(url, payload) {
  if (!url) {
    console.error("googleSheets.js: webhook URL is not set in environment variables. Payload was:", payload);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("googleSheets.js: webhook responded with an error:", res.status, text);
    }
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    console.error("googleSheets.js: request to webhook failed:", err);
    return { ok: false, error: String(err) };
  }
}

async function saveAppointment(appt) {
  return postToWebhook(process.env.GOOGLE_SHEETS_APPOINTMENTS_WEBHOOK_URL, {
    timestamp: new Date().toISOString(),
    fullName: appt.fullName || "",
    phone: appt.phone || "",
    address: appt.address || "",
    serviceNeeded: appt.serviceNeeded || "",
    preferredDateTime: appt.preferredDateTime || "",
    urgent: appt.urgent ? "URGENT" : "normal",
    notes: appt.notes || "",
    channel: appt.channel || "website",
    status: "Pending confirmation",
  });
}

async function saveLead(lead) {
  return postToWebhook(process.env.GOOGLE_SHEETS_LEADS_WEBHOOK_URL, {
    timestamp: new Date().toISOString(),
    fullName: lead.fullName || "",
    phone: lead.phone || "",
    email: lead.email || "",
    interest: lead.interest || lead.serviceNeeded || "",
    channel: lead.channel || "website",
  });
}

module.exports = { saveAppointment, saveLead };
