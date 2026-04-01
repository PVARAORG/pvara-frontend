# 📟 PVARA Email System - Command Reference

## 🚀 Getting Started

### First Time Setup
```bash
# Install dependencies (already done)
npm install

# Configure email
nano .env.local
# Add: EMAIL_USER=your-email@gmail.com
# Add: EMAIL_PASSWORD=xxxx xxxx xxxx xxxx

# Start backend (Terminal 1)
npm run server

# Start frontend (Terminal 2)
npm start
```

## 📧 Running the System

### Development (2 terminals)
```bash
# Terminal 1: Start email server
npm run server

# Terminal 2: Start React app
npm start
```

### Both at Once (requires concurrently)
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

## ✅ Testing & Verification

### Run Tests
```bash
npm test
```

### Verify Email System
```bash
./test-email.sh
```

### Check Backend Health
```bash
curl http://localhost:5000/health
```

### Check if Server Running
```bash
lsof -i :5000
```

## 🐛 Troubleshooting Commands

### Kill Port 5000 (if in use)
```bash
lsof -i :5000
kill -9 <PID>
```

### Kill All Node Processes
```bash
killall node
```

### Check .env.local is Set
```bash
cat .env.local | grep EMAIL
```

### View Server Logs
```bash
npm run server 2>&1
```

### Test Email Endpoint Directly
```bash
curl -X POST http://localhost:5000/api/send-email-template \
  -H "Content-Type: application/json" \
  -d '{
    "to":"your-email@gmail.com",
    "templateType":"APPLICATION_RECEIVED",
    "data":{"candidateName":"Test","jobTitle":"Developer"}
  }'
```

## 📊 Useful npm Commands

```bash
# Check Node version
node -v

# Check npm version
npm -v

# List installed packages
npm list

# Update all packages
npm update

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install
```

## 🔍 Git Commands

```bash
# See changes
git status

# View recent commits
git log --oneline

# Add files
git add .

# Commit changes
git commit -m "message"

# Push to GitHub
git push origin main
```

## 📁 File Management

```bash
# View directory structure
ls -la

# Find email files
find . -name "EMAIL*.md"

# Check file sizes
ls -lh server.js .env.local

# View file content
cat .env.local
```

## 🌐 Port Management

### Check All Listening Ports
```bash
lsof -i -P -n | grep LISTEN
```

### Check Specific Port
```bash
lsof -i :3000  # Frontend
lsof -i :5000  # Backend
```

### Change Port
```bash
# In server.js or .env.local
PORT=8000
```

## 📧 Email Testing Workflow

### Complete Test Flow
```bash
# 1. Start backend
npm run server

# 2. In another terminal, start frontend
npm start

# 3. Go to http://localhost:3000

# 4. Create a test job
# - Click "Administration"
# - Click "Create Job"
# - Fill in job details
# - Submit

# 5. Apply for the job
# - Click "Apply"
# - Use YOUR EMAIL
# - Fill form
# - Submit

# 6. Check email
# - Go to your Gmail inbox
# - Look for "Application Received - [Job Title]"
# - May be in Spam initially

# 7. Test HR actions
# - Go back to admin
# - Find your application
# - Click "Shortlist"
# - Check email for notification

# 8. Done!
```

## 🚀 Deployment Commands

### Build for Production
```bash
npm run build
```

### Deploy to Netlify (Frontend)
```bash
# Using Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

### Deploy to Heroku (Backend)
```bash
# Create app
heroku create pvara-email-server

# Set environment variables
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-password

# Deploy
git push heroku main

# Check logs
heroku logs --tail
```

### Docker Build
```bash
docker build -t pvara:3.0 .
docker run -p 5000:5000 -e EMAIL_USER=... -e EMAIL_PASSWORD=... pvara:3.0
```

## 📝 Useful Environment Commands

### List Environment Variables
```bash
env | grep EMAIL
```

### Set Temporary Env Variable
```bash
export EMAIL_USER=your-email@gmail.com
export EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

### Reload .env.local
```bash
source .env.local
```

## 🔐 Gmail Setup Commands

### Generate App Password
1. Open: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy 16-character password
4. Run: `echo "EMAIL_PASSWORD=<password>" >> .env.local`

### Check Gmail Security
```bash
open https://myaccount.google.com/security
```

## 📊 Monitoring Commands

### Monitor Server Logs Real-time
```bash
npm run server 2>&1 | tee server.log
```

### Watch for Email Sends
```bash
grep "Email sent to" server.log
```

### Count Emails Sent
```bash
grep -c "Email sent to" server.log
```

## 🧹 Cleanup Commands

```bash
# Remove build folder
rm -rf build

# Remove node_modules (careful!)
rm -rf node_modules

# Clean npm cache
npm cache clean --force

# Remove .env.local (backup first!)
rm .env.local
```

## 📚 Helpful Reference URLs

```bash
# Gmail App Passwords
open https://myaccount.google.com/apppasswords

# Gmail Security Settings
open https://myaccount.google.com/security

# Nodemailer Documentation
open https://nodemailer.com

# Express.js Documentation
open https://expressjs.com
```

## ⚡ Quick Commands

```bash
# Start everything fresh
killall node 2>/dev/null && npm run server & npm start

# Run tests, build, and report
npm test && npm run build && echo "✅ All checks passed!"

# Quick verification
./test-email.sh && npm test && npm run build

# View all important files
ls -lh server.js .env.local EMAIL*.* package.json
```

---

**Quick Reference:**

| What | Command |
|------|---------|
| Start backend | `npm run server` |
| Start frontend | `npm start` |
| Run tests | `npm test` |
| Build production | `npm run build` |
| Verify setup | `./test-email.sh` |
| Kill port 5000 | `killall node` |
| Check Gmail | `cat .env.local` |
| Test email | `curl http://localhost:5000/health` |

---

For detailed guides, see the EMAIL_*.md files.
