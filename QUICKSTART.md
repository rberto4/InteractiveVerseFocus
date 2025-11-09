# Quick Start Guide

This guide will help you get the InteractiveVerseFocus project up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **pnpm** >= 8.x (Install: `npm install -g pnpm`)
- **PostgreSQL** >= 16.x ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

## Step 1: Clone and Install

```bash
# Clone the repository (if not already done)
cd "/Users/robmac/Developer/Progetti locali/Interactiverse_focus_extension"

# Install all dependencies (this will install for all packages in the monorepo)
pnpm install
```

**Note**: The project uses pnpm workspaces with `pnpm-workspace.yaml` already configured.

## Step 2: Setup Environment Variables

### Backend Setup

```bash
# Copy example environment file
cp packages/backend/.env.example packages/backend/.env

# Edit the .env file with your values
# Required:
# - DATABASE_URL (PostgreSQL connection string)
# - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (from Google Cloud Console)
# - OPENROUTER_API_KEY (from OpenRouter)
# - JWT_SECRET (generate a random string)
```

### Extension Setup

```bash
# Copy example environment file
cp packages/extension/.env.example packages/extension/.env

# Edit with your values (should match backend)
```

## Step 3: Setup Database

### Start PostgreSQL (if not running)

```bash
# macOS with Homebrew:
brew services start postgresql@16

# Verify it's running:
brew services list | grep postgresql
```

### Create the database

```bash
# Create the database (use your Mac username, check with: whoami)
psql -U $(whoami) postgres -c "CREATE DATABASE interactiverse;"
```

### Update DATABASE_URL in .env

The `.env` file should already have the correct DATABASE_URL format. If not:

```bash
# For macOS Homebrew PostgreSQL (no password):
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/interactiverse"
# Replace YOUR_USERNAME with your actual username
```

### Run migrations

```bash
cd packages/backend

# Generate Prisma Client
pnpm prisma:generate

# Run migrations to create tables
pnpm prisma:migrate dev --name init

# (Optional) Open Prisma Studio to view database
pnpm prisma:studio
```

You should see 5 tables created: User, AuthToken, Goal, TaskPlan, CalendarEvent

## Step 4: Start Development Servers

Open 2 terminal windows:

### Terminal 1 - Backend API

```bash
cd packages/backend
pnpm dev
```

The backend will start at `http://localhost:3000`

### Terminal 2 - Extension (Watch Mode)

```bash
cd packages/extension
pnpm dev
```

The extension will be built to `packages/extension/dist` and rebuild on changes.

## Step 5: Load Extension in Browser

### Chrome/Edge

1. Open `chrome://extensions/` (or `edge://extensions/`)
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Navigate to and select: `packages/extension/dist`

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to and select: `packages/extension/dist/manifest.json`

## Step 6: Test the Extension

1. Click the extension icon in your browser toolbar
2. You should see the InteractiveVerseFocus popup
3. Currently shows a "Connect Calendar" button (OAuth not yet implemented)

## Next Steps

Now that the project is set up, you can:

1. **Phase 1**: Implement Google Calendar OAuth integration
2. **Phase 2**: Build the goal input UI
3. **Phase 3**: Integrate OpenRouter AI for task decomposition

See the full development roadmap in [README.md](../README.md)

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:
```bash
# Change PORT in packages/backend/.env
PORT=3001
```

### Database Connection Issues

```bash
# Ensure PostgreSQL is running
# macOS with Homebrew:
brew services start postgresql@16

# Check connection:
psql -U postgres
```

### Extension Not Loading

- Ensure `pnpm build` completes successfully
- Check browser console for errors (F12)
- Verify manifest.json exists in dist folder

### Module Not Found Errors

```bash
# Clean and reinstall
pnpm clean
pnpm install
```

## Useful Commands

```bash
# Root directory commands
pnpm dev          # Start all packages in dev mode
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm test         # Run all tests
pnpm typecheck    # Type check all packages
pnpm clean        # Clean all build artifacts

# Package-specific commands
cd packages/backend
pnpm dev          # Start backend in watch mode
pnpm prisma:studio # Open database GUI

cd packages/extension
pnpm dev          # Build extension in watch mode
pnpm build        # Build extension for production
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Google Calendar API](https://developers.google.com/calendar)
- [OpenRouter API](https://openrouter.ai/docs)

---

**Need Help?** Open an issue on GitHub or check the main README.md for more details.
