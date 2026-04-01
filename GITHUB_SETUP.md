# 🚀 GitHub & Deployment Setup Guide

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Sign in with your GitHub account (create one if needed)
3. **Repository name:** `pvara-frontend`
4. **Description:** Enterprise Recruitment Portal with AI Screening
5. **Visibility:** Public (for Vercel/Netlify easy integration)
6. **Do NOT initialize with README** (we have one)
7. Click **"Create repository"**

---

## Step 2: Push Your Code to GitHub

Run these commands in your terminal:

```bash
cd /Users/ubl/pvara-frontend

# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/pvara-frontend.git

# Rename main branch (if needed)
git branch -M main

# Push the current branch (feat/enterprise-ready)
git push -u origin feat/enterprise-ready

# Push main branch too
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username**

---

## Step 3: Verify on GitHub

1. Go to https://github.com/YOUR_USERNAME/pvara-frontend
2. You should see:
   - ✅ All your code files
   - ✅ Commit history (14 commits)
   - ✅ Both branches: `main` and `feat/enterprise-ready`
   - ✅ GitHub Actions CI running

---

## Step 4: Deploy to Vercel (Recommended)

### Option A: Using Vercel Web Interface (Easiest)

1. Go to https://vercel.com/new
2. **Sign up/Login** with GitHub
3. Click **"Import Git Repository"**
4. Select **`pvara-frontend`** from your repositories
5. **Configure:**
   - Framework Preset: **React**
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`
6. Click **"Deploy"** 🚀
7. **Get your live URL** (e.g., `https://pvara-frontend.vercel.app`)

### Option B: Using Vercel CLI

```bash
npm install -g vercel
cd /Users/ubl/pvara-frontend
vercel --prod
```

---

## Step 5: Enable Auto-Deployment

After deploying to Vercel:

1. Go to **Vercel Dashboard** → Your project
2. Click **"Settings"** → **"Git"**
3. **Production Branch:** Select `main` or `feat/enterprise-ready`
4. **Automatic Deployments:** Enabled ✅
5. Now every time you `git push`, Vercel auto-deploys!

---

## Step 6: Merge to Main (Production)

When ready for production:

```bash
# Create a Pull Request on GitHub
git push -u origin feat/enterprise-ready

# Then on GitHub:
# 1. Go to Pull Requests
# 2. Create PR: "feat/enterprise-ready" → "main"
# 3. Add description of changes
# 4. Merge to main
# 5. GitHub Actions runs CI
# 6. Vercel auto-deploys main branch
```

---

## 📊 Complete Workflow

```
Local Development
        ↓
    git push
        ↓
GitHub (feat/enterprise-ready branch)
        ↓
GitHub Actions CI Runs (npm test)
        ↓
If tests pass → Vercel preview deployment
        ↓
Create Pull Request
        ↓
Review & Merge to main
        ↓
GitHub Actions runs again
        ↓
Vercel deploys main → PRODUCTION LIVE 🚀
```

---

## 🔑 Quick Commands Reference

```bash
# Check remote
git remote -v

# Update remote URL (if you made a typo)
git remote set-url origin https://github.com/YOUR_USERNAME/pvara-frontend.git

# Push all branches
git push origin --all

# Push all tags
git push origin --tags

# Check what's committed
git status

# View recent commits
git log --oneline -10
```

---

## ✅ Verification Checklist

- [ ] GitHub account created
- [ ] Repository created at github.com/YOUR_USERNAME/pvara-frontend
- [ ] Code pushed to GitHub
- [ ] GitHub Actions CI running (should pass)
- [ ] Vercel account created
- [ ] Project deployed to Vercel
- [ ] Got live URL (https://pvara-frontend-xyz.vercel.app)
- [ ] Auto-deployment enabled
- [ ] Feature branch merged to main

---

## 🎯 Next Steps

1. **Share the Vercel URL** with your team
2. **Test all features** on the live link
3. **Monitor Vercel Dashboard** for deployments
4. **Keep pushing code** - auto-deploys on each push

---

## 📞 Troubleshooting

### "git remote already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/pvara-frontend.git
```

### "Permission denied (publickey)"
Generate SSH key: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### "Vercel build failed"
Check Vercel logs → Usually missing env vars or node version

### "GitHub Actions failing"
Check `.github/workflows/ci.yml` → Run tests locally first: `npm test`

---

## 🚀 You're All Set!

Your PVARA Enterprise Recruitment Portal is now:
- ✅ Backed up on GitHub
- ✅ Continuously integrated (CI/CD)
- ✅ Deployed to the cloud
- ✅ Auto-updating on every push
- ✅ Ready for production

**Your live app:** https://pvara-frontend-YOUR_USERNAME.vercel.app

---

## 📖 Resources

- GitHub Docs: https://docs.github.com
- Vercel Docs: https://vercel.com/docs
- GitHub Actions: https://docs.github.com/en/actions
- React Deployment: https://create-react-app.dev/deployment

