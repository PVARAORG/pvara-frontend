# 📧 Email System - Quick Reference

## ⚡ 60-Second Setup

```bash
# 1. Edit .env.local with your Gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# 2. Terminal 1 - Start backend email server
npm run server

# 3. Terminal 2 - Start React frontend
npm start

# 4. Test - Apply with your email address
# 5. Check inbox for confirmation email ✅
```

## 🎯 What Works Now

| Action | Email Sent | Template |
|--------|-----------|----------|
| Submit Application | ✅ Yes | APPLICATION_RECEIVED |
| Shortlist Candidate | ✅ Yes | APPLICATION_SHORTLISTED |
| Schedule Interview | ✅ Yes | INTERVIEW_SCHEDULED |
| Send Offer | ✅ Yes | OFFER_EXTENDED |
| Reject Candidate | ✅ Yes | REJECTION |

## 🔧 Commands

```bash
# Start email server
npm run server

# Start frontend
npm start

# Start both together (requires concurrently)
npm run dev

# Test email system
./test-email.sh

# Run tests
npm test

# Build production
npm run build
```

## 📁 Key Files

```
server.js              → Email backend server
.env.local            → Gmail credentials
src/PvaraPhase2.jsx   → Email API integration
EMAIL_SETUP.md        → Full setup guide
EMAIL_IMPLEMENTATION.md → Technical details
```

## ✅ Verification Checklist

- [ ] `.env.local` has EMAIL_USER and EMAIL_PASSWORD
- [ ] `npm run server` starts without errors
- [ ] Backend shows: "✅ Email service ready"
- [ ] Frontend starts on port 3000
- [ ] Applied with test email address
- [ ] Received confirmation email
- [ ] All 4 tests passing: `npm test`
- [ ] Build compiles: `npm run build`

## 🚀 Production

```bash
# Set environment variables
export EMAIL_USER=your-email@gmail.com
export EMAIL_PASSWORD=your-app-password

# Or in .env file
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Start production
npm run server &
npm start
```

## 💡 Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select: Mail + Your Device
3. Copy: 16-character password
4. Paste in `.env.local` as EMAIL_PASSWORD

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Email service unavailable | Start `npm run server` |
| Port 5000 already in use | Kill process on 5000 |
| Email not sending | Check `.env.local` credentials |
| Backend won't start | Check Node.js installed: `node -v` |
| Tests failing | Run `npm install` first |

## 📧 Email Templates Available

```
APPLICATION_RECEIVED      - Sent when candidate applies
APPLICATION_SHORTLISTED   - Sent when shortlisted
INTERVIEW_SCHEDULED       - Sent for interview invitation
OFFER_EXTENDED           - Sent with job offer
REJECTION                - Sent when rejected
```

## 🎨 Email Features

✅ Professional branding with PVARA logo
✅ Responsive design (works on all devices)
✅ Personalized with candidate name
✅ Job title in subject line
✅ HTML + plain text versions
✅ Error handling with graceful fallback
✅ Console logging for debugging

---

**Ready to send emails?** Start with: `npm run server` 🚀
