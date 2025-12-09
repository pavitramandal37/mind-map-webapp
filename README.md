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

1.  **Create your `.env` file**:
    ```bash
    cp .env.example .env
    ```

2.  **Configure `.env`**:
    Open the `.env` file in a text editor and update the `DATABASE_URL` line to point to your persistent data folder.

    **REQUIRED SETTING:**
    ```properties
    # Persistent Data Path - Example for Windows
    DATABASE_URL=sqlite:///D:/MyAppsData/mindmap.db
    # Or relative to project:
    # DATABASE_URL=sqlite:///./db/mindmap.db
    ```
    *Note: If using an absolute path (like D:/...), ensure the directory exists before running the app.*

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
3.  **Persistence**: You can now delete this project folder or re-clone it anytime. As long as you point your `.env` to the same `DATABASE_URL`, all your data will be there!
