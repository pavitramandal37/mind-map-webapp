# Mind Map Web Application - Project Documentation

## 1. Project Overview
The Mind Map Web Application is a modern, interactive tool designed to help users visualize their thoughts and ideas. It features a clean, minimalist interface, secure user authentication, and a powerful mind map editor built with D3.js. Users can create, manage, and share mind maps with ease.

## 2. Architecture & Technology Stack

### 2.1 Backend
- **Framework:** [FastAPI](https://fastapi.tiangolo.com/) - A modern, fast (high-performance) web framework for building APIs with Python 3.11+.
- **Database ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) - The Python SQL toolkit and Object Relational Mapper.
- **Data Validation:** [Pydantic](https://docs.pydantic.dev/) - Data validation and settings management using Python type hints.
- **Authentication:** 
    - `python-jose`: For JSON Web Token (JWT) encoding and decoding.
    - `passlib[bcrypt]`: For secure password hashing.
- **Server:** `uvicorn`: An ASGI web server implementation for Python.

### 2.2 Frontend
- **Templating Engine:** [Jinja2](https://jinja.palletsprojects.com/) - Used for rendering HTML pages on the server.
- **Visualization:** [D3.js](https://d3js.org/) - A JavaScript library for manipulating documents based on data, used for rendering the interactive mind maps.
- **Styling:** Custom CSS with a focus on modern design principles (Glassmorphism, Minimalist).
- **Font:** [Inter](https://fonts.google.com/specimen/Inter) - A clean, modern sans-serif font.

### 2.3 Directory Structure
```
mind-map-webapp/
├── app/
│   ├── routers/            # API Route definitions
│   │   ├── auth.py         # Authentication endpoints (Login, Signup, Reset)
│   │   ├── maps.py         # Mind Map CRUD operations
│   │   └── pages.py        # Frontend page routes
│   ├── static/             # Static assets
│   │   ├── css/            # Stylesheets
│   │   ├── js/             # Client-side JavaScript (mindmap.js, api.js)
│   │   └── icons/          # UI Icons
│   ├── templates/          # Jinja2 HTML templates
│   │   ├── base.html       # Base layout
│   │   ├── dashboard.html  # User dashboard
│   │   ├── editor.html     # Mind map editor interface
│   │   ├── login.html      # Login page
│   │   └── signup.html     # Signup page
│   ├── core/               # Core application modules
│   │   └── config.py       # Settings and configuration
│   ├── database.py         # Database connection and session handling
│   ├── main.py             # Application entry point
│   ├── models.py           # SQLAlchemy database models
│   ├── schemas.py          # Pydantic validation schemas
│   └── auth.py             # Authentication utilities
├── mindmap.db              # SQLite database file
├── requirements.txt        # Python dependencies
├── render.yaml             # Render.com deployment configuration
├── DESIGN.md               # Mind map design specifications
├── PROJECT_DOCUMENTATION.md # This file
├── DEPLOYMENT.md           # Deployment guide
├── CHANGES.md              # Changelog
└── FUTURE_SCOPE.md         # Feature roadmap
```

## 3. Features & Implementation Details

### 3.1 Authentication System
- **User Accounts:** Users can sign up with an email, password, and security question/answer.
- **Security:** Passwords are hashed using Bcrypt. JWT tokens are used for session management.
- **Password Recovery:** A "Forgot Password" flow allows users to reset their password by answering their security question.
- **Duplicate Check:** The system prevents duplicate registrations by checking if an email already exists.

### 3.2 Dashboard
- **Map Management:** Users can view a list of their mind maps.
- **Actions:**
    - **Create:** Start a new mind map from scratch.
    - **Delete:** Remove unwanted mind maps.
    - **Copy:** Duplicate an existing mind map to create a variation.

### 3.3 Mind Map Editor
- **Interactive Visualization:** Built with D3.js, supporting zooming, panning, and collapsible nodes.
- **Advanced Node Design:**
    - **Stacked Visual Effect:** Collapsed parent nodes display a stacked appearance to indicate hidden children.
    - **Dynamic Sizing:** Node width adjusts based on content with automatic text wrapping.
    - **Consistent Layout:** Nodes in the same column/layer maintain uniform width.
    - **Rich Content Display:** Shows both title (multi-line if needed) and description (one-line preview with truncation).
- **Node Operations:**
    - **Add Child:** Create sub-nodes to expand ideas.
    - **Edit:** Double-click to modify node text and description.
    - **Delete:** Remove nodes (and their children).
    - **Expand/Collapse:** Toggle visibility of child nodes to manage complexity.
- **State Management:**
    - **Undo/Redo:** Full history stack allowing users to revert changes (up to 20 steps).
    - **Auto-Save:** Changes are saved to the backend automatically.

### 3.4 Theming
- The application supports a theming system.
- **Current Default:** "Minimalist" theme is active by default, providing a clean, distraction-free workspace.
- **Architecture:** CSS variables and JS helpers (`applyTheme`) are in place to support future themes (e.g., Glassmorphism, Productivity).

## 4. API Documentation

### Auth Endpoints (`/auth`)
- `POST /signup`: Register a new user.
- `POST /token`: Login and retrieve an access token.
- `GET /check-email/{email}`: Check if an email is already registered.
- `GET /security-question/{email}`: Retrieve the security question for a user.
- `POST /reset-password`: Reset password using security answer.

### Map Endpoints (`/api/maps`)
- `GET /`: List all maps for the current user.
- `POST /`: Create a new map.
- `GET /{map_id}`: Get details of a specific map.
- `PUT /{map_id}`: Update a map's title or data.
- `DELETE /{map_id}`: Delete a map.
- `POST /{map_id}/copy`: Duplicate a map.

## 5. Setup & Installation

### Prerequisites
- Python 3.11 or higher

### Installation Steps
1.  **Clone/Open Project:** Navigate to the project root.
2.  **Create Virtual Environment:**
    ```bash
    python -m venv .venv
    ```
3.  **Activate Environment:**
    - Windows: `.\.venv\Scripts\activate`
    - Mac/Linux: `source .venv/bin/activate`
4.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

### Running the Application
Start the development server:
```bash
uvicorn app.main:app --reload
```
Access the application at `http://127.0.0.1:8000`.

## 6. Future Roadmap
- **Enhanced Theming:** Fully enable the UI for switching between Glassmorphism and Productivity themes.
- **Collaboration:** Real-time collaborative editing.
- **Export:** Export maps to PDF or Image formats.
