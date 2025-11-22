# How to Run the Project

## Prerequisites
- Python 3.11+ installed

## Setup
1. Open a terminal in the project root.
2. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate the virtual environment:
   - Windows: `.\.venv\Scripts\activate`
   - Mac/Linux: `source .venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Run
Run the application using Uvicorn:
```bash
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000`.
