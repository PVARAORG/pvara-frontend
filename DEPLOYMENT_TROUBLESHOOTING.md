# 🔧 Netlify Deployment Troubleshooting Guide

## ⚠️ Deployment Failed - Let's Fix It

### Step 1: Check the Netlify Build Logs

1. Go to **https://app.netlify.com**
2. Click your site name
3. Click **"Deploys"** tab
4. Find the failed deployment (red ❌)
5. Click it to view build logs
6. Scroll to the **end** to see the error message

### Step 2: Common Deployment Errors & Solutions

#### Error: "npm ERR! code ERESOLVE" or Dependency Issues

**Problem:** npm dependencies won't resolve
**Solution:**
```bash
# Locally:
rm -rf node_modules package-lock.json
npm install
npm run build
git add -A && git commit -m "fix: update dependencies"
git push origin main
```

#### Error: "ENOENT: no such file or directory"

**Problem:** Missing file or directory
**Solution:**
- Check that all source files are committed to GitHub
- Verify `src/`, `public/`, `package.json` all exist
```bash
git status  # Should show "working tree clean"
```

#### Error: "Out of memory" or "FATAL ERROR"

**Problem:** Build runs out of memory on Netlify
**Solution:**
Add to `netlify.toml`:
```toml
[build]
command = "npm run build"
publish = "build"
environment = { NODE_ENV = "production", CI = "true" }
```

#### Error: "Module not found" or "Cannot find module"

**Problem:** Missing package in package.json
**Solution:**
```bash
# Check what's missing
npm install
# Look at package.json to see all dependencies
cat package.json | grep dependencies -A 20
# Verify it has: express, cors, dotenv, nodemailer
```

#### Error: "/build: no such file or directory"

**Problem:** Build directory isn't created
**Solution:**
- The build folder should be created by `npm run build`
- Check `netlify.toml` has correct publish directory:
```toml
publish = "build"  # ← Must be "build"
```

### Step 3: Verify Local Build Works

Run these commands locally to verify everything works:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test the build
npm run build

# Check build folder created
ls -la build/

# Should see: index.html, static/, manifest.json, robots.txt
```

If any of these fail, fix them locally before pushing to GitHub.

### Step 4: Force Redeploy

Sometimes just redeploying helps:

1. Go to your Netlify site
2. Click **"Deploys"**
3. Click **"Trigger deploy"** → **"Deploy site"**
4. Wait for build to complete
5. Check logs for errors

### Step 5: Check netlify.toml Configuration

Verify your `netlify.toml` is correct:

```toml
[build]
command = "npm run build"
publish = "build"

[dev]
command = "npm start"
port = 3000

[[redirects]]
from = "/*"
to = "/index.html"
status = 200

[context.production]
environment = { REACT_APP_ENV = "production" }
```

If it looks different, update it with this content.

### Step 6: Check Build Settings in Netlify Dashboard

In Netlify dashboard:

1. Click your site
2. Go to **"Site settings"**
3. Click **"Build & deploy"** → **"Build settings"**
4. Verify:
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
   - **Node version:** 18.x or higher (if shown)

### Step 7: Check for Node Version Issues

Netlify might need a specific Node version:

Add to `netlify.toml`:
```toml
[build]
command = "npm run build"
publish = "build"

[build.environment]
NODE_VERSION = "18.0.0"
```

Or add `.nvmrc` to repo root:
```bash
echo "18" > .nvmrc
git add .nvmrc && git commit -m "fix: specify Node 18" && git push
```

### Step 8: Environment Variables (if needed)

Currently not needed for frontend-only app, but if you need them:

1. Go to Netlify site settings
2. Click **"Build & deploy"** → **"Environment"**
3. Click **"Edit variables"**
4. Add your variables
5. Redeploy

### Step 9: Check GitHub Connection

Make sure Netlify is connected properly:

1. Go to **Site settings**
2. Click **"Build & deploy"** → **"GitHub"**
3. Check it shows: `makenubl/pvara-frontend`
4. Click **"View on GitHub"** to verify
5. Ensure branch is **`main`**

### Step 10: Last Resort - Redeploy from CLI

If Netlify UI isn't working:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=build

# Check status
netlify status
```

---

## 🆘 Still Failing? Try These

### Option 1: Create `.gitignore` Entry

Make sure node_modules isn't committed:
```bash
cat > .gitignore << 'EOF'
node_modules/
build/
.env.local
.DS_Store
EOF

git add .gitignore
git commit -m "fix: gitignore"
git push
```

### Option 2: Remove Untracked Files

```bash
git clean -fd
git status  # Should show "working tree clean"
git push
```

### Option 3: Simplify package.json

Remove packages that might cause issues:

```bash
# These shouldn't be in dependencies (should be devDependencies):
# - server.js related packages (express, cors, etc.)

# If you added them to dependencies, move them:
npm install --save-dev express cors dotenv nodemailer
npm uninstall express cors dotenv nodemailer
npm run build
git add -A && git commit -m "fix: move backend packages to devDeps"
git push
```

### Option 4: Clear Netlify Cache

1. Go to Netlify site
2. **Deploys** tab
3. Click **"Trigger deploy"** → **"Clear cache and redeploy"**

---

## ✅ Verification Checklist

Before next deploy, verify:

- [ ] `npm install` works locally
- [ ] `npm run build` succeeds with no errors
- [ ] `build/` folder has `index.html`
- [ ] `netlify.toml` exists and looks correct
- [ ] All code is committed (`git status` shows clean)
- [ ] All code is pushed (`git log` shows recent commit)
- [ ] GitHub integration is enabled in Netlify
- [ ] Branch is set to `main`

---

## 📝 What to Tell Me

If it's still failing, please share:

1. **Netlify Error Message** (from build logs, end of output)
2. **Your build settings** (from Site settings → Build & deploy)
3. **Node version** (from build settings or .nvmrc)
4. **Output of local build:** `npm run build 2>&1 | tail -50`

With this info, I can pinpoint the exact issue and fix it.

---

## 🚀 After Fix

Once it deploys successfully:

1. Verify site loads at Netlify URL
2. Test all features work
3. Check on mobile device
4. Optional: Add custom domain

---

**Let's get your PVARA portal live! 🎉**
