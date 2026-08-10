// services/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send a generic email (original function)
 */
async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    return info;
  } catch (err) {
    console.error('Email send error:', err.message);
    throw err;
  }
}

/**
 * Wrapper for agent – sends appointment confirmation to owner
 */
async function sendAppointmentEmail(payload) {
  const ownerHtml = `
    <h2>New Appointment Booked</h2>
    <p><strong>Name:</strong> ${payload.fullName}</p>
    <p><strong>Phone:</strong> ${payload.phone}</p>
    <p><strong>Address:</strong> ${payload.address}</p>
    <p><strong>Service:</strong> ${payload.serviceNeeded}</p>
    <p><strong>Preferred Time:</strong> ${payload.preferredDateTime}</p>
    <p><strong>Urgent:</strong> ${payload.urgent ? 'YES' : 'No'}</p>
    <p><strong>Notes:</strong> ${payload.notes || 'None'}</p>
    <p><strong>Channel:</strong> ${payload.channel || 'website'}</p>
  `;
  return sendEmail({
    to: process.env.NOTIFY_EMAIL_TO,
    subject: 'New Appointment Booked',
    html: ownerHtml,
  });
}

/**
 * Wrapper for agent – sends lead notification to owner
 */
async function sendLeadEmail(payload) {
  const ownerHtml = `
    <h2>New Lead Captured</h2>
    <p><strong>Name:</strong> ${payload.fullName}</p>
    <p><strong>Phone:</strong> ${payload.phone}</p>
    <p><strong>Email:</strong> ${payload.email || 'Not provided'}</p>
    <p><strong>Interest:</strong> ${payload.serviceNeeded || payload.interest || 'Not specified'}</p>
    <p><strong>Channel:</strong> ${payload.channel || 'website'}</p>
  `;
  return sendEmail({
    to: process.env.NOTIFY_EMAIL_TO,
    subject: 'New Lead',
    html: ownerHtml,
  });
}

module.exports = { sendEmail, sendAppointmentEmail, sendLeadEmail };