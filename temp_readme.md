# InteractiveVerseFocus: AI-Powered Calendar Extension

> Transform your goals into actionable calendar events with AI-powered task decomposition

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Development Roadmap](#development-roadmap)
- [API Documentation](#api-documentation)
- [Security & Privacy](#security--privacy)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

InteractiveVerseFocus is a browser extension that integrates with calendar APIs and uses AI to intelligently decompose user goals into actionable tasks, automatically scheduling them while respecting existing commitments.

### Why This Project?

- **Goal-Oriented Planning**: Users set high-level goals, AI breaks them into subtasks
- **Intelligent Scheduling**: Automatically finds optimal time slots in your calendar
- **Conflict Avoidance**: Respects existing events and working hours
- **User Control**: Review and modify AI suggestions before committing
- **Multi-Provider**: Supports Google Calendar, Microsoft Graph, CalDAV

---

## ✨ Features

### Core Features

1. **Calendar Integration**
   - OAuth2 authentication with calendar providers
   - Read existing events and detect conflicts
   - Create, update, delete calendar events
   - Real-time synchronization

2. **AI-Powered Goal Decomposition**
   - Natural language goal input
   - Context-aware task breakdown
   - Intelligent duration estimation
   - Priority and dependency detection

3. **Intelligent Scheduling**
   - Automatic time slot optimization
   - Buffer time between events
   - Working hours respect
   - Task clustering for efficiency

4. **User Control Interface**
   - Visual calendar preview
   - Drag-and-drop rescheduling
   - Edit subtasks before committing
   - Undo/rollback functionality

5. **Multi-Provider Support**
   - Google Calendar (Phase 1)
   - Microsoft Graph (Phase 7)
   - CalDAV protocol (Phase 7)

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                         │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Popup UI    │  │  Background  │  │  Content Script │  │
│  │   (React)     │  │   Service    │  │   (Optional)    │  │
│  └───────┬───────┘  └──────┬───────┘  └─────────────────┘  │
└──────────┼──────────────────┼──────────────────────────────┘
           │                  │
           │ ┌────────────────▼────────────────┐
           │ │      Backend API Server         │
           │ │                                  │
           │ │  ┌──────────────────────────┐   │
           └─►│  │   API Gateway/Router    │   │
             │  └────────┬─────────────────┘   │
             │           │                      │
             │  ┌────────▼──────┐  ┌─────────┐ │
             │  │ Auth Module   │  │ Goal    │ │
             │  │ (OAuth2)      │  │ Planning│ │
             │  └───────────────┘  │ Module  │ │
             │                     └────┬────┘ │
             │  ┌──────────────┐       │      │
             │  │  Calendar    │◄──────┘      │
             │  │  Provider    │              │
             │  │  Module      │              │
             │  └──────┬───────┘              │
             └─────────┼──────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │               │
   ┌────▼────┐   ┌────▼────┐   ┌─────▼──────┐
   │ Google  │   │   AI    │   │ PostgreSQL │
   │Calendar │   │OpenRouter│   │  Database  │
   │   API   │   │   API   │   │            │
   └─────────┘   └─────────┘   └────────────┘
```

### Module Architecture

```typescript
// Core Module Interfaces

interface CalendarProvider {
  authenticate(credentials: OAuthCredentials): Promise<void>;
  getEvents(startDate: Date, endDate: Date): Promise<Event[]>;
  createEvent(event: EventInput): Promise<Event>;
  updateEvent(eventId: string, updates: Partial<EventInput>): Promise<Event>;
  deleteEvent(eventId: string): Promise<boolean>;
}

interface AIService {
  decomposeGoal(goal: Goal, context: CalendarContext): Promise<TaskPlan>;
  optimizeSchedule(tasks: Subtask[], constraints: ScheduleConstraints): Promise<Subtask[]>;
}

interface GoalPlanningService {
  generatePlan(goal: Goal, userId: string): Promise<TaskPlan>;
  commitPlan(planId: string, approvedTasks: Subtask[]): Promise<Event[]>;
  reviseTask(taskId: string, feedback: string): Promise<Subtask>;
}
```

---

## 🛠 Technical Stack

### Frontend (Browser Extension)

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Framework | ^18.2.0 |
| **TypeScript** | Type Safety | ^5.3.0 |
| **Vite** | Build Tool | ^5.0.0 |
| **Tailwind CSS** | Styling | ^3.4.0 |
| **Zustand** | State Management | ^4.4.0 |
| **React Query** | API Data Management | ^5.0.0 |
| **date-fns** | Date/Time Utilities | ^3.0.0 |

### Backend API

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | ^20.x |
| **NestJS** | Framework | ^10.0.0 |
| **TypeScript** | Type Safety | ^5.3.0 |
| **PostgreSQL** | Database | ^16.0 |
| **Prisma** | ORM | ^5.0.0 |
| **Passport** | Authentication | ^0.7.0 |
| **Zod** | Validation | ^3.22.0 |

### AI Integration

| Technology | Purpose |
|------------|---------|
| **OpenRouter API** | AI Model Access |
| **OpenRouter SDK** | API Client |

### DevOps & Tools

| Technology | Purpose |
|------------|---------|
| **ESLint** | Linting |
| **Prettier** | Code Formatting |
| **GitHub Actions** | CI/CD |
| **Sentry** | Error Tracking |

---

## 📁 Project Structure

```
interactiverse_focus_extension/
├── packages/
│   ├── extension/              # Browser extension (React + TypeScript)
│   │   ├── src/
│   │   │   ├── popup/          # Extension popup UI
│   │   │   ├── background/     # Service worker
│   │   │   ├── content/        # Content scripts (if needed)
│   │   │   ├── components/     # Shared React components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── store/          # Zustand state management
│   │   │   ├── utils/          # Utility functions
│   │   │   └── types/          # TypeScript types
│   │   ├── public/
│   │   │   ├── manifest.json   # Extension manifest v3
│   │   │   └── icons/          # Extension icons
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   ├── backend/                # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # OAuth2 authentication
│   │   │   │   ├── calendar/   # Calendar provider abstraction
│   │   │   │   ├── goals/      # Goal planning logic
│   │   │   │   ├── ai/         # OpenRouter integration
│   │   │   │   └── users/      # User management
│   │   │   ├── common/         # Shared utilities
│   │   │   │   ├── decorators/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   └── pipes/
│   │   │   ├── config/         # Configuration
│   │   │   ├── prisma/         # Database schema
│   │   │   └── main.ts         # Entry point
│   │   ├── test/               # E2E tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── nest-cli.json
│   │
│   └── shared/                 # Shared types and utilities
│       ├── src/
│       │   ├── types/          # Shared TypeScript interfaces
│       │   ├── constants/      # Shared constants
│       │   └── utils/          # Shared utility functions
│       ├── package.json
│       └── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI pipeline
│       └── deploy.yml          # Deployment pipeline
│
├── docs/                       # Additional documentation (if needed)
│   ├── API.md                  # API endpoints reference
│   └── ARCHITECTURE.md         # Detailed architecture decisions
│
├── scripts/                    # Build and deployment scripts
│   ├── build-extension.sh
│   └── deploy.sh
│
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── package.json                # Root package.json (workspaces)
├── tsconfig.json               # Base TypeScript config
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 8.x (or npm/yarn)
- **PostgreSQL** >= 16.x
- **Google Cloud Platform** account (for Calendar API)
- **OpenRouter API** key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/rberto4/InteractiveVerseFocus.git
cd InteractiveVerseFocus
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Setup environment variables**

Create `.env` files in both `packages/backend` and `packages/extension`:

**Backend `.env`:**
```env
# Database Configuration (varies by OS)
# 🍎 macOS (Homebrew PostgreSQL - no password)
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/interactiverse"
# Replace YOUR_MAC_USERNAME with output of: whoami

# 🐧 Linux / 🪟 Windows (requires password)
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/interactiverse"

# ⚠️ Get these from maintainer or secure source
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/auth/google/callback"
EXTENSION_ID="your-extension-id"
OPENROUTER_API_KEY="your-openrouter-api-key"
JWT_SECRET="your-jwt-secret"
PORT=3000
```

**Extension `.env`:**
```env
VITE_API_URL="http://localhost:3000"
```

4. **Setup PostgreSQL Database**

### 🛠 Manual Setup

#### Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 8.x (or npm/yarn)
- **PostgreSQL** >= 16.x
- **Google Cloud Platform** account (for Calendar API)
- **OpenRouter API** key


#### Environment Setup

**🔐 Secure Secrets Management**

This project uses encrypted `.env` files to securely share secrets between team members without exposing them in the repository.

**For Maintainers (First-Time Setup):**
```bash
# 1. Copy template and configure secrets
cp .env.template .env
# Edit .env with your real secret values

# 2. Encrypt for sharing
./scripts/manage-secrets.sh encrypt
# Enter a secure passphrase when prompted

# 3. Commit the encrypted file
git add .env.encrypted
git commit -m "feat: add encrypted environment secrets"
```

**For Team Members:**
```bash
# 1. Decrypt shared secrets
./scripts/manage-secrets.sh decrypt
# Use the passphrase shared by maintainer

# 2. Your .env file is ready!
```

**🔒 Security Notes:**
- `.env` contains real secrets (never commit)
- `.env.encrypted` is safe to commit (contains encrypted data)
- Share passphrase securely (1Password, encrypted email, etc.)
- Rotate passphrase regularly

