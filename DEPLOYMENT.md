# 🚀 Production Deployment Guide

## ✅ Pre-Deployment Checklist

### Files Created:
- ✅ `.github/workflows/deploy-production.yml` - Auto-deploy on push to main
- ✅ `.github/workflows/deploy-staging.yml` - Auto-deploy on push to dev
- ✅ `.github/workflows/test.yml` - Run tests on push/PR
- ✅ `render.yaml` - Render deployment configuration (PostgreSQL)

### Configuration Verified:
- ✅ PostgreSQL configuration in `render.yaml`
- ✅ Database code supports PostgreSQL (with fallback to SQLite)
- ✅ Health check endpoint at `/health`
- ✅ Environment variables configured
- ✅ CORS settings ready
- ✅ Rate limiting configured
- ✅ Security headers in place

---

## 🎯 Deployment Steps

### Step 1: Push Code to GitHub

```bash
# Add all changes
git add .

# Commit changes
git commit -m "Production-ready: Add CI/CD workflows and PostgreSQL config"

# Push to your branch
git push origin prod-ready-changes

# Merge to main (or create PR)
git checkout main
git merge prod-ready-changes
git push origin main
```

### Step 2: Set Up Render.com

1. **Create Account**
   - Go to https://render.com
   - Sign up with GitHub (recommended)

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `pavitramandal37/mind-map-webapp`
   - Render will auto-detect `render.yaml`

3. **Configure Service**
   - Name: `mindmap-webapp` (or your choice)
   - Branch: `main`
   - Render will read all settings from `render.yaml`
   - Click "Create Web Service"

4. **Database Auto-Creation**
   - Render will automatically create PostgreSQL database
   - Database name: `mindmap-db`
   - Connection string will be injected as `DATABASE_URL`

### Step 3: Configure GitHub Secrets (Optional - for manual deploys)

Only needed if you want to trigger deployments via GitHub Actions manually:

1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `RENDER_API_KEY` - Get from Render Account Settings → API Keys
   - `RENDER_SERVICE_ID` - Get from Render service URL (srv-xxxxx)
   - `RENDER_STAGING_SERVICE_ID` - If you create staging environment

### Step 4: Monitor Deployment

1. **Check Build Logs**
   - In Render dashboard → Your service → Logs
   - Watch for:
     - ✅ Dependencies installed
     - ✅ Database tables created
     - ✅ Health check passing

2. **Verify Deployment**
   - URL will be: `https://mindmap-webapp.onrender.com` (or custom)
   - Test endpoints:
     - `https://your-app.onrender.com/health` → Should return "healthy"
     - `https://your-app.onrender.com/` → Should show login page

### Step 5: Update CORS After First Deploy

After first deployment, update `render.yaml` with actual URL:

```yaml
- key: CORS_ORIGINS
  value: '["https://your-actual-url.onrender.com","http://localhost:8000"]'
```

Then commit and push to trigger redeploy.

---

## 🔧 Post-Deployment Configuration

### Custom Domain (Optional)
1. Render Dashboard → Your Service → Settings → Custom Domain
2. Add your domain
3. Update DNS records as instructed

### Environment Variables
All set via `render.yaml`, but you can override in Render dashboard if needed.

### Monitoring
- Render provides basic monitoring on free tier
- Check logs regularly: Render Dashboard → Logs

---

## 🧪 Testing Production

### 1. Health Check
```bash
curl https://your-app.onrender.com/health
```
Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "timestamp": "2025-12-10T...",
  "database": "connected"
}
```

### 2. User Flow
1. ✅ Sign up new user
2. ✅ Login with credentials
3. ✅ Create mind map
4. ✅ Edit nodes
5. ✅ Delete mind map
6. ✅ Logout and login again
7. ✅ Verify data persists

### 3. API Endpoints
- `GET /health` - Health check
- `POST /auth/signup` - User registration
- `POST /auth/token` - Login
- `GET /api/maps/` - List maps
- `POST /api/maps/` - Create map

---

## 🚨 Troubleshooting

### Issue: Build Fails
- Check Render logs for errors
- Verify `requirements.txt` is correct
- Ensure Python 3.11+ specified

### Issue: Database Connection Failed
- Verify DATABASE_URL is set (auto-injected by Render)
- Check database service is running
- Verify database name matches in render.yaml

### Issue: Health Check Fails
- Check if app is listening on correct port ($PORT)
- Verify uvicorn command in render.yaml
- Check application logs for startup errors

### Issue: CORS Errors
- Update CORS_ORIGINS with actual deployed URL
- Redeploy after updating

### Issue: Free Tier Spin Down
- Render spins down after 15 min inactivity
- First request after spin down takes ~30 seconds
- Upgrade to paid tier ($7/month) to prevent this

---

## 💡 Best Practices

### Security
- ✅ Never commit `.env` file
- ✅ Use Render's generateValue for SECRET_KEY
- ✅ Enable HTTPS only (Render does this automatically)
- ✅ Keep dependencies updated

### Performance
- Monitor response times in Render dashboard
- PostgreSQL free tier: 256MB RAM, 1GB storage
- Consider upgrading if you exceed limits

### Backup
- Render provides automatic backups for paid plans
- Free tier: Manual backups recommended
- Export data regularly via API

---

## 📊 What You Get

### Free Tier Limits:
- ✅ 750 hours/month (enough for 1 service 24/7)
- ✅ PostgreSQL database (256MB RAM, 1GB storage)
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ GitHub integration
- ⚠️ Spins down after 15 min inactivity

### Paid Tier ($7/month):
- No spin down
- More resources
- Better support
- Automatic backups

---

## 🎉 Success Checklist

- [ ] Code pushed to GitHub main branch
- [ ] Render service created
- [ ] Build completed successfully
- [ ] Health check passing
- [ ] Can sign up new user
- [ ] Can create mind maps
- [ ] Data persists across sessions
- [ ] CORS updated with actual URL
- [ ] Custom domain configured (optional)

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **GitHub Issues**: Create issue in your repo
- **Render Community**: https://community.render.com

---

**Deployment Date**: December 10, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
