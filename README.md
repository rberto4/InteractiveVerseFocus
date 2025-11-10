# InteractiveVerseFocus

> AI-powered browser extension that transforms your goals into scheduled calendar events

## 🎯 What is it?

InteractiveVerseFocus breaks down your goals into actionable tasks and automatically schedules them in Google Calendar, avoiding conflicts with existing events.

**Features:**
- 📅 Google Calendar integration with OAuth2
- 🤖 AI-powered task breakdown (OpenRouter API)
- ⚡ Smart scheduling with conflict detection
- ✅ Review and approve before committing

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.x
- pnpm >= 8.x  
- PostgreSQL >= 16.x
- Google Cloud account
- OpenRouter API key

### Setup

```bash
# 1. Clone and install
git clone https://github.com/rberto4/InteractiveVerseFocus.git
cd InteractiveVerseFocus
pnpm install

# 2. Setup backend
cd packages/backend
cp .env.example .env
# Edit .env with your credentials (see below)
pnpm prisma migrate dev
pnpm dev

# 3. Setup extension
cd packages/extension
cp .env.example .env
# Edit .env with your credentials (see below)
pnpm build

# 4. Load in Chrome
# Open chrome://extensions/
# Enable "Developer mode"
# Click "Load unpacked" -> select packages/extension/dist
# Copy the Extension ID and update both .env files
```

### Environment Variables

**Backend (packages/backend/.env):**
```bash
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/interactiverse"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"
OPENROUTER_API_KEY="your-openrouter-key"
JWT_SECRET="generate-with-openssl-rand-base64-32"
EXTENSION_ID="get-from-chrome-after-loading"
```

**Extension (packages/extension/.env):**
```bash
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID="same-as-backend"
VITE_EXTENSION_ID="same-as-backend"
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Create OAuth 2.0 Client ID (Web application)
4. Add redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `https://YOUR-EXTENSION-ID.chromiumapp.org/`

---

## 🎮 Usage

1. Click extension icon → Login with Google
2. Create a goal with title and deadline
3. Click "Generate Task Plan"
4. Review AI-generated tasks
5. Click "Commit to Calendar"

---

## 🔧 Development

```bash
# Backend (Terminal 1)
cd packages/backend && pnpm dev

# Extension (Terminal 2) 
cd packages/extension && pnpm build  # Rebuild after changes
```

**Important:** Chrome extensions require `pnpm build` after every `.env` change.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Extension not loading | Run `pnpm build` in packages/extension |
| OAuth login fails | Verify CLIENT_ID matches in both .env files |
| Database error | Check PostgreSQL is running, run `pnpm prisma migrate dev` |
| AI generation fails | Check OPENROUTER_API_KEY is valid |

---

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Detailed setup guide
- [MAINTAINER_SECRETS.md](MAINTAINER_SECRETS.md) - Secrets management

---

## 🛠 Tech Stack

React · TypeScript · Vite · Tailwind · NestJS · PostgreSQL · Prisma · OpenRouter

---

## 📝 License

MIT License - see [LICENSE](LICENSE)

---

Made with ❤️ by the InteractiveVerseFocus team
