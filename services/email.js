// services/email.js
//
// Sends notification emails via EmailJS's REST API, using the
// EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID_LEAD / EMAILJS_TEMPLATE_ID_APPOINTMENT /
// EMAILJS_USER_ID you already have set in Vercel. No SMTP needed.

async function sendEmailJs(templateId, templateParams) {
  if (!process.env.EMAILJS_SERVICE_ID || !templateId || !process.env.EMAILJS_USER_ID) {
    console.error("email.js: missing EmailJS env vars, cannot send. Params were:", templateParams);
    return false;
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: templateId,
      user_id: process.env.EMAILJS_USER_ID,
      // Only needed if your EmailJS account has "Allow API calls only from
      // browser" turned ON (Account -> Security). If emails still fail after
      // this wiring, that setting is the most likely cause — either turn it
      // off, or set EMAILJS_PRIVATE_KEY in Vercel to your Private Key from
      // that same page.
      accessToken: process.env.EMAILJS_PRIVATE_KEY || undefined,
      template_params: templateParams,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("email.js: EmailJS send failed:", res.status, text);
    return false;
  }
  return true;
}

async function sendAppointmentEmail(appointment) {
  return sendEmailJs(process.env.EMAILJS_TEMPLATE_ID_APPOINTMENT, {
    to_email: process.env.NOTIFY_EMAIL_TO || "",
    urgent_flag: appointment.urgent ? "URGENT" : "",
    full_name: appointment.fullName,
    phone: appointment.phone,
    address: appointment.address,
    service_needed: appointment.serviceNeeded,
    preferred_time: appointment.preferredDateTime,
    notes: appointment.notes || "-",
    channel: appointment.channel || "website",
  });
}

async function sendLeadEmail(lead) {
  return sendEmailJs(process.env.EMAILJS_TEMPLATE_ID_LEAD, {
    to_email: process.env.NOTIFY_EMAIL_TO || "",
    full_name: lead.fullName,
    phone: lead.phone || "-",
    email: lead.email || "-",
    interest: lead.interest || lead.serviceNeeded || "",
    channel: lead.channel || "website",
  });
}

module.exports = { sendAppointmentEmail, sendLeadEmail };
