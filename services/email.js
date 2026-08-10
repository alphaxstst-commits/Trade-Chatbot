// services/email.js
const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Send an email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.from - Sender (optional, defaults to EMAIL_FROM)
 */
async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return info;
  } catch (err) {
    console.error('Email send error:', err.message);
    throw err;
  }
}

module.exports = { sendEmail };