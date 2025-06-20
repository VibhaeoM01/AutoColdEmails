console.log('Server script started');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Loaded' : 'Missing');

const EMAIL_SUBJECT = 'Seeking Internship | Engineering Student with Resume Attached';

const EMAIL_TEMPLATE = `
    Hi there,

    I'm Vibhaeo Mudia, a B.Tech IT student at G.H. Raisoni College of Engineering, with a semester at IIIT Nagpur. I'm passionate about solving real-world problems using web dev and DSA, and have built impactful projects like a Mess Management System and a Hostel Finder System.

    I'm seeking internship opportunities where I can contribute and grow. I admire your work in tech industries and would love to explore how I can be part of it.

    PFA my Resume. Thank you for your time!

    Best regards,
    Vibhaeo Mudia
    LinkedIn:https://www.linkedin.com/in/VibhaeoMudia/
    Github:https://github.com/VibhaeoM01
`;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function randomDelay(min = 60000, max = 300000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let sentEmails = 0;
let emailSendTimes = [];
let allDone = false;
let isSending = false;

// Send emails sequentially with random delay and log after each
async function sendEmailsSequentially(emails) {
  for (const email of emails) {
    await new Promise((resolve) => {
      setTimeout(() => {
        const sendTime = new Date();
        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: EMAIL_SUBJECT,
          text: EMAIL_TEMPLATE,
          attachments: [
            {
              filename: 'resume.pdf',
              path: path.join(__dirname, 'attachments', 'resume.pdf'),
            }
          ]
        }, (err, info) => {
          sentEmails++;
          emailSendTimes.push({
            email,
            time: sendTime,
            status: err ? 'error' : 'sent',
            error: err ? err.message : null
          });
          // Log after each email is sent
          console.log(`Email to ${email} ${err ? 'failed: ' + err.message : 'sent successfully'}`);
          if (sentEmails === emails.length) {
            allDone = true;
            isSending = false; // Mark sending as done
            console.log('✅ All emails sent (or attempted).');
          }
          resolve();
        });
      }, randomDelay());
    });
  }
}

// POST endpoint to start sending emails
app.post('/send-emails', (req, res) => {
  const { emails } = req.body;
  if (!emails || !Array.isArray(emails)) {
    return res.status(400).json({ error: 'Invalid request. Must include emails.' });
  }
  if (isSending) {
    return res.status(429).json({ error: 'A batch is already in progress.' });
  }

  // Reset counters for new batch
  sentEmails = 0;
  emailSendTimes = [];
  allDone = false;
  isSending = true;

  // Start sending emails asynchronously (non-blocking)
  sendEmailsSequentially(emails);

  // Respond immediately
  res.json({ message: 'Emails are being sent with random delays.' });
});

app.get('/sent-count', (req, res) => {
  res.json({ sent: sentEmails, total: emailSendTimes.length, allDone });
});

app.get('/send-times', (req, res) => {
  res.json({ sent: sentEmails, times: emailSendTimes, allDone });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 