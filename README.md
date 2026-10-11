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
