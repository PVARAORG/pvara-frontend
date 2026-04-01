#!/bin/bash

# PVARA Email System Test Script
# Tests if email configuration is working

echo "🔍 PVARA Email System Test"
echo "=========================="
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found"
    echo "📝 Create .env.local with EMAIL_USER and EMAIL_PASSWORD"
    exit 1
fi

# Check if EMAIL_USER is configured
if ! grep -q "EMAIL_USER=" .env.local || grep "EMAIL_USER=your-email" .env.local > /dev/null; then
    echo "❌ EMAIL_USER not configured in .env.local"
    echo "📝 Edit .env.local and set your Gmail address"
    exit 1
fi

# Check if EMAIL_PASSWORD is configured
if ! grep -q "EMAIL_PASSWORD=" .env.local || grep "EMAIL_PASSWORD=your-app-password" .env.local > /dev/null; then
    echo "❌ EMAIL_PASSWORD not configured in .env.local"
    echo "📝 Edit .env.local and set your Gmail app password"
    exit 1
fi

echo "✅ .env.local is configured"
echo ""

# Extract email from .env.local
EMAIL=$(grep "EMAIL_USER=" .env.local | cut -d '=' -f 2)
echo "📧 Email User: $EMAIL"
echo ""

# Check if backend dependencies are installed
if [ ! -d "node_modules/express" ]; then
    echo "⚠️  Backend dependencies not installed"
    echo "💻 Run: npm install express cors dotenv nodemailer"
    exit 1
fi

echo "✅ Backend dependencies installed"
echo ""

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "❌ server.js not found"
    exit 1
fi

echo "✅ server.js found"
echo ""

# Check if PvaraPhase2.jsx has email integration
if ! grep -q "send-email-template" src/PvaraPhase2.jsx; then
    echo "❌ Email integration not found in PvaraPhase2.jsx"
    exit 1
fi

echo "✅ Email integration implemented"
echo ""

echo "🎉 Email system is configured and ready!"
echo ""
echo "📝 Next steps:"
echo "  1. Run: npm run server (in terminal 1)"
echo "  2. Run: npm start (in terminal 2)"
echo "  3. Submit an application with your email"
echo "  4. Check your inbox for confirmation email"
echo ""
