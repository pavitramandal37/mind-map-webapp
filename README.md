# Mind Map Web Application

An interactive mind mapping tool for visualizing and organizing your ideas with a beautiful, intuitive interface.

## ✨ Features

- 🎨 Interactive mind maps with drag, zoom, and pan
- 📝 Rich nodes with titles and descriptions
- 📚 Stacked design for collapsed parent nodes
- 💾 Auto-save functionality
- 🔐 Secure user authentication
- ↩️ Undo/Redo support

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11 or higher

### Step 1: Clone and Navigate
```bash
cd mind-map-webapp
```

### Step 2: Create Virtual Environment
```bash
python -m venv .venv
```

### Step 3: Activate Virtual Environment
**Windows:**
```bash
.\.venv\Scripts\activate
```

**Mac/Linux:**
```bash
source .venv/bin/activate
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Setup Environment Variables
**Create your `.env` file:**
```bash
cp .env.example .env
```

**Generate a secure secret key:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Edit `.env` and replace the SECRET_KEY:**
- Open `.env` in any text editor
- Replace `your-secret-key-here-replace-this` with the key you just generated
- Save the file

Your `.env` should look like this:
```env
SECRET_KEY=your-generated-key-goes-here
ENVIRONMENT=development
DATABASE_URL=sqlite:///./mindmap.db
```

⚠️ **Important:** Never commit the `.env` file to git!

### Step 6: Run the Application
```bash
uvicorn app.main:app --reload
```

### Step 7: Open in Browser
Navigate to: **http://127.0.0.1:8000**

---

## 📱 Using the Application

1. **Sign Up** - Create your account
2. **Login** - Access your dashboard
3. **Create Mind Map** - Start organizing your ideas
4. **Edit Nodes** - Double-click to edit title and description
5. **Add Children** - Click the + button to expand your ideas
6. **Collapse/Expand** - Click the arrow to manage complexity

---

## 📚 Additional Documentation

- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) - Complete architecture and features
- [DESIGN.md](DESIGN.md) - Mind map design specifications
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deploy to production (Render, Railway, Fly.io)
- [FUTURE_SCOPE.md](FUTURE_SCOPE.md) - Planned features
- [CHANGES.md](CHANGES.md) - Recent improvements

---

## 🔧 Troubleshooting

**App won't start?**
- Make sure you created the `.env` file
- Check that SECRET_KEY is set in `.env`
- Verify Python 3.11+ is installed: `python --version`

**Can't login?**
- Clear your browser cache
- Make sure the database file exists: `mindmap.db`

**Port already in use?**
- Stop other applications using port 8000
- Or use a different port: `uvicorn app.main:app --reload --port 8080`

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

**Built with ❤️ using FastAPI, D3.js, and Python**
