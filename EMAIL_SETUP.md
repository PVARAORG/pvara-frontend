# 📧 PVARA Email System - Setup Guide

## ✅ What's Been Implemented

Real email sending is now available! The system will automatically send emails when:
- ✅ Candidate submits an application → Application confirmation email
- ✅ HR shortlists a candidate → Shortlist notification email
- ✅ HR sends interview invite → Interview scheduled email
- ✅ HR rejects candidate → Rejection notification email

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Gmail App Password

1. Go to https://myaccount.google.com/apppasswords
2. Sign in with your Gmail account
3. Select "Mail" and "Windows Computer" (or your device)
4. Google will generate a 16-character password
5. Copy the password (without spaces)

### Step 2: Configure `.env.local`

Edit `/Users/ubl/pvara-frontend/.env.local`:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
PORT=5000
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000
```

Replace:
- `your-email@gmail.com` with your Gmail address
- `xxxx xxxx xxxx xxxx` with the 16-character app password (no spaces in actual file)

### Step 3: Start the Backend Server

```bash
# Terminal 1 - Start backend email server
npm run server

# Or in another terminal - Start React frontend
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║  🚀 PVARA Email Server Running        ║
║  Port: 5000                            ║
║  Endpoint: http://localhost:5000       ║
╚════════════════════════════════════════╝

✅ Email service ready - emails will be sent
```

### Step 4: Test Email Sending

1. Go to http://localhost:3000
2. Create a new job (Admin section)
3. Apply for the job as a candidate
4. Enter your email address
5. Submit the application
6. Check your email inbox for confirmation message

You should receive an email with:
- 📧 Subject: "Application Received - [Job Title]"
- 🎨 Styled HTML email from PVARA
- ✅ Confirmation of submission

---

## 🔧 Alternative: Using Mailgun (Free Tier)

### Setup Mailgun

1. Go to https://mailgun.com
2. Sign up for free account
3. Go to "Sending" → "Domain Settings"
4. Copy your "API Key"
5. Update `.env.local`:

```
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
```

Update `server.js` to use Mailgun instead of Gmail.

---

## 📞 Troubleshooting

### Email server won't start?

```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill existing process
kill -9 <PID>

# Restart server
npm run server
```

### Emails not sending?

1. Check `.env.local` has correct credentials
2. Check console output:
   ```
   ✅ Email service ready - emails will be sent
   ```
3. Verify Gmail app password is correct (16 characters)
4. Check Gmail security settings: https://myaccount.google.com/security

### Getting "Email service unavailable"?

- Backend server not running? Start it with `npm run server`
- Check backend is listening on port 5000
- Check frontend can reach backend at `http://localhost:5000`

### Don't want to use Gmail?

Edit `.env.local` and use any SMTP provider:
- SendGrid
- Mailgun
- AWS SES
- Your own SMTP server

---

## 🏭 Production Deployment

For production, use environment variables:

### Heroku Deployment

```bash
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
```

### AWS/Azure/GCP

Set environment variables in your cloud platform's console.

### Docker

```dockerfile
ENV EMAIL_USER=your-email@gmail.com
ENV EMAIL_PASSWORD=your-app-password
```

---

## 📧 Email Endpoints

### Send Simple Email

```bash
curl -X POST http://localhost:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "candidate@example.com",
    "subject": "Your subject",
    "body": "Your message",
    "candidateName": "John Doe"
  }'
```

### Send Template Email

```bash
curl -X POST http://localhost:5000/api/send-email-template \
  -H "Content-Type: application/json" \
  -d '{
    "to": "candidate@example.com",
    "templateType": "APPLICATION_RECEIVED",
    "data": {
      "candidateName": "John Doe",
      "jobTitle": "Senior Developer"
    }
  }'
```

### Available Templates

- `APPLICATION_RECEIVED` - Confirmation when candidate applies
- `APPLICATION_SHORTLISTED` - When HR shortlists candidate
- `INTERVIEW_SCHEDULED` - When interview is scheduled
- `OFFER_EXTENDED` - When job offer is sent
- `REJECTION` - When application is rejected

---

## ✨ Email Features

✅ **Responsive HTML emails** - Works on all email clients
✅ **Professional branding** - PVARA header with gradient
✅ **Automatic formatting** - Line breaks converted to paragraphs
✅ **Customizable templates** - Easy to modify email content
✅ **Error handling** - Graceful fallback if email fails
✅ **Async sending** - Doesn't block application
✅ **Logging** - All emails logged to console

---

## 🎯 What Gets Emailed

| Event | Email Type | Recipient | Content |
|-------|-----------|-----------|---------|
| Application Submitted | Confirmation | Candidate | Thank you + next steps |
| Candidate Shortlisted | Notification | Candidate | Congratulations + interview coming |
| Interview Scheduled | Invitation | Candidate | Date, time, type + confirm |
| Job Offer Sent | Offer | Candidate | Position + salary + review offer |
| Application Rejected | Rejection | Candidate | Thank you + good luck |

---

## 💡 Tips

1. **Test with your own email first** - Apply as a test candidate with your email
2. **Check spam folder** - New services might be filtered
3. **Monitor console** - All email activity logged to terminal
4. **Monitor Gmail** - Check "Sign-in & security" for any alerts

---

## 🚀 Next Steps

1. ✅ Configure `.env.local` with your email
2. ✅ Start backend server: `npm run server`
3. ✅ Start frontend: `npm start`
4. ✅ Test by submitting an application
5. ✅ Check email inbox for confirmation

**You're all set! Emails will now be sent automatically.** 🎉

