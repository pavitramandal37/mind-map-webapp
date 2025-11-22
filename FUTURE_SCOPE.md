# Future Scope & Feature Roadmap

This document outlines the planned features and enhancements for the Mind Map Web Application. The focus is on improving collaboration, accessibility, and leveraging AI to assist users in generating ideas.

## 1. Shareable Mind Maps (View-Only)

### Goal
Enable users to share their mind maps with anyone via a public URL, allowing others to view the interactive mind map without needing to log in or have edit access. This is particularly useful for presentations or sharing ideas with a broader audience.

### Features
- **Public Link Generation:** Users can generate a unique, secure URL (e.g., `.../share/uuid-1234`) for any of their mind maps.
- **View-Only Mode:** The shared link opens the mind map in a "Read-Only" state.
    - Users can zoom, pan, and expand/collapse nodes.
    - Editing tools (add, edit, delete, undo/redo) are hidden or disabled.
- **Presentation Ready:** Optimized for full-screen viewing, making it ideal for embedding in presentations or direct sharing during meetings.
- **Access Control:** (Optional Future Enhancement) Ability to set password protection or expiration dates for shared links.

### Technical Implementation Plan
- **Database:** Add a `share_token` (UUID) column to the `MindMap` table.
- **Backend:** Create a new endpoint `GET /share/{share_token}` that retrieves map data without requiring user authentication.
- **Frontend:** Create a `viewer.html` template or adapt `editor.html` to check for a "read-only" flag, hiding the toolbar and disabling modification interactions.

## 2. AI-Powered Mind Map Generation

### Goal
Integrate Artificial Intelligence to help users overcome "blank page syndrome" and rapidly structure complex topics. Users can generate a full mind map simply by providing a topic or a source file.

### Features
- **Topic-to-Map:**
    - User enters a topic title (e.g., "Project Management Fundamentals").
    - AI generates a comprehensive mind map structure with main branches (e.g., "Planning", "Execution", "Monitoring") and sub-nodes.
- **File-to-Map:**
    - User uploads a document (PDF, DOCX, TXT) or pastes a large block of text.
    - AI analyzes the content and extracts key concepts to build a structured mind map representation of the document.
- **Interactive Refinement:** Users can choose to "Expand with AI" on any specific node to generate more sub-ideas for that branch.

### Technical Implementation Plan
- **AI Integration:** Integrate with an LLM API (e.g., OpenAI GPT-4, Google Gemini).
- **Backend:**
    - Create endpoints for `POST /api/ai/generate-from-topic` and `POST /api/ai/generate-from-file`.
    - Implement prompt engineering to output JSON data compatible with the D3.js tree structure.
- **Frontend:** Add an "AI Assistant" model in the dashboard and editor to accept user prompts or file uploads.

## 3. Additional Planned Enhancements
- **Real-time Collaboration:** Allow multiple users to edit the same map simultaneously using WebSockets.
- **Export Options:** Export maps as high-quality Images (PNG/SVG) or PDF documents for offline use.
- **Advanced Theming:** Fully implement "Glassmorphism" and "Productivity" themes with user-selectable preferences.
