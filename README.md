# Mind Map Webapp
An interactive mind mapping web application for visualizing and organizing ideas.

## Features
- 🎨 **Interactive Mind Maps** - Create, edit, and organize your thoughts visually
- 📝 **Rich Node Content** - Add titles and descriptions to each node
- 🔄 **Smart Layout** - Automatic text wrapping and consistent column widths
- 📚 **Stacked Design** - Visual indication for collapsed nodes with children
- 💾 **Auto-Save** - Your changes are saved automatically
- 🔐 **Secure Authentication** - JWT-based user authentication
- ↩️ **Undo/Redo** - Full history management for all changes

# How to Run the Project

## Prerequisites
- Python 3.11+ installed

## Setup

### 1. Create Virtual Environment
Open a terminal in the project root and create a virtual environment:
```bash
python -m venv .venv
```

### 2. Activate Virtual Environment
- **Windows:** `.\.venv\Scripts\activate`
- **Mac/Linux:** `source .venv/bin/activate`

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables ⚠️ IMPORTANT
**You must create a `.env` file before running the application.**

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Generate a secure SECRET_KEY:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Edit the `.env` file:**
   - Replace `your-secret-key-here-replace-this` with the generated key
   - Keep other settings as default for local development

   Example `.env` file:
   ```env
   SECRET_KEY=AbC123XyZ_your-actual-generated-key-here
   ENVIRONMENT=development
   DATABASE_URL=sqlite:///./mindmap.db
   ```

⚠️ **Security Note:** Never commit your `.env` file to git! It contains secrets and is already in `.gitignore`.

## Run
Run the application using Uvicorn:
```bash
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000`.

## Documentation

- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** - Complete project architecture and features
- **[DESIGN.md](DESIGN.md)** - Detailed mind map node design and behavior specifications
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide for multiple platforms
- **[FUTURE_SCOPE.md](FUTURE_SCOPE.md)** - Planned features and enhancements
- **[CHANGES.md](CHANGES.md)** - Production-ready improvements changelog
