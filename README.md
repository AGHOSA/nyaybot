# NyayBot — AI-Powered Indian Legal Aid Chatbot

NyayBot is a free AI-powered legal aid chatbot built for Indian citizens. It provides accessible legal guidance in multiple Indian languages, supports document analysis, and connects users to emergency helplines — making legal help available to everyone, everywhere.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | https://nyaybot.vercel.app |
| Backend API | https://nyaybot-backend-zrfp.onrender.com |

---

## Features

### AI Legal Assistance
- Powered by Groq API with LLaMA 3 model for fast, accurate legal responses
- Understands Indian law — IPC, CrPC, Constitution, RTI, consumer rights, and more
- Context-aware multi-turn conversations

### Multi-Language Support
- Supports Hindi, Bengali, Tamil, Telugu, Kannada, Malayalam, Marathi, Gujarati, Punjabi, and more
- Auto language detection — responds in the user's language automatically
- Text-to-Speech (TTS) in detected language using Web Speech API

### Document Analysis
- Upload PDFs, DOCX, and images for legal document review
- Extracts and analyzes text from uploaded files
- Provides plain-language summaries and legal insights

### User Authentication
- Secure JWT-based authentication
- Passwords hashed with bcrypt — never stored as plain text
- Protected routes for chat history and bookmarks

### Chat History and Bookmarks
- Full persistent chat history stored per user in MongoDB
- Bookmark important legal responses for later reference
- Sidebar with previous conversations

### Mobile Responsive
- Fully responsive design — works on mobile, tablet, and desktop
- Clean, accessible UI optimized for all screen sizes

### Emergency Helplines
- Built-in panel with Indian emergency legal helplines
- One-tap access to police, women helpline, legal aid, and more

---

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| Axios | HTTP requests to backend API |
| Web Speech API | Text-to-Speech (TTS) |
| CSS3 | Styling and responsive layout |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API framework |
| Mongoose | MongoDB ODM |
| JWT (jsonwebtoken) | User authentication tokens |
| bcrypt | Password hashing |
| Multer | File upload handling |
| pdf-parse | Extract text from PDFs |
| mammoth | Extract text from DOCX files |
| cors | Cross-origin resource sharing |
| dotenv | Environment variable management |

### AI and Cloud

| Technology | Purpose |
|---|---|
| Groq API | Ultra-fast LLM inference |
| LLaMA 3 (Meta) | Large language model for legal Q&A |
| MongoDB Atlas | Cloud database |
| Render | Backend hosting |
| Vercel | Frontend hosting |

---

## Project Structure

```
nyaybot/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatPage.jsx        # Main chat interface
│   │   │   ├── LoginPage.jsx       # Login/Register UI
│   │   │   ├── Sidebar.jsx         # Chat history sidebar
│   │   │   └── HelplinePanel.jsx   # Emergency helplines
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── models/
│   │   ├── User.js                 # User schema
│   │   └── Chat.js                 # Chat/message schema
│   ├── routes/
│   │   ├── auth.js                 # Register, login routes
│   │   └── chat.js                 # Chat, upload, history routes
│   ├── middleware/
│   │   └── authMiddleware.js       # JWT verification
│   ├── server.js                   # Express app entry point
│   ├── .env                        # Environment variables (not committed)
│   └── package.json
│
└── README.md
```

---

## Environment Variables

### Backend (backend/.env)

```
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/nyaybot
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=https://nyaybot.vercel.app
PORT=5000
```

### Frontend (frontend/.env)

```
VITE_API_URL=https://nyaybot-backend-zrfp.onrender.com
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Groq API key (free at https://console.groq.com)

### 1. Clone the repo

```bash
git clone https://github.com/AGHOSA/nyaybot.git
cd nyaybot
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Create backend/.env with your values, then:

```bash
npm run dev
```

Backend runs at http://localhost:5000

### 3. Setup Frontend

```bash
cd frontend
npm install
```

Create frontend/.env:

```
VITE_API_URL=http://localhost:5000
```

Then:

```bash
npm run dev
```

Frontend runs at http://localhost:5173

---

## Deployment

### Backend on Render
1. Go to render.com and create a New Web Service
2. Connect GitHub repo and select nyaybot
3. Root Directory: backend
4. Build Command: npm install
5. Start Command: node server.js
6. Add environment variables: MONGO_URI, JWT_SECRET, GROQ_API_KEY, FRONTEND_URL

### Frontend on Vercel
1. Go to vercel.com and add a New Project
2. Select nyaybot repo
3. Root Directory: frontend
4. Add environment variable: VITE_API_URL = your Render backend URL
5. Deploy

---

## Security

- All passwords hashed using bcrypt with salt rounds of 10
- Authentication via JWT tokens
- CORS configured to allow only trusted origins
- Environment variables never committed to GitHub
- MongoDB Atlas with IP allowlist and strong credentials

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create your feature branch: git checkout -b feature/AmazingFeature
3. Commit your changes: git commit -m 'Add AmazingFeature'
4. Push to branch: git push origin feature/AmazingFeature
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

## Author

Arnab Ghosal  
GitHub: https://github.com/AGHOSA

---

> "Justice delayed is justice denied — NyayBot ensures no one is left behind."
