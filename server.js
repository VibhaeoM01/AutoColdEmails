console.log('Server script started');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully');
  seedDatabase(); // Seed the database with initial templates
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1); // Exit if DB connection fails
});

// --- Mongoose Schemas ---
const EmailTemplateSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true, enum: ['cold', 'referral', 'hr'] },
  subject: { type: String, required: true },
  template: { type: String, required: true },
});

const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);

// --- Database Seeding ---
const seedDatabase = async () => {
  try {
    const count = await EmailTemplate.countDocuments();
    if (count > 0) {
      console.log('DB already seeded.');
      return;
    }

    console.log('🌱 Seeding database with initial templates...');
    const initialTemplates = [
      {
        type: 'cold',
        subject: 'Potential Collaboration',
        template: `Hi {recipientName},
I hope this message finds you well. My name is Vibhaeo Mudia, and I'm a B.Tech IT student at G.H. Raisoni College of Engineering with a semester at IIIT Nagpur.
I'm passionate about solving real-world problems using web development and DSA, and have built impactful projects like a Mess Management System and a Hostel Finder System.
I'm reaching out because I admire your work in the tech industry and would love to explore potential collaboration opportunities or learn from your experience.
I've attached my resume for your reference. Would you be open to a brief conversation about how I might contribute to your team or learn from your expertise?
Thank you for your time and consideration.
Best regards,
Vibhaeo Mudia
LinkedIn: https://www.linkedin.com/in/VibhaeoMudia/
Github: https://github.com/VibhaeoM01`
      },
      {
        type: 'referral',
        subject: 'Request for Referral – {position} at {companyName} (Job ID: {jobId})',
        template: `Hi {recipientName},
I hope you're doing well. I'm Vibhaeo Mudia, a B.Tech Information Technology student at G.H. Raisoni College of Engineering (CGPA: 8.99). I came across your profile and noticed you work at {companyName}, which is truly inspiring!
I'm currently applying for the {position} position (Job ID: {jobId}) at {companyName} and would be incredibly grateful if you could consider referring me for this opportunity.
Over the past few years, I've worked on several full-stack projects such as:
MessMaster – A complete mess management system with admin dashboards, food tracking, and AI chatbot integration.
NestEase – A stay management platform with real-time filtering, maps, and secure authentication.
Event Management Website – A responsive site using GSAP animations for seamless user interaction.
I also recently interned as a Web Developer at GBJ Buzz, where I:
Built a responsive learning platform using React.js, Tailwind CSS, and Stripe integration.
Delivered over 10+ UI/UX React components, optimized SEO, and enhanced performance for 100+ users.
I've attached my resume for reference. If you find my profile suitable and are comfortable doing so, I'd be honored to have your referral. I'm also happy to connect for a quick chat if needed.
Thank you for your time and consideration!
Warm regards,
Vibhaeo Mudia`
      },
      {
        type: 'hr',
        subject: 'Follow-up: {position} Application - {companyName}',
        template: `Hi {recipientName},
I hope this email finds you well. I'm Vibhaeo Mudia, and I recently applied for the {position} position at {companyName}.
I wanted to follow up on my application and express my continued interest in this opportunity. I'm excited about the possibility of contributing to {companyName}'s team with my skills in web development and DSA.
I've attached my updated resume for your reference. I would appreciate any updates on the status of my application or next steps in the process.
Thank you for your time and consideration.
Best regards,
Vibhaeo Mudia
LinkedIn: https://www.linkedin.com/in/VibhaeoMudia/
Github: https://github.com/VibhaeoM01`
      }
    ];
    await EmailTemplate.insertMany(initialTemplates);
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

// API endpoint to get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templates = await EmailTemplate.find();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch templates', error });
  }
});

// API endpoint to update a template
app.put('/api/templates/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { subject, template } = req.body;

    if (!subject || !template) {
      return res.status(400).json({ message: 'Subject and template are required' });
    }

    const updatedTemplate = await EmailTemplate.findOneAndUpdate(
      { type },
      { subject, template },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json(updatedTemplate);
  } catch (error) {
    res.status(500).json({ message: 'Failed to save template', error });
  }
});

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Loaded' : 'Missing');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Advanced timing system: Day-level scheduling + business hours + 5-10 min delays
function calculateScheduledTime(daysToDelay) {
  const now = new Date();
  const scheduledDate = new Date(now);
  
  // Add days to delay
  scheduledDate.setDate(now.getDate() + daysToDelay);
  
  // Set random time within business hours (10 AM - 4 PM)
  const randomHour = 10 + Math.floor(Math.random() * 6); // 10-15 (10 AM - 4 PM)
  const randomMinute = Math.floor(Math.random() * 60); // 0-59
  const randomSecond = Math.floor(Math.random() * 60); // 0-59
  
  scheduledDate.setHours(randomHour, randomMinute, randomSecond, 0);
  
  // Special case for same day (daysToDelay = 0)
  if (daysToDelay === 0) {
    // If it's already past 4 PM, reject the request
    if (now.getHours() >= 16) {
      throw new Error('Cannot schedule for today after 4 PM. Please choose tomorrow or later.');
    }
    
    // Make up to 100 attempts to find a valid future time
    for (let attempt = 0; attempt < 100; attempt++) {
      const testTime = new Date(now);
      testTime.setHours(10 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 60), 0, 0);
      
      if (testTime > now) {
        return testTime;
      }
    }
    throw new Error('Could not find a valid future time for today. Please try tomorrow.');
  }
  
  return scheduledDate;
}

// 5-10 minute delay between emails (300000-600000 ms)
function getEmailDelay() {
  return Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000; // 5-10 minutes
}

let sentEmails = 0;
let failedEmails = 0;
let emailSendTimes = [];
let allDone = false;
let hasErrors = false;

// Sequential email sending with advanced timing
async function sendEmailsSequentially(emails, emailType, companyDetails, daysToDelay) {
  console.log(`📅 Scheduling ${emails.length} emails for ${daysToDelay} days from now`);
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    
    await new Promise(async (resolve) => {
      // Calculate scheduled time for this email
      const scheduledTime = calculateScheduledTime(daysToDelay);
      
      // Add delay between emails (5-10 minutes)
      const emailDelay = i === 0 ? 0 : getEmailDelay();
      const totalDelay = scheduledTime.getTime() - Date.now() + emailDelay;
      
      console.log(`📧 Email ${i + 1}/${emails.length} to ${email} scheduled for ${scheduledTime.toLocaleString()}`);
      
      setTimeout(async () => {
        const sendTime = new Date();
        const template = await EmailTemplate.findOne({ type: emailType });

        if (!template) {
          console.error(`Template for ${emailType} not found in DB`);
          // Mark as failed and resolve
          failedEmails++;
          hasErrors = true;
          emailSendTimes.push({
            email, time: sendTime, status: 'error',
            error: `Template '${emailType}' not found.`, type: emailType,
            scheduledFor: new Date(Date.now() + totalDelay).toLocaleString()
          });
          if (sentEmails + failedEmails === emails.length) allDone = true;
          return resolve();
        }
        
        // Personalize subject and body
        const personalizedSubject = template.subject
          .replace('{recipientName}', email.split('@')[0])
          .replace('{companyName}', companyDetails.companyName || 'your company')
          .replace('{position}', companyDetails.position || 'the position')
          .replace('{jobId}', companyDetails.jobId || 'N/A');
        
        const personalizedBody = template.template
          .replace(/{recipientName}/g, email.split('@')[0])
          .replace(/{companyName}/g, companyDetails.companyName || 'your company')
          .replace(/{position}/g, companyDetails.position || 'the position')
          .replace(/{jobId}/g, companyDetails.jobId || 'N/A');

        transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: personalizedSubject,
          text: personalizedBody,
          attachments: [
            {
              filename: 'resume.pdf',
              path: path.join(__dirname, 'attachments', 'resume.pdf'),
            }
          ]
        }, (err, info) => {
          if (err) {
            failedEmails++;
            hasErrors = true;
            emailSendTimes.push({
              email,
              time: sendTime,
              status: 'error',
              error: err.message,
              type: emailType,
              scheduledFor: scheduledTime.toLocaleString()
            });
            console.error(`❌ Error sending to ${email}:`, err);
          } else {
            sentEmails++;
            emailSendTimes.push({
              email,
              time: sendTime,
              status: 'sent',
              error: null,
              type: emailType,
              scheduledFor: scheduledTime.toLocaleString()
            });
            console.log(`✅ Email sent to ${email} at ${sendTime.toLocaleTimeString()}`);
          }
          
          if (sentEmails + failedEmails === emails.length) {
            allDone = true;
            if (hasErrors) {
              console.log(`⚠️ Email campaign completed with ${failedEmails} errors out of ${emails.length} emails`);
            } else {
              console.log('🎉 All emails scheduled and sent successfully!');
            }
          }
          resolve();
        });
      }, totalDelay);
    });
  }
}

app.get('/test-auth', async (req, res) => {
  try {
    // Test the email configuration
    await transporter.verify()
    res.json({ success: true, message: 'Email authentication successful' })
  } catch (error) {
    console.error('❌ Email authentication failed:', error)
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'Please check your email credentials in the .env file'
    })
  }
})

app.post('/send-emails', async (req, res) => {
  const { emails, emailType, companyDetails, daysToDelay } = req.body;
  
  const templateExists = await EmailTemplate.findOne({ type: emailType });
  if (!emails || !Array.isArray(emails) || !emailType || !templateExists) {
    return res.status(400).json({ 
      error: 'Invalid request. Must include emails and a valid emailType.' 
    });
  }

  if (daysToDelay === undefined || daysToDelay < 0 || daysToDelay > 30) {
    return res.status(400).json({ 
      error: 'Invalid daysToDelay. Must be between 0 and 30 days.' 
    });
  }

  try {
    // Test if we can schedule for the specified day
    calculateScheduledTime(daysToDelay);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  sentEmails = 0;
  failedEmails = 0;
  emailSendTimes = [];
  allDone = false;
  hasErrors = false;
  
  console.log(`🚀 Starting ${emailType} email campaign for ${emails.length} recipients`);
  console.log(`📅 Days to delay: ${daysToDelay}`);
  console.log(`⏰ Business hours: 10 AM - 4 PM`);
  console.log(`⏱️ Email delays: 5-10 minutes between emails`);
  
  // Start sequential sending
  sendEmailsSequentially(emails, emailType, companyDetails, daysToDelay);
  
  res.json({ 
    message: `Emails scheduled successfully! ${emails.length} emails will be sent ${daysToDelay === 0 ? 'today' : `in ${daysToDelay} days`} during business hours (10 AM - 4 PM) with 5-10 minute delays between each email.`,
    emailType,
    totalEmails: emails.length,
    daysToDelay,
    scheduledDate: calculateScheduledTime(daysToDelay).toLocaleDateString()
  });
});

app.get('/sent-count', (req, res) => {
  res.json({ 
    sent: sentEmails, 
    failed: failedEmails,
    total: emailSendTimes.length, 
    allDone,
    hasErrors 
  });
});

app.get('/send-times', (req, res) => {
  res.json({ 
    sent: sentEmails, 
    failed: failedEmails,
    times: emailSendTimes, 
    allDone,
    hasErrors 
  });
});

app.get('/email-status', (req, res) => {
  const failedEmailsList = emailSendTimes.filter(email => email.status === 'error');
  const successfulEmailsList = emailSendTimes.filter(email => email.status === 'sent');
  
  res.json({
    sent: sentEmails,
    failed: failedEmails,
    total: emailSendTimes.length,
    allDone,
    hasErrors,
    failedEmails: failedEmailsList,
    successfulEmails: successfulEmailsList
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Advanced Email Automation Server running on port ${PORT}`);
  console.log(`📧 Supported email types: cold, referral, hr`);
  console.log(`⏰ Business hours scheduling: 10 AM - 4 PM`);
  console.log(`⏱️ Email delays: 5-10 minutes between emails`);
  console.log(`📅 Day-level scheduling: 0-30 days delay`);
  console.log(`🎯 Main goal: Avoid spam filters with human-like timing`);
}); 