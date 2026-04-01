/**
 * PVARA Backend Email Server
 * Handles real email sending for recruitment portal
 * Runs on port 5000
 */

const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Email configuration - Using Gmail (easy setup)
// For production, use SendGrid or Mailgun
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password',
  },
});

// Test email connection on startup
transporter.verify((error) => {
  if (error) {
    console.log('❌ Email service not configured properly');
    console.log('📧 To send real emails, set EMAIL_USER and EMAIL_PASSWORD in .env');
    console.log('💡 Using Gmail? Generate app password: https://myaccount.google.com/apppasswords');
  } else {
    console.log('✅ Email service ready - emails will be sent');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body, candidateName } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // HTML email template
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #059669, #10b981); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h1 style="margin: 0;">PVARA Recruitment</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Enterprise Recruitment Portal</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <p style="margin-top: 0;">Dear ${candidateName || 'Candidate'},</p>
              ${body.replace(/\n/g, '</p><p>')}
              <p>Best regards,<br/>
              <strong>PVARA Recruitment Team</strong><br/>
              <a href="mailto:recruitment@pvara.com" style="color: #059669; text-decoration: none;">recruitment@pvara.com</a>
              </p>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
              <p>This is an automated email from PVARA Recruitment Portal. Please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@pvara.com',
      to,
      subject,
      text: body,
      html: htmlBody,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 Email sent to ${to}: ${subject}`);
    console.log(`   Message ID: ${info.messageId}`);

    res.json({
      success: true,
      messageId: info.messageId,
      to,
      subject,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
    });
  }
});

// Send email with template
app.post('/api/send-email-template', async (req, res) => {
  try {
    const { to, templateType, data } = req.body;

    if (!to || !templateType) {
      return res.status(400).json({ error: 'Missing required fields: to, templateType' });
    }

    const templates = {
      APPLICATION_RECEIVED: {
        subject: `Application Received - ${data?.jobTitle || 'Position'}`,
        body: `Thank you for applying to ${data?.jobTitle || 'our position'}. We have received your application and will review it shortly. You will be notified of the next steps.`,
      },
      APPLICATION_SHORTLISTED: {
        subject: `Congratulations! You've been shortlisted`,
        body: `Great news! You have been shortlisted for the ${data?.jobTitle || 'position'}. Our team will contact you soon to schedule an interview.`,
      },
      INTERVIEW_SCHEDULED: {
        subject: `Interview Scheduled - ${data?.jobTitle || 'Position'}`,
        body: `Your ${data?.interviewType || 'interview'} for ${data?.jobTitle || 'the position'} is scheduled on ${data?.date} at ${data?.time}. Please confirm your availability.`,
      },
      OFFER_EXTENDED: {
        subject: `Job Offer - ${data?.jobTitle || 'Position'}`,
        body: `We are excited to offer you the position of ${data?.jobTitle || 'this role'} with a salary of ${data?.salary || 'competitive'} based on experience. Please review the offer and let us know your decision.`,
      },
      REJECTION: {
        subject: `Application Status Update`,
        body: `Thank you for your interest. After careful consideration, we have decided to move forward with other candidates. Best of luck in your future endeavors!`,
      },
    };

    const template = templates[templateType];
    if (!template) {
      return res.status(400).json({ error: `Unknown template: ${templateType}` });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@pvara.com',
      to,
      subject: template.subject,
      text: template.body,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(to right, #059669, #10b981); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h1 style="margin: 0;">PVARA Recruitment</h1>
              </div>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
                <p>Dear ${data?.candidateName || 'Candidate'},</p>
                <p>${template.body}</p>
                <p>Best regards,<br/><strong>PVARA Recruitment Team</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log(`📧 Template email sent to ${to} (${templateType})`);

    res.json({
      success: true,
      messageId: info.messageId,
      to,
      template: templateType,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Template email sending failed:', error.message);
    res.status(500).json({
      error: 'Failed to send template email',
      details: error.message,
    });
  }
});

// Email log endpoint (for debugging)
app.get('/api/email-logs', (req, res) => {
  res.json({
    message: 'Email logs endpoint',
    note: 'Logs are printed to console for now',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║  🚀 PVARA Email Server Running        ║`);
  console.log(`║  Port: ${PORT}                               ║`);
  console.log(`║  Endpoint: http://localhost:${PORT}         ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
