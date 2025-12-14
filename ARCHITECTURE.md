# Mind Map WebApp - Architecture Documentation

> **Purpose**: This document explains how all the code in this application connects together, making it easier to understand the complete system architecture.

---

## Table of Contents
1. [Quick Overview](#quick-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [How Data Flows Through the App](#how-data-flows-through-the-app)
5. [Understanding Each Layer](#understanding-each-layer)
6. [Key Features Explained](#key-features-explained)
7. [Security & Authentication](#security--authentication)
8. [Common Development Tasks](#common-development-tasks)

---

## Quick Overview

This is a **full-stack web application** for creating and managing interactive mind maps.

**What it does:**
- Users sign up and log in
- Create multiple mind maps
- Edit mind maps with an interactive D3.js visualization
- Auto-save changes
- Organize ideas hierarchically

**How it's built:**
```
┌─────────────────────────────────────────────────┐
│  Frontend (Browser)                             │
│  - HTML templates (Jinja2)                      │
│  - JavaScript (D3.js for visualization)         │
│  - CSS for styling                              │
└──────────────┬──────────────────────────────────┘
               │ HTTP/HTTPS + JWT tokens
┌──────────────▼──────────────────────────────────┐
│  Backend API (FastAPI)                          │
│  - REST endpoints (/api/maps, /auth)            │
│  - JWT authentication                           │
│  - Business logic                               │
└──────────────┬──────────────────────────────────┘
               │ SQL queries
┌──────────────▼──────────────────────────────────┐
│  Database (SQLite/PostgreSQL)                   │
│  - Users table                                  │
│  - MindMaps table                               │
└─────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework (handles HTTP requests)
- **SQLAlchemy**: ORM (Object-Relational Mapping) - talks to database
- **Pydantic**: Data validation (ensures data is correct format)
- **JWT (JSON Web Tokens)**: Secure authentication
- **Uvicorn**: Web server that runs the application

### Frontend
- **Vanilla JavaScript**: No framework (simpler to understand)
- **D3.js**: Visualization library (draws the mind map tree)
- **Jinja2**: Template engine (generates HTML on server)
- **CSS3**: Styling with glass-morphism design

### Database
- **SQLite** (development): Simple file-based database
- **PostgreSQL** (production): Robust production database

---

## Project Structure

```
mind-map-webapp/
│
├── app/                          # Main application code
│   ├── main.py                   # 🚀 START HERE - Application entry point
│   ├── models.py                 # Database table definitions
│   ├── schemas.py                # Data validation rules
│   ├── auth.py                   # Authentication logic (passwords, JWT)
│   ├── database.py               # Database connection setup
│   │
│   ├── core/
│   │   └── config.py             # Configuration (SECRET_KEY, DATABASE_URL, etc.)
│   │
│   ├── routers/                  # API endpoints (like controllers)
│   │   ├── auth.py               # Login, signup, password reset
│   │   ├── maps.py               # CRUD operations for mind maps
│   │   └── pages.py              # Serves HTML pages
│   │
│   ├── static/                   # Frontend assets (sent to browser)
│   │   ├── css/
│   │   │   └── style.css         # All styling
│   │   ├── js/
│   │   │   ├── api.js            # Wrapper for API calls
│   │   │   └── mindmap.js        # D3.js mind map visualization
│   │   ├── assets/               # Images (logo, banner)
│   │   └── icons/                # UI icons
│   │
│   └── templates/                # HTML templates
│       ├── base.html             # Common layout (header, footer)
│       ├── login.html            # Login page
│       ├── signup.html           # Registration page
│       ├── dashboard.html        # Mind map listing
│       └── editor.html           # Interactive mind map editor
│
├── db/
│   ├── mindmap.db                # SQLite database file (created at runtime)
│   └── db_manager.py             # CLI tool to view/manage database
│
├── .env                          # Environment variables (SECRET_KEY, etc.)
├── requirements.txt              # Python dependencies
└── render.yaml                   # Production deployment config
```

---

## How Data Flows Through the App

### Example: User Creates a Mind Map

Let's trace what happens when a user clicks "Create New Map":

```
1. USER ACTION (Browser)
   User clicks "+" card on dashboard
   ↓
2. FRONTEND JAVASCRIPT (dashboard.html)
   - Modal opens
   - User types title "My Project Ideas"
   - Clicks "Create"
   - submitCreateMap() function runs
   ↓
3. API CALL (static/js/api.js)
   POST /api/maps/
   Headers: {
     Authorization: "Bearer eyJhbGc..."  // JWT token from localStorage
   }
   Body: {
     title: "My Project Ideas",
     data: '{"name":"My Project Ideas","children":[]}'
   }
   ↓
4. BACKEND ROUTING (app/main.py → app/routers/maps.py)
   - FastAPI receives request
   - Routes to create_mindmap() function
   ↓
5. AUTHENTICATION (app/auth.py)
   - get_current_user() dependency runs
   - Validates JWT token
   - Extracts user email from token
   - Looks up user in database
   - If invalid: returns 401 error
   ↓
6. DATA VALIDATION (app/schemas.py)
   - MindMapCreate schema validates request
   - Ensures title exists
   - Ensures data is valid JSON
   ↓
7. DATABASE OPERATION (app/routers/maps.py → app/models.py)
   db_mindmap = MindMap(
     title="My Project Ideas",
     data='{"name":"My Project Ideas","children":[]}',
     user_id=current_user.id  # From JWT token
   )
   db.add(db_mindmap)
   db.commit()
   ↓
8. RESPONSE BACK TO FRONTEND
   {
     "id": 5,
     "title": "My Project Ideas",
     "data": "...",
     "user_id": 1,
     "created_at": "2025-12-14T10:30:00"
   }
   ↓
9. FRONTEND UPDATE
   - Modal closes
   - Page reloads mind map list
   - New map appears in grid
```

### Example: User Edits a Node in the Mind Map

```
1. USER ACTION
   Double-clicks on a node "Marketing Ideas"
   ↓
2. FRONTEND (static/js/mindmap.js)
   - editNodeModal() shows modal
   - Pre-fills current title and description
   - User edits text
   - Clicks "Save"
   - saveNodeEdit() updates the data structure
   ↓
3. AUTO-SAVE TRIGGERED
   - refreshMap() redraws the visualization
   - saveMap() sends data to backend
   ↓
4. API CALL
   PUT /api/maps/5
   Body: {
     data: '{"name":"My Project Ideas","children":[...]}'
   }
   ↓
5. BACKEND UPDATES DATABASE
   - Validates ownership (user_id matches)
   - Validates JSON format
   - Updates mindmaps.data column
   - Sets updated_at to current time
   ↓
6. SUCCESS RESPONSE
   - Frontend shows "Saved" message
```

---

## Understanding Each Layer

### 1. Entry Point: `app/main.py`

This is where the application starts. Key parts:

```python
# Create the FastAPI application
app = FastAPI(title="Mind Map WebApp")

# Add security features
app.add_middleware(SlowAPIMiddleware)  # Rate limiting
app.add_middleware(CORSMiddleware)     # Cross-origin requests

# Include routers (API endpoints)
app.include_router(auth_router)        # /auth/* endpoints
app.include_router(maps_router)        # /api/maps/* endpoints
app.include_router(pages_router)       # Page routes (/, /dashboard, etc.)

# Startup event
@app.on_event("startup")
async def startup():
    # Create database tables if they don't exist
    Base.metadata.create_all(bind=engine)
```

**To run the app:**
```bash
uvicorn app.main:app --reload
```

### 2. Database Layer: `app/models.py`

Defines the database structure:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    hashed_password = Column(String)
    security_question = Column(String)
    security_answer_hash = Column(String)
    hint = Column(String)

    # Relationship: one user has many mind maps
    mindmaps = relationship("MindMap", back_populates="owner")

class MindMap(Base):
    __tablename__ = "mindmaps"

    id = Column(Integer, primary_key=True)
    title = Column(String)
    data = Column(Text)  # JSON string of mind map structure
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    # Relationship: each mind map belongs to one user
    owner = relationship("User", back_populates="mindmaps")
```

**Database relationships:**
```
┌─────────────────┐
│  User           │
│  id: 1          │───┐
│  email: ...     │   │
└─────────────────┘   │
                      │ One-to-Many
                      │
                      ├──> MindMap (id: 1, user_id: 1, title: "Project Ideas")
                      ├──> MindMap (id: 2, user_id: 1, title: "Study Notes")
                      └──> MindMap (id: 3, user_id: 1, title: "Travel Plans")
```

### 3. API Endpoints: `app/routers/`

#### Authentication Routes (`app/routers/auth.py`)

| Endpoint | What It Does |
|----------|-------------|
| `POST /auth/signup` | Creates new user account |
| `POST /auth/token` | Login - returns JWT token |
| `GET /auth/check-email/{email}` | Checks if email is already registered |
| `GET /auth/security-question/{email}` | Gets security question for password reset |
| `POST /auth/reset-password` | Resets password using security answer |

#### Mind Map Routes (`app/routers/maps.py`)

| Endpoint | What It Does |
|----------|-------------|
| `GET /api/maps/` | Gets all mind maps for logged-in user |
| `POST /api/maps/` | Creates new mind map |
| `GET /api/maps/{id}` | Gets specific mind map |
| `PUT /api/maps/{id}` | Updates mind map data |
| `DELETE /api/maps/{id}` | Deletes mind map |
| `POST /api/maps/{id}/copy` | Duplicates a mind map |

#### Page Routes (`app/routers/pages.py`)

| Endpoint | What It Does |
|----------|-------------|
| `GET /` | Serves login page |
| `GET /signup` | Serves signup page |
| `GET /dashboard` | Serves dashboard (list of mind maps) |
| `GET /editor/{id}` | Serves mind map editor |

### 4. Frontend JavaScript

#### `static/js/api.js` - API Client

Handles all communication with the backend:

```javascript
const API = {
    // Generic request method
    async request(endpoint, options = {}) {
        // Get JWT token from browser storage
        const token = localStorage.getItem('token');

        // Add Authorization header
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Make request
        const response = await fetch(endpoint, options);

        // If 401 (unauthorized), redirect to login
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/';
        }

        return response.json();
    },

    // Specific methods for mind maps
    getMap(id) { /* ... */ },
    updateMap(id, data) { /* ... */ }
}
```

#### `static/js/mindmap.js` - Visualization Engine

Creates interactive mind map using D3.js:

**Key functions:**
- `initializeMindMap(data)`: Draws the initial tree
- `addChildNode(parentNode)`: Adds a child to a node
- `editNodeModal(node)`: Opens edit dialog
- `deleteNode(node)`: Removes a node
- `toggleCollapse(node)`: Expands/collapses children
- `saveMap()`: Sends updated data to backend
- `undo()` / `redo()`: History management

**Data structure stored in database:**
```json
{
  "name": "Root Node",
  "description": "Optional description",
  "children": [
    {
      "name": "Child 1",
      "children": []
    },
    {
      "name": "Child 2",
      "children": [
        {
          "name": "Grandchild",
          "children": []
        }
      ]
    }
  ]
}
```

### 5. Templates: `app/templates/`

Server-side HTML generation using Jinja2:

#### `base.html` - Master Template
```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    {% block content %}
    <!-- Child templates fill this area -->
    {% endblock %}
</body>
</html>
```

#### Other templates extend base:
```html
{% extends "base.html" %}

{% block content %}
    <!-- Page-specific content -->
{% endblock %}
```

---

## Key Features Explained

### 1. Authentication System

**How it works:**

```
┌─────────────────────────────────────────────────────────┐
│ 1. User signs up                                        │
│    - Email, password, security question                 │
│    - Password is hashed (SHA256 + bcrypt)               │
│    - Security answer is hashed                          │
│    - Stored in users table                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. User logs in                                         │
│    - POST /auth/token with email + password             │
│    - Backend verifies password hash                     │
│    - Generates JWT token (valid for 30 minutes)         │
│    - Token contains: {sub: "user@email.com", exp: ...}  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Frontend stores token                                │
│    - localStorage.setItem('token', jwt_token)           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Every API request includes token                     │
│    - Authorization: Bearer {token}                      │
│    - Backend validates token                            │
│    - Extracts user email from token                     │
│    - Loads user from database                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Token expires or user logs out                       │
│    - Frontend removes token                             │
│    - Redirects to login page                            │
└─────────────────────────────────────────────────────────┘
```

**Security features:**
- Passwords are never stored in plain text
- SHA256 pre-hashing handles long passwords (bcrypt has 72-byte limit)
- JWT tokens expire after 30 minutes
- Rate limiting prevents brute force attacks (5 login attempts/minute)
- Security question-based password reset (no email service needed)

### 2. Mind Map Editor

**Components:**

```
┌──────────────────────────────────────────────────────────┐
│  Toolbar                                                 │
│  [Save] [Undo] [Redo] [Center Map] [Expand/Collapse]     │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│  SVG Canvas (D3.js visualization)                        │
│                                                          │
│       ┌──────────────┐                                   │
│       │  Root Node   │                                   │
│       └──────┬───────┘                                   │
│              │                                           │
│       ┌──────┴──────┐                                    │
│       │             │                                    │
│  ┌────▼───┐   ┌────▼───┐                                 │
│  │ Child 1│   │ Child 2│                                 │
│  └────────┘   └────┬───┘                                 │
│                    │                                     │
│               ┌────▼────┐                                │
│               │Grandchild│                               │
│               └─────────┘                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**How nodes work:**
- **Add child**: Click green `+` button on node
- **Edit**: Double-click node → modal opens → edit title/description → save
- **Delete**: Click delete icon → confirmation → removes node and children
- **Collapse**: Click blue expand/collapse icon → hides/shows children
- **Auto-save**: Every change triggers `saveMap()` → PUT /api/maps/{id}

**Visual feedback:**
- Hover: Node highlights
- Collapsed nodes: Show stacked rectangle effect
- Active node: Border highlight
- Save status: "Saving..." → "Saved" indicator

### 3. Dashboard

**Layout:**
```
┌────────────────────────────────────────────────────────┐
│  Hero Banner                                           │
│  "Organize your thoughts visually"                     │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  Mind Map Grid                                         │
│                                                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   [+]   │  │ Project │  │  Study  │  │ Travel  │    │
│  │ Create  │  │  Ideas  │  │  Notes  │  │  Plans  │    │
│  │   New   │  └─────────┘  └─────────┘  └─────────┘    │
│  └─────────┘     [Edit] [Copy] [Delete]                │
└────────────────────────────────────────────────────────┘
```

**Operations:**
- **Create**: Click `+` card → modal → enter title → creates new map
- **Edit title**: Click "Edit" → modal → rename → updates database
- **Copy**: Click "Copy" → creates duplicate with "(Copy)" suffix
- **Delete**: Click "Delete" → confirmation → removes from database
- **Open**: Click card → opens editor

---

## Security & Authentication

### Password Security

**Hashing process:**
```python
# app/auth.py

def hash_password(password: str) -> str:
    # Step 1: SHA256 pre-hash (handles long passwords)
    hashed_input = hashlib.sha256(password.encode()).hexdigest()

    # Step 2: bcrypt hash (slow hash, resistant to brute force)
    return pwd_context.hash(hashed_input)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    hashed_input = hashlib.sha256(plain_password.encode()).hexdigest()
    return pwd_context.verify(hashed_input, hashed_password)
```

### JWT Token Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGVtYWlsLmNvbSIsImV4cCI6MTY3MDAwMDAwMH0.signature

┌────────────────┬─────────────────────────┬────────────┐
│   Header       │        Payload          │ Signature  │
│   (metadata)   │   (user data + expiry)  │ (verify)   │
└────────────────┴─────────────────────────┴────────────┘

Decoded payload:
{
  "sub": "user@email.com",  // User identifier
  "exp": 1670000000          // Expiration timestamp
}
```

### Rate Limiting

Prevents abuse by limiting requests:

```python
# app/main.py

# Default: 100 requests per minute
limiter = Limiter(key_func=get_remote_address)

# Specific endpoints:
@router.post("/auth/signup")
@limiter.limit("3/minute")  # Only 3 signups per minute
async def signup(...): ...

@router.post("/auth/token")
@limiter.limit("5/minute")  # Only 5 login attempts per minute
async def login(...): ...
```

---

## Common Development Tasks

### 1. Adding a New API Endpoint

**Example: Add a "share mind map" feature**

**Step 1:** Create database model change (if needed)
```python
# app/models.py
class MindMap(Base):
    # Add new column
    is_public = Column(Boolean, default=False)
```

**Step 2:** Add schema validation
```python
# app/schemas.py
class MindMapUpdate(BaseModel):
    is_public: Optional[bool] = None
```

**Step 3:** Create endpoint
```python
# app/routers/maps.py
@router.put("/api/maps/{map_id}/share")
async def share_mindmap(
    map_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mindmap = db.query(MindMap).filter(
        MindMap.id == map_id,
        MindMap.user_id == current_user.id
    ).first()

    if not mindmap:
        raise HTTPException(status_code=404)

    mindmap.is_public = True
    db.commit()

    return {"message": "Mind map is now public"}
```

**Step 4:** Add frontend function
```javascript
// static/js/api.js
async shareMap(mapId) {
    return await this.request(`/api/maps/${mapId}/share`, {
        method: 'PUT'
    });
}
```

**Step 5:** Add UI button
```html
<!-- templates/dashboard.html -->
<button onclick="shareMap(${map.id})">Share</button>
```

### 2. Modifying the Mind Map Visualization

**Example: Change node colors**

```javascript
// static/js/mindmap.js

// Find the node drawing section:
nodes.append("rect")
    .attr("fill", d => {
        // Custom color logic
        if (d.depth === 0) return "#4F46E5";  // Root: purple
        if (d.depth === 1) return "#10B981";  // Level 1: green
        return "#F59E0B";  // Others: orange
    });
```

### 3. Adding Database Queries

**Example: Get most recently updated mind map**

```python
# app/routers/maps.py
@router.get("/api/maps/recent")
async def get_recent_map(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recent_map = db.query(MindMap).filter(
        MindMap.user_id == current_user.id
    ).order_by(
        MindMap.updated_at.desc()
    ).first()

    return recent_map
```

### 4. Changing Configuration

```bash
# .env file

# Change token expiration from 30 to 60 minutes
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Change database from SQLite to PostgreSQL
DATABASE_URL=postgresql://user:password@localhost/mindmap

# Enable debug mode
DEBUG=true

# Change rate limits
RATE_LIMIT_PER_MINUTE=120
```

### 5. Running Database Commands

```bash
# View all users
python db/db_manager.py view-users

# View all mind maps
python db/db_manager.py view-maps

# Export data to JSON
python db/db_manager.py export-data output.json

# Export to CSV
python db/db_manager.py export-data output.csv --format csv

# Delete all data (with confirmation)
python db/db_manager.py delete-users --confirm
```

---

## Troubleshooting Guide

### Common Issues

#### 1. "Token has expired" error

**Problem:** JWT token lifetime is 30 minutes
**Solution:** Log in again, or increase `ACCESS_TOKEN_EXPIRE_MINUTES` in .env

#### 2. Database locked error (SQLite)

**Problem:** SQLite doesn't handle concurrent writes well
**Solution:**
- Use PostgreSQL for production
- Or configure SQLite with WAL mode in `app/database.py`

#### 3. CORS errors in browser console

**Problem:** Frontend trying to access API from different origin
**Solution:** Add origin to `CORS_ORIGINS` in .env:
```bash
CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
```

#### 4. Mind map not saving

**Checklist:**
1. Check browser console for errors
2. Verify JWT token exists: `localStorage.getItem('token')`
3. Check network tab for failed API calls
4. Verify user owns the mind map (user_id matches)

#### 5. Unable to log in

**Checklist:**
1. Verify email exists in database: `python db/db_manager.py view-users`
2. Check password was hashed correctly
3. Look for rate limiting (wait 1 minute if hit 5 login attempts)
4. Check backend logs for errors

---

## Development Workflow

### Starting the Application

```bash
# 1. Activate virtual environment
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set SECRET_KEY

# 4. Run the application
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Open browser
# http://localhost:8000
```

### Testing Changes

```bash
# Run tests (if available)
pytest

# Check code style
black app/
flake8 app/

# View database
python db/db_manager.py view-all
```

### Deployment

```bash
# Deploy to Render.com (automatic via GitHub push)
git push origin main

# Or deploy manually
# 1. Set environment variables in Render dashboard
# 2. Connect PostgreSQL database
# 3. Render will run build command from render.yaml
```

---

## Architecture Decision Records

### Why FastAPI?
- **Auto-generated API docs** at /docs
- **Type hints** for better IDE support
- **Fast performance** (ASGI server)
- **Modern Python** (async/await support)

### Why SQLite for development?
- **Zero configuration** - no database server needed
- **Portable** - single file database
- **Easy debugging** - can inspect with DB Browser

### Why PostgreSQL for production?
- **Concurrent writes** - handles multiple users
- **Reliability** - ACID compliant
- **Scalability** - better performance at scale

### Why D3.js for visualization?
- **Industry standard** for hierarchical data
- **Flexible** - complete control over visualization
- **Interactive** - built-in zoom, pan, click handling
- **Performant** - can handle large trees

### Why no frontend framework?
- **Simplicity** - easier to understand for beginners
- **Less complexity** - no build step, no transpiling
- **Fast** - no framework overhead
- **Server-side rendering** - better SEO, faster initial load

### Why JWT instead of sessions?
- **Stateless** - no server-side session storage needed
- **Scalable** - works across multiple servers
- **Mobile-friendly** - easy to use in mobile apps
- **Standard** - widely supported

---

## Next Steps for Learning

1. **Start with the flow**: Follow a complete request from browser to database and back
   - Open `app/main.py` and find route registration
   - Pick an endpoint (e.g., `GET /api/maps/`)
   - Follow the code path through router → auth → database → response

2. **Modify something small**: Make a simple change to understand the system
   - Change a CSS color in `static/css/style.css`
   - Add a console.log in `static/js/mindmap.js`
   - Add a field to the User model

3. **Read the key files in order**:
   - `app/main.py` - Application structure
   - `app/models.py` - Database structure
   - `app/routers/auth.py` - Authentication flow
   - `app/routers/maps.py` - Mind map operations
   - `static/js/mindmap.js` - Visualization logic

4. **Use the database manager**:
   ```bash
   python db/db_manager.py view-all
   ```
   - See actual data in the database
   - Understand the relationships

5. **Explore with browser DevTools**:
   - Network tab: See API requests and responses
   - Application tab: View localStorage (JWT token)
   - Console: Test `API.getMap(1)` calls
   - Elements: Inspect generated HTML

---

## Summary

This application follows a **three-tier architecture**:

1. **Presentation Layer** (Frontend)
   - HTML templates, CSS, JavaScript
   - D3.js visualization
   - User interactions

2. **Application Layer** (Backend)
   - FastAPI REST API
   - Business logic
   - Authentication & authorization
   - Data validation

3. **Data Layer** (Database)
   - SQLAlchemy ORM
   - PostgreSQL/SQLite
   - User and MindMap tables

**Key principles:**
- **Separation of concerns**: Each layer has a clear responsibility
- **RESTful API**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **Security first**: JWT tokens, password hashing, rate limiting
- **Data validation**: Pydantic schemas ensure data integrity
- **User ownership**: All mind maps are scoped to the user (user_id foreign key)

You now have a complete map of how the codebase works! 🎉
