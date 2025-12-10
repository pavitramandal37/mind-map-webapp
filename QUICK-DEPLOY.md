# 🚀 Quick Deployment Commands

## Deploy to Production (5 Minutes)

```bash
# Step 1: Commit and push
git add .
git commit -m "Production deployment: PostgreSQL config and CI/CD"
git push origin prod-ready-changes

# Step 2: Merge to main
git checkout main
git merge prod-ready-changes
git push origin main

# Step 3: Go to Render.com
# - Sign up at https://render.com
# - Click "New +" → "Web Service"
# - Connect: pavitramandal37/mind-map-webapp
# - Select branch: main
# - Render auto-detects render.yaml
# - Click "Create Web Service"
# - Wait 3-5 minutes for deployment

# Step 4: Test
# Visit: https://mindmap-webapp.onrender.com/health
```

## What Gets Deployed:
✅ FastAPI web application  
✅ PostgreSQL database (auto-created)  
✅ All environment variables (auto-configured)  
✅ HTTPS enabled automatically  
✅ Health monitoring  

## GitHub Secrets (Optional):
Only if you want manual deployment control:
- `RENDER_API_KEY` - From Render Account Settings
- `RENDER_SERVICE_ID` - From service URL

## Files Created:
- ✅ `.github/workflows/deploy-production.yml`
- ✅ `.github/workflows/deploy-staging.yml`
- ✅ `.github/workflows/test.yml`
- ✅ `DEPLOYMENT.md` (full guide)
- ✅ `PRODUCTION-STATUS.md` (readiness report)

## Status: 🟢 100% READY FOR PRODUCTION

Cost: **$0/month** (Free tier)  
Time to Deploy: **15-20 minutes**  
First Deploy: **3-5 minutes**
