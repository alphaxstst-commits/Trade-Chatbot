// services/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmail({ to, subject, html, from = process.env.EMAIL_FROM }) {
  await transporter.sendMail({ from, to, subject, html });
}

module.exports = { sendEmail };