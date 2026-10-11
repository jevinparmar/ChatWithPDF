# Chatwithpdf — RAG Document Q&A Frontend

A production-ready React frontend for **Chatwithpdf**, an intelligent RAG document Q&A assistant where users upload documents (PDF, DOCX, TXT) and chat with them to get answers with verifiable source citations and split-view PDF previews.

---

## ⚡ Tech Stack

- **Framework**: React 18 / 19 + Vite (JavaScript)
- **Styling**: Tailwind CSS (class-based dark mode, custom scrollbars, Inter font)
- **Routing**: React Router v6
- **State Management**: Zustand (`authStore`, `chatStore`, `themeStore`)
- **HTTP Client**: Axios with JWT interceptor & auto 401 logout
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Markdown Rendering**: React Markdown
- **Data Visualizations**: Recharts
- **Document Viewing**: PDF Split-View Panel with highlighted citation snippets

---

## 🎨 Design System

- **Minimal SaaS Aesthetic**: Inspired by Linear and Notion with clean borders and subtle shadows
- **Color Palette**:
  - Primary Accent: Indigo (`#4F46E5`)
  - Success: Teal (`#14B8A6`)
  - Warning: Amber (`#F59E0B`)
  - Error: Red (`#EF4444`)
- **Themes**:
  - **Light Mode**: White and `#F7F7F8` background
  - **Dark Mode**: `#0F1115` background and `#181B21` card surfaces
  - Persisted to `localStorage` with `themeStore`
- **Responsive Layout**: Seamless across Desktop, Tablet, and Mobile with slide-in drawers and split panels

---

## 📂 Folder Structure

```
chatwithpdf/
├── src/
│   ├── api/
│   │   ├── client.js          # Axios instance with auth header & 401 interceptor
│   │   ├── index.js           # Facade switching between mock and real API
│   │   └── mock.js            # In-memory mock database & SSE streaming simulation
│   ├── components/
│   │   ├── admin/             # StatCard, UsageChart, FeedbackChart
│   │   ├── chat/              # ChatWindow, MessageBubble, AIMessage, SourceChip, ChatInput, etc.
│   │   ├── documents/         # FileUploader, DocumentTable, DocumentSelector, PdfViewer, etc.
│   │   ├── layout/            # Navbar, Sidebar, AppLayout, MobileDrawer
│   │   └── ui/                # Button, Input, Modal, Skeleton, EmptyState, Toggle, Slider, Tabs, Badge, Dropdown
│   ├── hooks/                 # useAuth, useChat, useDocuments, useTheme
│   ├── pages/                 # Landing, Login, Signup, Dashboard, Chat, DocumentDetail, Settings, Admin, NotFound
│   ├── store/                 # authStore, chatStore, themeStore
│   ├── utils/                 # formatDate, formatFileSize, groupChatsByDate
│   ├── App.jsx                # Router & Route guards (Protected, Admin, Guest)
│   ├── main.jsx               # React entry point
│   └── index.css              # Tailwind base & custom animations
├── .env                       # Active environment variables
├── .env.example               # Environment template
└── vite.config.js             # Vite configuration
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create or edit `.env`:
```env
VITE_API_URL=http://localhost:8000
VITE_USE_MOCK=true
```

### 3. Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🔄 Switching Between Mock Mode and Real Backend

The frontend is fully decoupled from the backend and works immediately without any backend running.

### Using Mock API (Default)
In `.env`:
```env
VITE_USE_MOCK=true
```
- Realistic fake data in memory
- Artificial delays (400–1200ms)
- Simulated SSE token-by-token streaming
- Interactive document uploads (auto-transitions from `processing` to `ready` in ~3s)
- Clickable citation chips with cited snippets and page navigation

### Using Real FastAPI Backend
In `.env`:
```env
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:8000
```
Restart Vite (`npm run dev`). All requests will immediately route to your FastAPI endpoints matching:
- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/documents/upload` (multipart)
- `GET /api/documents`, `GET /api/documents/{id}`, `DELETE /api/documents/{id}`
- `GET /api/chat/sessions`, `POST /api/chat/sessions`, `DELETE /api/chat/sessions/{id}`, `PATCH /api/chat/sessions/{id}`
- `GET /api/chat/sessions/{id}/messages`
- `POST /api/chat` and `POST /api/chat/stream` (SSE)
- `POST /api/chat/feedback`
- `GET /api/admin/stats`

---

## 🔑 Demo Accounts

When testing in Mock mode, use these pre-configured accounts (or click the quick demo buttons on the login screen):

| Role | Email | Password | Access |
|---|---|---|---|
| **Regular User** | `user@test.com` | `password123` | Dashboard, Chat, Documents, Settings |
| **Administrator** | `admin@test.com` | `password123` | All user features + Admin Insights (`/admin`) |

---

## 🌟 Key Features

1. **Interactive RAG Grounding**: Ask questions across selected documents. Every statement is verified with source chips.
2. **Split-View PDF Inspector**: Click any citation chip (e.g. `refund_policy_2025.pdf · Page 4`) to open a 55% split-view panel displaying the exact cited page and highlighted excerpt.
3. **Simulated Word-by-Word Streaming**: Smooth token streaming with animated blinking cursor and cancel/stop button.
4. **Admin Insights & Governance**: Track query volume charts, feedback satisfaction donuts, active users, and audit downvoted responses.
5. **Modern Linear/Notion Aesthetics**: Refined typography, sleek dark mode toggle, and micro-animations.

---

# ChatWithPDF — Production FastAPI Backend

The backend is built with Python 3.11+, FastAPI, PostgreSQL 16 + pgvector, SQLAlchemy 2.0 (async), sentence-transformers (`all-MiniLM-L6-v2`), and LangChain text splitters.

## 🛠️ Backend Setup & Run Guide

### Option 1: Docker Compose (Full Stack: Database + Backend)

Start both PostgreSQL with pgvector and the FastAPI backend service:
```bash
docker-compose up --build
```
The backend automatically applies Alembic migrations, runs the demo user seed script, and starts Uvicorn on `http://localhost:8000`.

### Option 2: Local Development (Database in Docker, Backend Local)

1. **Start PostgreSQL with pgvector in Docker**:
   ```bash
   docker-compose up -d db
   ```

2. **Set up Python Virtual Environment**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
   pip install -r requirements.txt
   ```

3. **Apply Database Migrations**:
   ```bash
   alembic upgrade head
   ```

4. **Seed Demo Users**:
   ```bash
   python scripts/seed.py
   ```

5. **Start FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Interactive OpenAPI Docs**:
   - Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
   - ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## ⚙️ Environment Variables

The backend configuration is managed by `pydantic-settings` via `backend/.env`.

| Variable | Default Value | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Database host (e.g., `127.0.0.2` or `localhost`) |
| `DB_PORT` | `5432` | Database port number |
| `DB_NAME` | `chatwithpdf` | PostgreSQL database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | `postgres` | Database password |
| `DATABASE_URL` | *(Auto-assembled)* | Optional override URL; automatically constructed if omitted |
| `SECRET_KEY` | `change_me` | Secret key used for signing JWT access tokens |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | JWT access token expiration duration |
| `ANTHROPIC_API_KEY` | `your_key_here` | Anthropic Claude API key (with graceful fallback for offline dev/tests) |
| `LLM_MODEL` | `claude-3-5-sonnet-20241022` | Anthropic Claude model identifier |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | SentenceTransformers model for 384-dimensional vector embeddings |
| `CHUNK_SIZE` | `800` | Target chunk size in characters for text splitting |
| `CHUNK_OVERLAP` | `100` | Overlap in characters between adjacent chunks |
| `TOP_K` | `4` | Number of most similar chunks to retrieve per question |
| `SIMILARITY_THRESHOLD` | `0.25` | Minimum cosine similarity threshold (0.0 to 1.0) |
| `MAX_UPLOAD_MB` | `20` | Maximum allowed upload file size |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed frontend origins for CORS |

---

## 📡 API Endpoint Reference

All API routes are prefixed with `/api`. Responses are serialized in JSON with camelCase fields compatible with the React frontend.

### Authentication (`/api/auth`)
| Method | Endpoint | Request Body | Response | Description | Rate Limit |
|---|---|---|---|---|---|
| `POST` | `/api/auth/signup` | `{name, email, password}` | `{token, user}` | Register new account | — |
| `POST` | `/api/auth/login` | `{email, password}` | `{token, user}` | Authenticate and get JWT token | 5 / min |
| `GET` | `/api/auth/me` | None (Bearer Token) | `UserResponse` | Get current user profile | — |

### Documents (`/api/documents`)
| Method | Endpoint | Request Body | Response | Description | Auth Required |
|---|---|---|---|---|---|
| `POST` | `/api/documents/upload` | Multipart: `file` / `files` | `DocumentResponse` | Upload PDF/DOCX/TXT (max 20MB), initiates background indexing | Yes |
| `GET` | `/api/documents` | None | `List[DocumentResponse]` | List user documents (newest first) | Yes |
| `GET` | `/api/documents/{id}` | None | `DocumentResponse` | Document details with summary & questions | Yes |
| `GET` | `/api/documents/{id}/file` | None | Raw file stream | Download/serve original document file | Yes (Owner) |
| `DELETE` | `/api/documents/{id}` | None | `{success, message}` | Delete document, disk file, and cascaded chunks | Yes (Owner) |

### Chat & Q&A (`/api/chat`)
| Method | Endpoint | Request Body | Response | Description | Rate Limit |
|---|---|---|---|---|---|
| `GET` | `/api/chat/sessions` | None | `List[ChatSessionResponse]` | List conversation sessions | — |
| `POST` | `/api/chat/sessions` | `{title?, documentIds[]}` | `ChatSessionResponse` | Create new conversation session | — |
| `PATCH` | `/api/chat/sessions/{id}` | `{title}` | `ChatSessionResponse` | Rename conversation session | — |
| `DELETE` | `/api/chat/sessions/{id}` | None | `{success: true}` | Delete conversation session | — |
| `GET` | `/api/chat/sessions/{id}/messages` | None | `List[ChatMessageResponse]` | List messages in session | — |
| `POST` | `/api/chat` | `{sessionId, question, documentIds[]}` | `{messageId, answer, sources[]}` | Non-streaming RAG question answering | 20 / min |
| `POST` | `/api/chat/stream` | `{sessionId, question, documentIds[]}` | `text/event-stream` (SSE) | Token-by-token streaming RAG answer with citations | 20 / min |
| `POST` | `/api/chat/feedback` | `{messageId, rating, comment?}` | `{success: true}` | Submit thumbs up/down user feedback | — |

### Admin Insights (`/api/admin`)
| Method | Endpoint | Headers | Response | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/stats` | Bearer Token (Role: admin) | `AdminStatsResponse` | Usage stats, 14-day chart, feedback breakdown, downvoted answers |

### System Health
| Method | Endpoint | Response | Description |
|---|---|---|---|
| `GET` | `/health` | `{"status": "ok"}` | System health status |

---

## 🧪 Testing & Evaluation

### Run Pytest Test Suite
```bash
cd backend
pytest tests/ -v
```
All 5 test suites pass:
1. `test_auth.py`: Signup, duplicate rejection, login, bad credential handling, `/auth/me` profile
2. `test_chunking.py`: LangChain recursive splitting, page number preservation, index ordering
3. `test_documents.py`: File extension validation, upload handling, multi-tenant user isolation, cascade deletion
4. `test_retriever.py`: pgvector cosine similarity search (`<=>`), SQL user scoping
5. `test_chat.py`: Sessions, non-streaming chat, SSE streaming (`/chat/stream`), feedback submission, admin role checks

### Run End-to-End Verification Flow
```bash
python scripts/verify_flow.py
```
Executes complete automated workflow: signup, login, upload sample 2-page PDF, wait for background indexing, create chat session, ask question normally, test SSE stream, submit feedback, inspect admin analytics, and verify cascaded deletion.

### Run RAG Benchmark Evaluation
```bash
python evaluation/evaluate_rag.py
```
Evaluates retrieval hit rate and answer similarity against `evaluation/test_questions.json`.

---

## 📋 Summary of What Works and Known Considerations

### What Works
- **Dual App & Vector Database**: Single PostgreSQL 16 database storing both relational application data and 384-dimensional pgvector embeddings with HNSW indexing (`vector_cosine_ops`).
- **Alembic Migrations**: First migration automatically executes `CREATE EXTENSION IF NOT EXISTS vector` and builds all relational tables with indices.
- **Robust Parsing & Chunking**: PyMuPDF for PDFs, python-docx for DOCX, plain read for TXT. Chunks generated via LangChain RecursiveCharacterTextSplitter while maintaining page number metadata.
- **Background Indexing**: Asynchronous task updates document status to `ready` or `failed` with error capture, generates executive summary and 4 research questions via LLM.
- **Cosine Vector Search**: SQL-level cosine distance using pgvector's `<=>` operator strictly filtered by `user_id` and document IDs.
- **Strict User Isolation**: Users cannot read, download, search, or delete another user's documents, chunks, sessions, or messages.
- **Multi-Turn Follow-Ups**: Last 6 messages used to rewrite queries into standalone questions before retrieval.
- **Server-Sent Events (SSE)**: Streaming endpoint (`/chat/stream`) yielding `sources`, `token`, and `done` events, with clean client disconnect handling.
- **Admin Control Plane**: Metrics, 14-day volume graphs, satisfaction breakdown, and downvoted responses audit list.
- **Rate Limiting**: SlowAPI limits `/auth/login` (5/min) and `/chat` (20/min).

### Considerations & Notes
- If running Anthropic Claude in production, set a valid `ANTHROPIC_API_KEY` in `backend/.env`. When no key or mock key is provided, the client seamlessly falls back to local context-grounded extraction so development and test suites run offline without errors.
- On Linux environments with system PostgreSQL services bound to port 5432 on 127.0.0.1, Docker Compose binds the container to `127.0.0.2:5432` to avoid host port collisions while preserving default port 5432.
