# Deployment Guide - Understanding main.py and Environment Configuration

## Table of Contents
1. [How main.py Works](#how-mainpy-works)
2. [Environment Variables Explained](#environment-variables-explained)
3. [Development vs Production](#development-vs-production)
4. [Render Deployment Process](#render-deployment-process)
5. [Do You Need to Update main.py?](#do-you-need-to-update-mainpy)

---

## How main.py Works

`app/main.py` is the **entry point** of your FastAPI application. When you run:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Uvicorn looks for `app/main.py` and loads the `app` object (FastAPI instance).

### Step-by-Step Breakdown

#### 1. Import Configuration (Line 11)
```python
from .core.config import settings
```
- Loads settings from `app/core/config.py`
- Settings automatically read from `.env` file (in development)
- Or from environment variables (in production)

#### 2. Create Database Tables (Line 23)
```python
Base.metadata.create_all(bind=engine)
```
- **Runs immediately when file is imported**
- Creates `users` and `mindmaps` tables if they don't exist
- Safe to run multiple times (won't duplicate tables)

#### 3. Initialize FastAPI App (Lines 26-32)
```python
app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)
```

**Key behavior:**
- `docs_url="/docs"` → Swagger UI available at http://localhost:8000/docs
- `if not settings.is_production else None` → **Disables docs in production for security**
- Uses `settings.is_production` property to check environment

**How is_production works:**
```python
# In app/core/config.py
@property
def is_production(self) -> bool:
    return self.ENVIRONMENT.lower() == "production"
```

#### 4. Setup Rate Limiting (Lines 35-37)
```python
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
```
- Prevents abuse by limiting requests per IP address
- Default: 100 requests per minute
- Specific limits in routers (login: 5/min, signup: 3/min)

#### 5. Configure CORS (Lines 40-46)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # From .env or environment variables
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**What CORS does:**
- Allows frontend (browser) to make requests to backend
- `allow_origins` specifies which domains can access the API
- In development: `["http://localhost:8000"]`
- In production: `["https://mindmap-webapp.onrender.com"]`

#### 6. Add Security Headers (Lines 49-57)
```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

**Security headers explained:**
- `X-Content-Type-Options: nosniff` → Prevents MIME type sniffing attacks
- `X-Frame-Options: DENY` → Prevents clickjacking (app can't be embedded in iframes)
- `X-XSS-Protection` → Enables browser XSS filter
- `Strict-Transport-Security` → Forces HTTPS (production only)

#### 7. Startup Event (Lines 60-69)
```python
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Mind Map WebApp starting up!")
    logger.info(f"🔧 Environment: {settings.ENVIRONMENT}")
    logger.info(f"🗄️  Database: {settings.DATABASE_URL.split('://')[0]}")
```

**Runs once when server starts:**
- Logs environment information
- Shows database type (sqlite or postgresql)
- Displays API docs URL (development only)

#### 8. Health Check Endpoint (Lines 77-88)
```python
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
```

**Used by Render.com to monitor your app:**
- Render pings `/health` every few minutes
- If returns 200 OK → app is healthy
- If fails → Render restarts the app

#### 9. Mount Static Files (Line 101)
```python
app.mount("/static", StaticFiles(directory="app/static"), name="static")
```
- Serves CSS, JavaScript, images from `app/static/`
- Access at: `http://localhost:8000/static/css/style.css`

#### 10. Include Routers (Lines 104-106)
```python
app.include_router(auth.router)   # /auth/* endpoints
app.include_router(maps.router)   # /api/maps/* endpoints
app.include_router(pages.router)  # /, /dashboard, /editor endpoints
```

**This connects your route files:**
```
app/main.py
    ↓
    ├─→ app/routers/auth.py  (signup, login, password reset)
    ├─→ app/routers/maps.py  (create, read, update, delete mind maps)
    └─→ app/routers/pages.py (serve HTML templates)
```

---

## Environment Variables Explained

### What are Environment Variables?

Environment variables are **configuration values** that change between environments without modifying code.

**Example:**
```bash
# Development
DATABASE_URL=sqlite:///./db/mindmap.db
ENVIRONMENT=development

# Production
DATABASE_URL=postgresql://user:password@host/database
ENVIRONMENT=production
```

### How They're Loaded

#### In Development (Your Local Computer)
```
1. You create .env file in project root
2. app/core/config.py reads .env file using pydantic-settings
3. Values are loaded into settings object
4. main.py uses settings.SECRET_KEY, settings.DATABASE_URL, etc.
```

#### In Production (Render.com)
```
1. Render.com sets environment variables in dashboard (or render.yaml)
2. app/core/config.py reads from system environment variables
3. .env file is NOT used (doesn't exist on server)
4. Values override defaults in Settings class
```

### How config.py Works

```python
# app/core/config.py

class Settings(BaseSettings):
    # Defaults (used if not in .env or environment variables)
    APP_NAME: str = "Mind Map WebApp"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = secrets.token_urlsafe(32)  # Auto-generate if not provided

    # Database URL with smart default
    DATABASE_URL: str = f"sqlite:///{Path(__file__).resolve().parent.parent.parent / 'db' / 'mindmap.db'}"

    # Pydantic settings configuration
    model_config = SettingsConfigDict(
        env_file=".env",           # Read from .env file
        env_file_encoding="utf-8",
        case_sensitive=True,       # ENVIRONMENT is different from environment
        extra="allow"              # Allow extra variables not defined in class
    )

# Create singleton instance
settings = Settings()
```

**Loading priority (highest to lowest):**
1. **System environment variables** (set by Render, or `export VAR=value`)
2. **.env file** (only in development)
3. **Default values** (in the class definition)

### Critical Environment Variables

| Variable | Development | Production | Purpose |
|----------|-------------|------------|---------|
| `ENVIRONMENT` | `development` | `production` | Controls features (docs, logging) |
| `SECRET_KEY` | From `.env` | Auto-generated by Render | Signs JWT tokens (MUST be secure) |
| `DATABASE_URL` | `sqlite:///./db/mindmap.db` | `postgresql://...` | Database connection |
| `DEBUG` | `true` | `false` | Verbose logging |
| `CORS_ORIGINS` | `["http://localhost:8000"]` | `["https://your-app.onrender.com"]` | Allowed domains |

---

## Development vs Production

### Key Differences

| Feature | Development | Production |
|---------|-------------|------------|
| **Database** | SQLite (file-based) | PostgreSQL (server) |
| **Environment** | `ENVIRONMENT=development` | `ENVIRONMENT=production` |
| **API Docs** | Enabled at `/docs` | Disabled (security) |
| **Logging** | `DEBUG` level (verbose) | `INFO` level (essential only) |
| **HTTPS** | Optional | Enforced (HSTS header) |
| **Secret Key** | Can use simple value | Must be cryptographically secure |
| **CORS Origins** | `localhost:8000` | Your production domain |

### How main.py Adapts

#### Development Mode Detection
```python
# Line 17-18
logging.basicConfig(
    level=logging.INFO if settings.is_production else logging.DEBUG,
)
```
- Development: Shows all debug messages
- Production: Only info/warning/error messages

#### API Docs Control
```python
# Line 30-31
app = FastAPI(
    docs_url="/docs" if not settings.is_production else None,
)
```
- Development: http://localhost:8000/docs works
- Production: Returns 404 (security best practice)

#### Security Headers
```python
# Line 55-56
if settings.is_production:
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
```
- Production: Forces HTTPS for 1 year
- Development: Skipped (you might use http)

---

## Render Deployment Process

### What Happens When You Push to Main Branch

```
1. YOU: git push origin main
   ↓
2. GITHUB: Receives your code
   ↓
3. RENDER: Detects new commit (webhook from GitHub)
   ↓
4. RENDER: Runs buildCommand from render.yaml
   ├─→ pip install -r requirements.txt
   └─→ python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
   ↓
5. RENDER: Sets environment variables (from render.yaml)
   ├─→ ENVIRONMENT=production
   ├─→ SECRET_KEY=<auto-generated secure value>
   ├─→ DATABASE_URL=postgresql://... (from attached database)
   └─→ Other variables...
   ↓
6. RENDER: Runs startCommand
   └─→ uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ↓
7. RENDER: Pings /health endpoint
   ├─→ If healthy: Deploy succeeds ✅
   └─→ If fails: Rollback to previous version ❌
   ↓
8. APP: Live at https://mindmap-webapp.onrender.com
```

### render.yaml Breakdown

```yaml
services:
  - type: web
    name: mindmap-webapp
    runtime: python
    plan: free

    # Runs ONCE during deployment
    buildCommand: |
      pip install -r requirements.txt
      python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

    # Keeps running (serves requests)
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT

    # Environment variables (Render injects these)
    envVars:
      - key: ENVIRONMENT
        value: production

      - key: SECRET_KEY
        generateValue: true  # Render generates secure random value

      - key: DATABASE_URL
        fromDatabase:
          name: mindmap-db  # Automatically gets PostgreSQL connection string
          property: connectionString

      - key: CORS_ORIGINS
        value: '["https://mindmap-webapp.onrender.com"]'

    # Health check (Render pings this URL)
    healthCheckPath: /health

databases:
  - name: mindmap-db
    databaseName: mindmap
    plan: free
```

### Environment Variable Injection

**Development (.env file):**
```bash
SECRET_KEY=my-dev-key
DATABASE_URL=sqlite:///./db/mindmap.db
ENVIRONMENT=development
```

**Production (Render injects these as system environment variables):**
```bash
export SECRET_KEY="WjB3x7YZ..." # Generated by Render
export DATABASE_URL="postgresql://mindmap:password@dpg-xxxxx.oregon-postgres.render.com/mindmap"
export ENVIRONMENT="production"
export CORS_ORIGINS='["https://mindmap-webapp.onrender.com"]'
export PORT="10000"  # Render assigns a port
```

**Your app reads these using:**
```python
# app/core/config.py
settings = Settings()  # Automatically reads environment variables
```

---

## Do You Need to Update main.py?

### Short Answer: **NO** ✅

`main.py` is already **deployment-ready**. It automatically adapts based on environment variables.

### Why It Works Without Changes

#### 1. Environment Detection
```python
# main.py uses settings.is_production
if settings.is_production:
    # Production behavior
else:
    # Development behavior
```

#### 2. Dynamic Configuration
```python
# Everything comes from settings object
app = FastAPI(
    docs_url="/docs" if not settings.is_production else None,  # Auto-disables in prod
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Changes per environment
)
```

#### 3. Database Abstraction
```python
# database.py automatically uses correct database
engine = create_engine(settings.DATABASE_URL)  # SQLite or PostgreSQL
```

### When You WOULD Need to Update main.py

**Only if you want to add new features:**

#### Example 1: Add Custom Logging Service
```python
if settings.is_production:
    # Send logs to external service (Sentry, LogRocket, etc.)
    import sentry_sdk
    sentry_sdk.init(dsn=settings.SENTRY_DSN)
```

#### Example 2: Add Caching
```python
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.on_event("startup")
async def startup():
    if settings.REDIS_URL:
        FastAPICache.init(RedisBackend(settings.REDIS_URL))
```

#### Example 3: Custom Middleware
```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"{request.method} {request.url} - {duration:.2f}s")
    return response
```

### What You DO Need to Update for Deployment

#### 1. Environment Variables (render.yaml or Render Dashboard)

**Update CORS_ORIGINS with your actual domain:**
```yaml
envVars:
  - key: CORS_ORIGINS
    value: '["https://YOUR-ACTUAL-APP-NAME.onrender.com"]'
```

#### 2. Database Connection (Already Configured)

Render automatically sets `DATABASE_URL` when you attach a PostgreSQL database:
```yaml
envVars:
  - key: DATABASE_URL
    fromDatabase:
      name: mindmap-db
      property: connectionString
```

#### 3. Optional: Update Security Settings

**Stronger rate limiting for production:**
```yaml
envVars:
  - key: RATE_LIMIT_PER_MINUTE
    value: 30  # More strict than development
  - key: LOGIN_RATE_LIMIT
    value: 3   # Reduce login attempts
```

---

## Complete Deployment Checklist

### Before First Deployment

- [ ] **Create Render account** and connect GitHub repository
- [ ] **Update `CORS_ORIGINS`** in render.yaml with your Render URL
- [ ] **Verify render.yaml** has correct buildCommand and startCommand
- [ ] **Add PostgreSQL database** in Render dashboard (or via render.yaml)
- [ ] **Commit and push** to main branch

### Render Will Automatically Handle

- [x] Installing Python dependencies (`pip install -r requirements.txt`)
- [x] Creating database tables (via buildCommand)
- [x] Generating secure `SECRET_KEY`
- [x] Injecting `DATABASE_URL` from PostgreSQL
- [x] Setting `ENVIRONMENT=production`
- [x] Running health checks (`/health` endpoint)
- [x] Assigning a port (`$PORT` variable)
- [x] Providing HTTPS certificate

### Your App Automatically Handles

- [x] Reading environment variables (config.py)
- [x] Switching to production mode (disables docs)
- [x] Using PostgreSQL instead of SQLite
- [x] Applying security headers (HSTS)
- [x] Adjusting logging level
- [x] Enforcing rate limits

---

## Troubleshooting Deployment

### Issue: App crashes on startup

**Check Render logs for:**
```
ModuleNotFoundError: No module named 'xyz'
```
**Solution:** Add missing package to `requirements.txt`

### Issue: Database tables not created

**Verify buildCommand in render.yaml:**
```yaml
buildCommand: |
  pip install -r requirements.txt
  python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### Issue: CORS errors in browser

**Check CORS_ORIGINS environment variable:**
```yaml
envVars:
  - key: CORS_ORIGINS
    value: '["https://your-app.onrender.com"]'  # Must match exact domain
```

### Issue: Health check failing

**Test locally:**
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "environment": "production",
  "timestamp": "2025-12-15T10:30:00Z"
}
```

### Issue: API docs not available in production

**This is intentional!** Docs are disabled in production for security:
```python
docs_url="/docs" if not settings.is_production else None
```

To test API in production, use tools like:
- Postman
- curl
- Your frontend application

---

## Summary

### Key Takeaways

1. **main.py is deployment-ready** - No code changes needed
2. **Environment variables control behavior** - Development vs production
3. **Render handles infrastructure** - Database, HTTPS, environment variables
4. **config.py is the bridge** - Reads .env (dev) or environment variables (prod)
5. **Push to main = auto-deploy** - Render detects commits and deploys

### The Magic of settings.is_production

This single property controls:
- API documentation (enabled/disabled)
- Logging level (DEBUG/INFO)
- Security headers (HSTS enabled/disabled)
- Startup messages (shows docs URL or not)

### Environment Variable Flow

```
Development:
.env file → config.py → settings object → main.py

Production:
render.yaml → Render dashboard → System env vars → config.py → settings object → main.py
```

### No Changes Needed to main.py Because:

1. ✅ Uses `settings` object for all configuration
2. ✅ Automatically detects production via `ENVIRONMENT` variable
3. ✅ Adapts behavior based on `is_production` property
4. ✅ Health check endpoint already exists
5. ✅ Database abstraction works with both SQLite and PostgreSQL
6. ✅ Security headers are environment-aware
7. ✅ CORS origins come from configuration

**Just push to main branch and Render handles the rest!** 🚀
