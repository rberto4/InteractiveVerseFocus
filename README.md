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
| **Docker** | Containerization |
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
- **PostgreSQL** >= 16.x (or Docker)
- **Google Cloud Platform** account (for Calendar API)
- **OpenRouter API** key

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/interactiverse_focus_extension.git
cd interactiverse_focus_extension
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Setup environment variables**

Create `.env` files in both `packages/backend` and `packages/extension`:

**Backend `.env`:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/interactiverse"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
OPENROUTER_API_KEY="your-openrouter-api-key"
JWT_SECRET="your-jwt-secret"
PORT=3000
```

**Extension `.env`:**
```env
VITE_API_URL="http://localhost:3000"
```

4. **Setup database**

```bash
cd packages/backend
pnpm prisma migrate dev
pnpm prisma generate
```

5. **Start development servers**

```bash
# Terminal 1: Backend API
cd packages/backend
pnpm dev

# Terminal 2: Extension (watch mode)
cd packages/extension
pnpm dev
```

6. **Load extension in browser**

- Chrome: Navigate to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", select `packages/extension/dist`
- Firefox: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `packages/extension/dist/manifest.json`

---

## 📅 Development Roadmap

### Phase 0: Planning & Setup ✅ (Current Phase)

**Objective**: Establish project foundation

- [x] Define detailed user stories and flow diagrams
- [x] Design architecture diagrams
- [ ] Setup monorepo with TypeScript/ESLint/Prettier
- [ ] Configure CI/CD pipeline (GitHub Actions)
- [ ] Setup development environment and tooling

**Timeline**: Week 1-2

---

### Phase 1: Calendar API Integration

**Objective**: Connect to Google Calendar and read events

**Tasks**:

- [ ] Implement OAuth2 authorization flow for Google Calendar
  - Setup Google Cloud Console project
  - Configure OAuth2 credentials
  - Implement authorization endpoint
  - Handle callback and token exchange
  
- [ ] Store and refresh access tokens securely
  - Create `Token` model in database
  - Implement token encryption
  - Create token refresh middleware
  
- [ ] Build `CalendarProvider` abstraction layer
  - Create `ICalendarProvider` interface
  - Implement `GoogleCalendarProvider` class
  - Add methods: `getEvents()`, `createEvent()`, `updateEvent()`, `deleteEvent()`
  
- [ ] Create basic extension UI
  - Design "Connect Calendar" button
  - Implement OAuth popup flow
  - Handle authentication state
  
- [ ] Display list of existing calendar events
  - Create event list component
  - Fetch events from API
  - Display in extension popup/sidebar
  
- [ ] **Acceptance Test**: Successfully authenticate and display Google Calendar events

**Timeline**: Week 3-4

**API Endpoints**:
```
POST   /api/auth/google/connect
GET    /api/auth/google/callback
GET    /api/calendar/events?start={date}&end={date}
```

---

### Phase 2: Extension UI Scaffolding

**Objective**: Build user interface for goal input

**Tasks**:

- [ ] Design extension popup/sidebar layout
  - Create wireframes for main screens
  - Define component hierarchy
  - Setup routing (if multi-page)
  
- [ ] Create "Set Goal" component
  - Goal title input
  - Description textarea
  - Deadline date picker
  - Priority dropdown (Low/Medium/High)
  
- [ ] Implement form validation
  - Required field validation
  - Date validation (deadline must be future)
  - Character limits
  
- [ ] Connect form submission to backend
  - Create API client utility
  - Handle loading states
  - Display success/error messages
  
- [ ] Display AI-generated task plan
  - Task list component
  - Suggested time slots visualization
  - Edit/approve controls
  
- [ ] **Acceptance Test**: Submit goal and receive structured response

**Timeline**: Week 3-4

**UI Components**:
- `GoalInputForm`
- `TaskPlanPreview`
- `TimeSlotPicker`
- `ConflictResolver`

---

### Phase 3: AI Integration & Prompt Engineering

**Objective**: Generate task breakdowns using AI

**Tasks**:

- [ ] Setup `AIModule` with OpenRouter SDK
  - Install SDK
  - Configure API credentials
  - Create service wrapper
  
- [ ] Design system prompt template
  - Define prompt structure
  - Include calendar context format
  - Specify output JSON schema
  
- [ ] Create backend endpoint: `POST /api/goals/generate-plan`
  - Accept goal details
  - Fetch user's calendar events
  - Construct AI prompt with context
  - Call OpenRouter API
  - Parse AI response
  - Return structured task plan
  
- [ ] Implement response parsing and validation
  - Validate AI output against schema
  - Handle malformed responses
  - Fallback to rule-based decomposition if needed
  
- [ ] Display generated plan in extension
  - Show subtasks with details
  - Display suggested time slots
  - Provide edit/approve buttons
  
- [ ] Iterate on prompt engineering
  - Test with various goal types
  - Refine prompt for better output quality
  - Add examples to prompt
  
- [ ] **Acceptance Test**: Generate high-quality task plans for diverse goals with >70% user acceptance

**Timeline**: Week 5-6

**System Prompt Structure**:
```
You are a task planning assistant. Given a user's goal and their calendar context, 
break down the goal into actionable subtasks and suggest optimal time slots.

Calendar Context:
- Existing events (with times and descriptions)
- User's typical working hours
- Buffer time preferences

Output Format:
{
  "subtasks": [
    {
      "title": "string",
      "description": "string",
      "suggestedStart": "ISO8601 datetime",
      "duration": number (minutes),
      "priority": number (1-5),
      "dependencies": ["subtask_id"]
    }
  ]
}
```

---

### Phase 4: Automated Calendar Event Creation

**Objective**: Insert approved subtasks into calendar

**Tasks**:

- [ ] Implement user approval flow in UI
  - Checkboxes for each subtask
  - Drag-and-drop for rescheduling
  - Edit subtask details inline
  
- [ ] Create backend endpoint: `POST /api/goals/commit-plan`
  - Receive approved subtasks
  - Validate time slots
  - Create calendar events via provider
  - Handle partial failures
  
- [ ] Implement event creation logic
  - Map subtask to calendar event format
  - Set title, description, start/end times
  - Add reminders
  - Apply color coding/tags
  
- [ ] Provide real-time feedback
  - Progress indicator during creation
  - Success notifications
  - Error handling with retry options
  
- [ ] Implement conflict detection
  - Check for overlapping events before creation
  - Auto-adjust suggestions if conflicts detected
  - Prompt user to resolve manually if needed
  
- [ ] Add undo functionality
  - Store created event IDs
  - Provide "Undo All" button
  - Delete events on undo
  
- [ ] **Acceptance Test**: Create multiple events with >95% success rate, verify in actual calendar

**Timeline**: Week 7-8

**API Endpoints**:
```
POST   /api/goals/commit-plan
DELETE /api/goals/rollback-plan/{planId}
GET    /api/goals/conflicts
```

---

### Phase 5: Intelligent Optimization

**Objective**: Enhance AI with contextual awareness

**Tasks**:

- [ ] Improve AI prompts with pattern recognition
  - Detect recurring events (e.g., "Monday standup at 10am")
  - Identify free time slots
  - Learn user preferences (morning vs evening)
  - Understand event relationships
  
- [ ] Implement advanced scheduling features
  - Task clustering (group related tasks)
  - Buffer time between events
  - Priority-based scheduling
  - Dependency resolution
  
- [ ] Add UI visualizations
  - Calendar heatmap showing availability
  - Before/after schedule comparison
  - Highlighted optimal time slots
  - Weekly/monthly view
  
- [ ] Implement analytics logging
  - Track generated subtasks
  - User acceptance rate
  - Task completion tracking
  - Time estimation accuracy
  
- [ ] Add feedback mechanism
  - "This worked well / didn't work" buttons
  - User can provide context for revisions
  - Feed feedback into future prompts
  
- [ ] **Acceptance Test**: AI suggestions improve measurably, pattern detection works for common scenarios

**Timeline**: Week 9-10

**Analytics Metrics**:
- Plan generation time
- Acceptance rate per goal type
- Conflict rate
- User satisfaction scores

---

### Phase 6: Testing, Security & Deployment

**Objective**: Prepare for production release

#### Testing

- [ ] Write unit tests (80%+ coverage)
  - Test all service methods
  - Test API endpoints
  - Test React components
  
- [ ] Integration tests
  - Calendar API integration
  - OpenRouter AI service
  - End-to-end goal workflow
  
- [ ] End-to-end tests
  - Full extension workflow
  - OAuth flow
  - Event creation flow
  
- [ ] Performance testing
  - Measure API latency
  - AI response times
  - Database query optimization
  
- [ ] Browser compatibility testing
  - Chrome/Edge (Chromium)
  - Firefox
  - Safari (if applicable)

#### Security

- [ ] Audit OAuth2 implementation
  - Secure token storage
  - PKCE flow implementation
  - Proper scope requests
  
- [ ] Implement security best practices
  - Rate limiting (100 req/min per user)
  - Input validation and sanitization
  - SQL injection prevention (via Prisma)
  - XSS protection
  
- [ ] Encrypt sensitive data
  - Token encryption at rest
  - HTTPS for all API calls
  - Secure environment variable management
  
- [ ] Security scanning
  - OWASP dependency check
  - npm audit
  - Penetration testing (if budget allows)

#### Deployment

- [ ] Deploy backend to production
  - Choose hosting (Vercel/AWS/Fly.io)
  - Setup production database
  - Configure environment variables
  - Setup SSL certificates
  
- [ ] Package extension for stores
  - Chrome Web Store submission
  - Firefox Add-ons submission
  - Create promotional materials
  
- [ ] Setup monitoring and alerting
  - Configure Sentry for error tracking
  - Setup uptime monitoring
  - Create alerting rules
  
- [ ] Write user documentation
  - README for users
  - FAQ section
  - Privacy policy
  - Terms of service
  
- [ ] Production testing
  - Staging environment testing
  - Beta user testing
  - Load testing

**Timeline**: Week 11-12

---

### Phase 7: Expansion & Maintenance

**Objective**: Scale and improve based on user feedback

**Future Features**:

- [ ] Microsoft Graph API integration
- [ ] CalDAV protocol support
- [ ] Advanced AI features
  - "Revise plan" with user feedback
  - Predictive suggestions based on history
  - Natural language goal input improvements
- [ ] Premium features (optional)
  - Advanced analytics dashboard
  - Team collaboration
  - Custom AI model fine-tuning
  - Multiple calendar accounts
- [ ] Internationalization (i18n)
- [ ] Mobile extension or companion app
- [ ] Recurring goals and templates
- [ ] Integration with task management tools (Todoist, Notion)

**Ongoing**:
- Continuous monitoring and bug fixes
- Regular updates for browser API changes
- User feedback incorporation
- Performance optimization

---

## 📡 API Documentation

### Authentication

#### Connect Google Calendar

```http
POST /api/auth/google/connect
```

Initiates OAuth2 flow for Google Calendar.

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### OAuth Callback

```http
GET /api/auth/google/callback?code={code}&state={state}
```

Handles OAuth callback and exchanges code for tokens.

**Response:**
```json
{
  "userId": "uuid",
  "accessToken": "jwt-token"
}
```

---

### Calendar Events

#### Get Events

```http
GET /api/calendar/events?start=2025-01-01&end=2025-01-31
Authorization: Bearer {token}
```

Retrieve calendar events for a date range.

**Response:**
```json
{
  "events": [
    {
      "id": "event-123",
      "title": "Team Meeting",
      "description": "Weekly sync",
      "start": "2025-01-15T10:00:00Z",
      "end": "2025-01-15T11:00:00Z",
      "isAllDay": false,
      "color": "#1E88E5"
    }
  ]
}
```

---

### Goals

#### Generate Task Plan

```http
POST /api/goals/generate-plan
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Complete project proposal",
  "description": "Write and submit Q1 project proposal",
  "deadline": "2025-02-01T23:59:59Z",
  "priority": "high"
}
```

**Response:**
```json
{
  "planId": "plan-456",
  "subtasks": [
    {
      "id": "task-1",
      "title": "Research similar proposals",
      "description": "Review last quarter's proposals",
      "suggestedStart": "2025-01-16T14:00:00Z",
      "duration": 60,
      "priority": 3,
      "dependencies": []
    },
    {
      "id": "task-2",
      "title": "Draft outline",
      "description": "Create proposal structure",
      "suggestedStart": "2025-01-17T09:00:00Z",
      "duration": 90,
      "priority": 4,
      "dependencies": ["task-1"]
    }
  ],
  "conflicts": []
}
```

#### Commit Task Plan

```http
POST /api/goals/commit-plan
Authorization: Bearer {token}
Content-Type: application/json

{
  "planId": "plan-456",
  "approvedTasks": [
    {
      "id": "task-1",
      "start": "2025-01-16T14:00:00Z",
      "duration": 60
    }
  ]
}
```

**Response:**
```json
{
  "createdEvents": [
    {
      "eventId": "event-789",
      "taskId": "task-1",
      "status": "created"
    }
  ],
  "errors": []
}
```

---

## 🔒 Security & Privacy

### Data Privacy Principles

1. **Minimal Data Collection**: Only collect data necessary for functionality
2. **No Event Content Storage**: Calendar event details are not permanently stored
3. **Encrypted Tokens**: OAuth tokens are encrypted at rest
4. **User Control**: Users can revoke access and delete all data anytime
5. **Transparency**: Clear privacy policy explaining all data usage

### Security Measures

- **OAuth2 with PKCE**: Industry-standard authentication
- **Token Encryption**: AES-256 encryption for stored tokens
- **Rate Limiting**: Prevent abuse (100 req/min per user)
- **Input Validation**: All inputs validated with Zod schemas
- **HTTPS Only**: All API communication over TLS
- **Minimal Scopes**: Request only necessary calendar permissions

### Compliance

- **GDPR Compliant**: Right to access, delete, and export data
- **CCPA Compliant**: California Consumer Privacy Act adherence
- **SOC 2 Ready**: Security controls for cloud services (future)

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **Linting**: Pass ESLint checks
- **Formatting**: Use Prettier
- **Tests**: Write tests for new features
- **Documentation**: Update README for significant changes

---

## 📊 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Time to decompose goal | < 10 seconds | 🔄 TBD |
| AI plan acceptance rate | > 70% | 🔄 TBD |
| Event creation success rate | > 95% | 🔄 TBD |
| User retention (1 month) | > 50% | 🔄 TBD |
| Calendar conflicts per plan | < 1 | 🔄 TBD |

---

## 🗺 Key Considerations & Risk Mitigation

### Privacy & Security
- **Risk**: Calendar data is highly sensitive
- **Mitigation**: Clear privacy policy, minimal data retention, end-to-end encryption, regular security audits

### OAuth Token Management
- **Risk**: Token expiration or invalid scopes
- **Mitigation**: Request only necessary permissions, robust token refresh logic, clear error messages

### AI Cost & Rate Limits
- **Risk**: High API costs or hitting rate limits
- **Mitigation**: Caching, user-side rate limiting, fallback algorithms, budget monitoring

### User Control & Trust
- **Risk**: Users feel AI has too much control
- **Mitigation**: Always show plan before committing, easy undo, manual editing, transparent decision-making

### Calendar Synchronization
- **Risk**: Events modified outside extension cause inconsistencies
- **Mitigation**: Webhook listeners, periodic sync, graceful handling of external changes

### Browser Extension Limitations
- **Risk**: Manifest V3 restrictions, service worker limitations
- **Mitigation**: Follow best practices, multi-browser testing, graceful degradation, minimal background tasks

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Acknowledgments

- OpenRouter for AI API access
- Google Calendar API
- NestJS and React communities
- All contributors and beta testers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/interactiverse_focus_extension/issues)
- **Email**: support@interactiverse.com
- **Documentation**: [Wiki](https://github.com/yourusername/interactiverse_focus_extension/wiki)

---

**Last Updated**: October 29, 2025  
**Version**: 0.1.0 (Phase 0 - Setup)  
**Status**: 🚧 In Development
