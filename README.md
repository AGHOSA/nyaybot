# ⚖️ NyayBot v2.0 — AI-Powered Indian Legal Assistant

## What's New in v2.0

### Chat
- ✅ **Streaming responses** — AI replies appear word by word in real time
- ✅ **Multilingual** — AI responds in your selected language (Hindi, Bengali, Tamil, Telugu, Marathi, English)
- ✅ **Copy button** — Copy any bot reply with one click
- ✅ **Bookmark** — Save any bot reply; view saved answers in Settings → Bookmarks
- ✅ **Follow-up chips** — Smart suggestions after relevant replies
- ✅ **Emergency helplines** — 🆘 button shows 8 Indian emergency numbers
- ✅ **Rate limit warning** — Friendly alert if Groq rate limit is hit
- ✅ **Sidebar toggle** — Collapse sidebar for more chat space

### Text-to-Speech (TTS)
- ✅ Global enable/disable in Settings → Accessibility
- ✅ Auto-read new replies toggle
- ✅ Per-message 🔊 Read button on each bot reply
- ✅ Voice gender: Female / Male
- ✅ Speed control: 0.5× to 2.0×
- ✅ Stop button while speaking
- ✅ Language-matched voice (Hindi voice for Hindi, etc.)
- ✅ All 6 Indian languages supported

### Profile & Auth
- ✅ **Profile photo upload** (max 2MB, stored as base64)
- ✅ **Login activity log** (last 8 logins with IP, device, status)
- ✅ **Forgot password** (token-based; email-ready)
- ✅ Groq API key kept backend-only, never sent to browser

### New Settings Tabs
- ✅ **Bookmarks** — Saved replies with copy/remove
- ✅ **Dashboard** — Stats, top topics chart, 14-day activity bars
- ✅ **Lawyer Directory** — Legal aid + bar associations, filter by city

---

## Quick Start

### Backend
```bash
cd backend
npm install
# Edit .env (see below)
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

---

## backend/.env
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/nyaybot
JWT_SECRET=nyaybot_secret_key_123
GROQ_API_KEY=your_groq_api_key_here
```

---

## Forgot Password (Production)
For production, add nodemailer to send reset emails:
```bash
npm install nodemailer
```
Then update the forgot-password route in `routes/auth.js` to email the reset link instead of returning it in the response.

---

## Tech Stack
- AI: Llama 3.3-70B via Groq API (streaming SSE)
- Backend: Node.js, Express, MongoDB (Mongoose)
- Frontend: React + Vite
- Auth: JWT + bcrypt + crypto
- TTS: Web Speech API (browser-native, zero cost)
