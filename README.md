# Mind Map Web Application

A modern, interactive mind mapping web application built with Python (FastAPI) and Vanilla JS.

## Prerequisites

- **Python 3.11+**
- **Git**

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/pavitramandal37/mind-map-webapp.git
    cd mind-map-webapp
    ```

2.  **Create and activate a virtual environment**:
    ```bash
    # Windows
    python -m venv .venv
    .\.venv\Scripts\activate
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

## Configuration (Important)

This application is configured to use a **persistent database** located outside the project folder. This ensures you don't lose your data when re-cloning the repository.

- **Rich Text Editor**: Secure, sanitized rich text descriptions for nodes.
- **Export/Import**: Save and load your mind maps locally.
- **Auto-Save**: Changes are automatically saved as you work.

## Security Features

### Rich Text Sanitization
- **Client-side**: DOMPurify sanitizes HTML before saving
- **Server-side**: Bleach library provides second layer of defense
- **Allowed tags**: `<b>`, `<i>`, `<u>`, `<s>`, `<strong>`, `<em>`, `<br>`
- **Max length**: 5000 characters per description

### XSS Prevention
All user-generated HTML content is sanitized to prevent:
- Script injection
- Event handler attacks
- Malicious iframes
- Style-based attacks

## Tech Stack

1.  **Create your `.env` file**:
    ```bash
    cp .env.example .env
    ```

2.  **Configure `.env`**:
    Open the `.env` file in a text editor and update the `DATABASE_URL` line to point to your persistent data folder.

    **REQUIRED SETTING:**
    ```properties
    # Automatic Database creation:
    # DATABASE_URL=sqlite:///./db/mindmap.db

    ```
    *Note: for lcoal development uses the SQLite database but for production uses the PostgreSQL database*

3.  **Secure your app**:
    Update the `SECRET_KEY` in `.env`. You can generate one with:
    ```bash
    python -c "import secrets; print(secrets.token_urlsafe(32))"
    ```

## Running the Application

1.  **Navigate to the project directory**:
    ```bash
    cd mind-map-webapp
    ```

2.  **Start the development server**:
    ```bash
    uvicorn app.main:app --reload
    ```
    *Note: The application will automatically use the database located in `db/mindmap.db` unless overridden by a `.env` file.*

3.  **Access the App**:
    Open your browser and navigate to: [http://localhost:8000](http://localhost:8000)

## Usage

1.  **Sign Up**: Create a new account. Your data will be saved to the persistent database.
2.  **Create Mind Maps**: Use the intuitive interface to create and manage your ideas.
