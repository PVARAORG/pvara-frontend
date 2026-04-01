# 🚀 PVARA Portal - Netlify Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Build compiles successfully
- [x] All tests passing (4/4)
- [x] All code committed to GitHub
- [x] netlify.toml configured
- [x] Environment variables documented

## 📋 Deployment Options

### Option 1: Netlify CLI (Recommended for Testing)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy the build folder
netlify deploy --prod --dir=build
```

### Option 2: GitHub Integration (Recommended for Production)

1. Go to https://netlify.com
2. Click "New site from Git"
3. Select "GitHub"
4. Connect your GitHub account
5. Select repository: `pvara-frontend`
6. Build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
7. Click "Deploy site"

Netlify will automatically:
- Build your app on every push to main
- Deploy to production
- Set up automatic HTTPS

### Option 3: Manual Drag & Drop

1. Go to https://app.netlify.com
2. Drag and drop the `build` folder
3. Your site is live! (temporary URL)

## 📝 Configuration

### netlify.toml (Already Configured)

```toml
[build]
command = "npm run build"
publish = "build"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

This configuration:
- Builds with: `npm run build`
- Publishes from: `build/` directory
- Redirects all routes to index.html (for React routing)

## 🔐 Environment Variables

### Frontend Environment Variables

Set in Netlify dashboard (Site settings → Build & deploy → Environment):

```
REACT_APP_ENV=production
REACT_APP_API_URL=https://backend.pvara.team
```

### Backend Environment Variables (if using Netlify Functions)

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NODE_ENV=production
```

## 📊 Site Configuration

### After Deployment

1. **Custom Domain**
   - Site settings → Domain management
   - Add your custom domain
   - Configure DNS

2. **HTTPS**
   - Automatically enabled by Netlify
   - Free Let's Encrypt certificate

3. **Analytics**
   - Netlify Analytics available
   - Monitor traffic and performance

4. **Builds**
   - Netlify builds on every push
   - View build logs
   - Rollback if needed

## 🔄 Continuous Deployment

Every push to `main` branch will:
1. Trigger a Netlify build
2. Run `npm run build`
3. Deploy to production (if build succeeds)
4. Update your live site

### Deployment Workflow

```
Git Push to main
    ↓
GitHub notifies Netlify
    ↓
Netlify clones repository
    ↓
npm install
    ↓
npm run build
    ↓
Build folder deployed
    ↓
Site goes live ✅
```

## 📱 What Gets Deployed

The `build/` folder contains:
- `index.html` - Main HTML file
- `static/js/main.*.js` - React app (minified)
- `static/css/main.*.css` - Styles (minified)
- `static/media/` - Images and assets
- `manifest.json` - PWA manifest
- `robots.txt` - SEO configuration

## ✅ Verification

After deployment, verify:

```bash
# Check build was successful
# Site status shows "Published"

# Test your domain
curl https://your-site.netlify.app

# Check responsive design
# Open on mobile, tablet, desktop

# Test all features
# Create job, apply, check status updates
```

## 🐛 Troubleshooting

### Build Fails

1. Check Netlify build logs
2. Run `npm run build` locally
3. Check for errors in console
4. Verify all dependencies installed

### Site Not Loading

1. Check if publish directory is `build`
2. Verify netlify.toml redirects are set
3. Clear browser cache
4. Check domain DNS settings

### Styles Not Loading

1. Check CSS file was built
2. Verify build size: `ls -lh build/static/css/`
3. Check network tab in DevTools
4. Clear Netlify cache: Site settings → Build & deploy → Trigger deploy

### Deployment Too Slow

1. Check bundle size: `npm run build`
2. Optimize large dependencies
3. Consider code splitting

## 🚀 Go Live Checklist

- [ ] Build is successful
- [ ] All tests passing
- [ ] Code pushed to GitHub
- [ ] Netlify site created
- [ ] Custom domain configured
- [ ] HTTPS enabled
- [ ] Environment variables set
- [ ] Auto-deployment enabled
- [ ] Site verified in browser
- [ ] Features tested

## 📊 Monitoring

### Netlify Dashboard

- View all deployments
- Check build status
- Monitor performance
- Configure redirects
- Manage domains
- Set up notifications

### URL Structure

```
https://pvara-recruitment.netlify.app    (Netlify subdomain)
https://your-domain.com                  (Custom domain)
```

## 🔄 Rollback

If deployment has issues:

1. Go to Netlify dashboard
2. Click "Deploys"
3. Find previous successful deploy
4. Click "Publish deploy"
5. Site instantly reverts

## 📞 Getting Help

- Netlify Docs: https://docs.netlify.com
- Netlify Support: https://support.netlify.com
- Community: https://community.netlify.com

## 🎉 You're Live!

Your PVARA portal is now live on the internet!

### Next Steps

1. Share your deployment URL
2. Test all features on live site
3. Gather feedback
4. Deploy backend to Heroku (if needed)
5. Set up email notifications
6. Monitor analytics

### Live URLs

- Frontend: https://your-site.netlify.app
- Repository: https://github.com/makenubl/pvara-frontend

---

**Your PVARA portal is production-ready and deployed! 🎊**
