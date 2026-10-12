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
| `POST` | `/api/chat/sessions` | `{title?, documentIds[], mode?}` | `ChatSessionResponse` | Create new conversation session | — |
| `PATCH` | `/api/chat/sessions/{id}` | `{title?, mode?}` | `ChatSessionResponse` | Rename session or update active mode | — |
| `DELETE` | `/api/chat/sessions/{id}` | None | `{success: true}` | Delete conversation session | — |
| `GET` | `/api/chat/sessions/{id}/messages` | None | `List[ChatMessageResponse]` | List messages in session | — |
| `POST` | `/api/chat` | `{sessionId, question, documentIds[]}` | `{messageId, answer, sources[]}` | Non-streaming RAG question answering | 20 / min |
| `POST` | `/api/chat/stream` | `{sessionId, question, documentIds[]}` | `text/event-stream` (SSE) | Token-by-token streaming RAG answer with citations | 20 / min |
| `POST` | `/api/chat/action` | `{sessionId, actionId, documentIds[], options{}}` | `text/event-stream` (SSE) | Execute specialized mode quick action with SSE progress | 20 / min |
| `POST` | `/api/chat/feedback` | `{messageId, rating, comment?}` | `{success: true}` | Submit thumbs up/down user feedback | — |

### Modes Registry (`/api/modes`)
| Method | Endpoint | Response | Description |
|---|---|---|---|
| `GET` | `/api/modes` | `List[ModeConfig]` | Return all 5 active mode configs, quick actions, prompts, and options schemas |
| `PATCH` | `/api/auth/mode` | `{mode: "student"|"researcher"|"business"|"legal"|"career"}` | Set user default onboarding mode |

---

## 🎭 Persona Modes System

ChatWithPDF adapts its personality, toolsets, retrieval engine, and UI widgets to the user's role.

### The 5 Modes

| Mode | Accent | Persona & Answer Style | Key Capabilities |
|---|---|---|---|
| **Student** | Indigo (`#4F46E5`) | Friendly teacher, simple words, step-by-step analogies, technical terms defined first. Hindi / Hinglish / Gujarati support. | Full-file syllabus explainer, flashcard flip deck, interactive quiz player with retry, exam 2/5/10 mark questions, mind map, study library. |
| **Researcher** | Teal (`#0D9488`) | Precise, academic, careful wording of certainty. | Structured paper cards, cross-paper comparison matrices, agreement/gap analysis, literature reviews, BibTeX citation export. |
| **Business** | Slate (`#475569`) | Direct, executive, action-oriented. Quotes verbatim policy sentences (<25 words) with locations. | Executive summaries, policy finder, step-by-step SOP checklists, FAQ generator, action item tracker, onboarding guides. |
| **Legal** | Amber (`#D97706`) | Plain-English, exact. Mandatory legal disclaimer on all outputs. | Contract summary, clause finder, deadline & notice period table, obligation matrix, Red / Amber / Green risk badges, clause rewrites. |
| **Career** | Pink (`#DB2777`) | Tactical recruiter & career coach. Requires Resume + Job Description. | Match score gauge (0-100%), skill breakdown, Before/After achievement rewrites, tailored cover letter, interview Q&A prep. |

### Complete Quick Actions Matrix

| Mode | Action ID | Action Label | Needs | Output Type | Description |
|---|---|---|---|---|---|
| **Student** | `explain_full` | Complete Syllabus Explanation | 1+ files | Markdown | Structured 5-part teacher explanation covering every topic in order |
| **Student** | `short_notes` | Short Revision Notes | 1+ files | Markdown | High-yield revision bullet points + last-minute revision box |
| **Student** | `key_points` | Top Key Points | 1+ files | Markdown | Ranked core concepts and key takeaways |
| **Student** | `flashcards` | Interactive Flashcards | 1+ files | Flashcards | 3D flip card deck with "Got it" vs "Review again" mastery tracking |
| **Student** | `quiz` | Interactive Quiz | 1+ files | Quiz | 1-by-1 question UI with instant feedback, explanations, score, and retry |
| **Student** | `exam_questions` | Exam Questions & Answers | 1+ files | Markdown | 2-mark, 5-mark, and 10-mark questions suited for university exams |
| **Student** | `mind_map` | Hierarchical Mind Map | 1+ files | Mind Map | Collapsible topic outline tree |
| **Student** | `eli10` | Explain Like I'm 10 | 1+ files | Markdown | Simple analogies and real-life examples |
| **Researcher** | `paper_summary` | Structured Paper Card | 1+ files | Markdown | Objective, Method, Dataset, Results, Limitations, Future work |
| **Researcher** | `compare_papers` | Compare Papers Matrix | 2+ files | Comparison | Side-by-side comparison table (Problem, Method, Data, Results) |
| **Researcher** | `find_agreements_and_gaps` | Agreements & Gaps | 2+ files | Markdown | Points of consensus, divergence, and unaddressed questions |
| **Researcher** | `literature_review` | Literature Review Draft | 1+ files | Markdown | Thematic synthesis draft with natural citations |
| **Researcher** | `extract_findings` | Extract Findings Table | 1+ files | Markdown | Claims, supporting empirical evidence, and locations |
| **Business** | `executive_summary` | Executive Summary | 1+ files | Markdown | 1-page high-level brief: key decisions, figures, and risks |
| **Business** | `find_policy` | Policy Verification | 1+ files | Markdown | Strict answer quoting exact sentence (<25 words) and location |
| **Business** | `step_by_step` | SOP Checklist | 1+ files | Markdown | Numbered execution checklist from operational manual |
| **Business** | `faq_generator` | Document FAQs | 1+ files | Markdown | 10-15 anticipated questions & concise answers |
| **Business** | `action_items` | Action Items Matrix | 1+ files | Markdown | Table of tasks, owners, and deliverable deadlines |
| **Business** | `new_employee_guide` | New Employee Guide | 1+ files | Markdown | Onboarding walkthrough written for new hires |
| **Legal** | `contract_summary` | Contract Summary | 1+ files | Markdown | Parties, term, payment, obligations, termination, governing law |
| **Legal** | `clause_finder` | Clause Finder | 1+ files | Markdown | Quotes exact clause and translates into plain English |
| **Legal** | `deadlines_and_dates` | Deadlines & Dates Table | 1+ files | Markdown | Chronological calendar of renewal dates and notice periods |
| **Legal** | `obligations` | Party Obligations Matrix | 1+ files | Markdown | Clear obligations table partitioned by signing party |
| **Legal** | `risk_check` | Risk Check & Badges | 1+ files | Risk Badges | Red / Amber / Green badges flagging hazardous clauses |
| **Legal** | `plain_english` | Plain English Rewrite | 1+ files | Markdown | Translates dense legalese into clear layperson terms |
| **Legal** | `compare_versions` | Compare Versions | 2 files | Markdown | Added, removed, and modified clauses between drafts |
| **Career** | `match_score` | Resume vs JD Match Score | 2 files | Match Score | Radial gauge (0-100%), skill breakdown, and keyword match lists |
| **Career** | `improve_resume` | Achievement Rewrites | 2 files | Career | Side-by-side Before/After action-verb bullet point rewrites |
| **Career** | `tailored_summary` | Tailored Executive Summary | 2 files | Markdown | Targeted 3-line elevator pitch matching JD requirements |
| **Career** | `cover_letter` | Tailored Cover Letter | 2 files | Markdown | Compelling letter strictly grounded in verified resume facts |
| **Career** | `interview_prep` | Interview Q&A Preparation | 2 files | Markdown | Behavioral, technical, and "Tell me about yourself" responses |
| **Career** | `skill_gap` | Skill Gap & Learning Roadmap | 2 files | Markdown | Prioritized list of missing skills with recommended learning order |

---

## 📁 Universal File Support & Ingestion

ChatWithPDF supports ingestion across all common document formats:

- **PDF**: PyMuPDF extraction with automatic OCR fallback via `pytesseract` for scanned pages.
- **DOCX**: `python-docx` parser preserving headings, nested bullet lists, and tables with estimated page numbers.
- **PPTX**: `python-pptx` parser treating each slide as a unit, extracting slide titles, body shapes, tables, and speaker notes.
- **XLSX & CSV**: Structured sheet and CSV parser converting rows and columns into clean, header-aligned text units.
- **TXT & MD**: UTF-8 markdown and plain text readers.
- **Images (PNG, JPG)**: OCR text recognition via `pytesseract`.
- **Location Citations**: Chunks and citations dynamically identify `location_type` (`page`, `slide`, `section`, `sheet`) and output readable labels like `(Page 4)`, `(Slide 7)`, `(Section: Introduction)`, or `(Sheet: Sales)`.
- **Role Tags**: Documents can be tagged with roles: `resume`, `job_description`, `contract`, `paper`, `notes`, or `other`.

---

## ⚡ Full-Document Understanding Engine

Located in `app/core/full_document.py`, this engine guarantees complete multi-page document comprehension:
- Rebuilds full text sequentially with `[File - Location]` headers.
- **Single-Pass**: Documents under ~80,000 tokens (character count / 4) are analyzed in a single unified prompt.
- **Map-Reduce**: Documents exceeding 80,000 tokens are processed in 10-unit batches, summarized, and synthesized into a master response.
- **Real-Time Progress**: Emits Server-Sent Events (`event: progress, data: {"step": "..."}`) to the frontend.
- **Output Caching**: Cached in `generated_outputs` table using a deterministic SHA256 document hash, mode, action, and options. Cache entries are automatically invalidated if a document is deleted.

---

## 🧪 Demo Seed Script

To demo all 5 modes immediately with pre-loaded sample documents:

```bash
cd backend
python scripts/seed_modes_demo.py
```

This script:
1. Creates the demo account: `demo@chatwithpdf.com` (password: `password123`).
2. Ingests 5 sample files in `backend/tests/samples/`:
   - `sample_notes.pdf` (Student Mode: Distributed Systems notes)
   - `sample_presentation.pptx` (Business/Researcher: Q3 Product Strategy deck)
   - `sample_contract.docx` (Legal Mode: Master Services Agreement)
   - `sample_resume.pdf` (Career Mode: Senior Backend Engineer resume)
   - `sample_job_description.docx` (Career Mode: Staff Full Stack Engineer job description)
3. Configures 5 ready-to-use mode chat sessions with pre-selected documents.


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
