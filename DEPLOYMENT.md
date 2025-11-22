# Deployment Guide - Mind Map Web Application

This guide covers deploying your Mind Map application to various free and low-cost hosting platforms.

---

## Table of Contents
1. [Pre-Deployment Setup](#pre-deployment-setup)
2. [Option 1: Render.com (Recommended)](#option-1-rendercom-recommended)
3. [Option 2: Railway.app](#option-2-railwayapp)
4. [Option 3: Fly.io](#option-3-flyio)
5. [Post-Deployment Steps](#post-deployment-steps)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Setup

### 1. Create .env File (Local Development Only)

```bash
# Generate a secure secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Create `.env` file in project root:
```env
SECRET_KEY=<paste-generated-key-here>
ENVIRONMENT=development
DATABASE_URL=sqlite:///./mindmap.db
```

**⚠️ IMPORTANT:** Never commit `.env` to git (already in .gitignore)

### 2. Test Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
uvicorn app.main:app --reload

# Visit http://127.0.0.1:8000
```

Verify:
- ✅ App loads without errors
- ✅ Can create an account
- ✅ Can login
- ✅ Can create a mind map

### 3. Commit Your Changes

```bash
git add .
git commit -m "Prepare app for production deployment"
git push origin main
```

---

## Option 1: Render.com (Recommended)

**Why Render?** Free tier, easy setup, PostgreSQL included, auto-deployment from GitHub.

### Step-by-Step Deployment

#### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub (easiest)

#### 2. Connect Your Repository
- Click "New +" → "Blueprint"
- Connect your GitHub repository
- Select your `mind-map-webapp` repository

#### 3. Configure (Automatic with render.yaml)
Render will automatically detect the `render.yaml` file and configure:
- ✅ Web service
- ✅ PostgreSQL database
- ✅ Environment variables
- ✅ Health checks

#### 4. Update CORS Settings
After deployment, you'll get a URL like: `https://mindmap-webapp.onrender.com`

Update `render.yaml`:
```yaml
- key: CORS_ORIGINS
  value: https://YOUR-APP-NAME.onrender.com
```

Commit and push to trigger redeployment.

#### 5. Access Your App
- Your app will be live at: `https://your-app-name.onrender.com`
- **Note:** Free tier apps sleep after 15 minutes of inactivity

### Render - Manual Setup (Alternative)

If you prefer manual setup instead of Blueprint:

1. **Create PostgreSQL Database**
   - New → PostgreSQL
   - Name: `mindmap-db`
   - Plan: Free
   - Copy the **Internal Database URL**

2. **Create Web Service**
   - New → Web Service
   - Connect repository
   - Name: `mindmap-webapp`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Add Environment Variables**
   ```
   ENVIRONMENT=production
   SECRET_KEY=<click 'Generate'>
   DATABASE_URL=<paste Internal Database URL>
   CORS_ORIGINS=https://your-app-name.onrender.com
   ```

---

## Option 2: Railway.app

**Why Railway?** $5/month free credit, simple deployment, great developer experience.

### Deployment Steps

#### 1. Install Railway CLI
```bash
npm install -g @railway/cli
# or
brew install railway
```

#### 2. Login and Initialize
```bash
railway login
railway init
```

#### 3. Add PostgreSQL
```bash
railway add --database postgres
```

#### 4. Set Environment Variables
```bash
railway variables set ENVIRONMENT=production
railway variables set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

#### 5. Deploy
```bash
railway up
```

#### 6. Open Your App
```bash
railway open
```

Your app will be deployed with a URL like: `https://mindmap-webapp.up.railway.app`

---

## Option 3: Fly.io

**Why Fly.io?** Free tier with 3 VMs, always-on (no sleep), global CDN.

### Deployment Steps

#### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

#### 2. Login
```bash
fly auth login
```

#### 3. Create Dockerfile
Create `Dockerfile` in project root:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4. Create fly.toml
```toml
app = "mindmap-webapp"

[build]

[env]
  ENVIRONMENT = "production"
  PORT = "8000"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"
```

#### 5. Launch
```bash
fly launch

# Follow prompts:
# - App name: mindmap-webapp (or your choice)
# - Region: Choose closest to you
# - PostgreSQL: Yes
# - Redis: No
```

#### 6. Set Secrets
```bash
fly secrets set SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

#### 7. Deploy
```bash
fly deploy
```

#### 8. Open App
```bash
fly open
```

---

## Post-Deployment Steps

### 1. Test Your Deployed App

Visit your deployment URL and test:
- ✅ Homepage loads
- ✅ Can sign up
- ✅ Can login
- ✅ Can create/edit/delete mind maps
- ✅ Data persists after refresh

### 2. Monitor Application

#### Render.com
- Dashboard → Your Service → Logs
- Check for any errors or warnings

#### Railway
```bash
railway logs
```

#### Fly.io
```bash
fly logs
```

### 3. Set Up Custom Domain (Optional)

All platforms support custom domains on free tier:

- **Render:** Dashboard → Settings → Custom Domain
- **Railway:** Dashboard → Settings → Domains
- **Fly.io:** `fly certs add yourdomain.com`

### 4. Enable HTTPS (Automatic)

All platforms provide free SSL certificates automatically!

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | ✅ Yes | - | JWT secret (generate with `secrets.token_urlsafe(32)`) |
| `ENVIRONMENT` | ✅ Yes | `development` | Set to `production` |
| `DATABASE_URL` | ✅ Yes | - | Auto-set by hosting platforms |
| `CORS_ORIGINS` | ⚠️ Recommended | localhost | Your app's URL |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | JWT token expiration |
| `RATE_LIMIT_PER_MINUTE` | No | 60 | General rate limit |
| `LOGIN_RATE_LIMIT` | No | 5 | Login attempts per minute |
| `MIN_PASSWORD_LENGTH` | No | 8 | Minimum password length |

---

## Troubleshooting

### Issue: App doesn't start

**Check logs:**
```bash
# Render: Dashboard → Logs
# Railway: railway logs
# Fly.io: fly logs
```

**Common causes:**
- Missing environment variables
- Database connection issues
- Port binding errors

**Solution:**
```bash
# Verify environment variables are set
# Render: Dashboard → Environment
# Railway: railway variables
# Fly.io: fly secrets list
```

### Issue: Database connection failed

**Check:**
1. DATABASE_URL is set correctly
2. PostgreSQL instance is running
3. Firewall rules allow connection

**Render:** Make sure you're using the **Internal Database URL**

### Issue: CORS errors in browser

**Solution:** Update CORS_ORIGINS environment variable with your actual deployment URL:
```env
CORS_ORIGINS=https://your-app-name.onrender.com
```

### Issue: App shows "502 Bad Gateway"

**Causes:**
- App crashed on startup
- Wrong port binding (should use `$PORT` or `8000`)

**Solution:** Check logs and ensure start command is:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Issue: "Module not found" errors

**Cause:** Dependencies not installed

**Solution:**
```bash
# Verify requirements.txt is committed
git add requirements.txt
git commit -m "Add dependencies"
git push
```

### Issue: Free tier app sleeps (Render)

**Expected behavior:** Render free tier apps sleep after 15 minutes of inactivity.

**Solutions:**
1. Upgrade to paid tier ($7/month)
2. Use a service like [UptimeRobot](https://uptimerobot.com/) to ping every 5 minutes
3. Switch to Fly.io (free tier stays awake)

---

## Cost Comparison

| Platform | Free Tier | Always-On | PostgreSQL | Auto-Deploy |
|----------|-----------|-----------|------------|-------------|
| **Render** | ✅ Yes | ❌ Sleeps after 15min | ✅ 90 days free | ✅ Yes |
| **Railway** | ⚠️ $5 credit/month | ✅ Yes | ✅ Included | ✅ Yes |
| **Fly.io** | ✅ Yes (3 VMs) | ✅ Yes | ⚠️ Limited storage | ⚠️ Manual |
| **PythonAnywhere** | ✅ Yes | ✅ Yes | ❌ MySQL only | ❌ No |

### Recommendation

- **Best for beginners:** Render.com (easiest setup)
- **Best for always-on free:** Fly.io
- **Best developer experience:** Railway.app ($5/month)

---

## Security Checklist

Before going live, ensure:

- ✅ SECRET_KEY is strong and unique (never use default)
- ✅ ENVIRONMENT is set to `production`
- ✅ CORS_ORIGINS matches your domain
- ✅ Database backups are configured
- ✅ HTTPS is enabled (automatic on all platforms)
- ✅ Rate limiting is active
- ✅ Logs are monitored
- ✅ .env file is NOT committed to git

---

## Next Steps After Deployment

1. **Set up monitoring** - Use platform's built-in monitoring
2. **Configure backups** - Most platforms auto-backup databases
3. **Add custom domain** - Makes your app professional
4. **Enable analytics** - Track usage (Google Analytics, Plausible)
5. **Set up CI/CD** - Already done with auto-deploy from GitHub!

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review platform-specific documentation
3. Check application logs
4. Verify all environment variables are set correctly

Happy deploying! 🚀
