// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    GOOGLE_CONNECT: '/api/auth/google/connect',
    GOOGLE_CALLBACK: '/api/auth/google/callback',
    LOGOUT: '/api/auth/logout',
    STATUS: '/api/auth/status',
  },
  CALENDAR: {
    EVENTS: '/api/calendar/events',
    CREATE_EVENT: '/api/calendar/events',
    UPDATE_EVENT: (id: string) => `/api/calendar/events/${id}`,
    DELETE_EVENT: (id: string) => `/api/calendar/events/${id}`,
  },
  GOALS: {
    GENERATE_PLAN: '/api/goals/generate-plan',
    COMMIT_PLAN: '/api/goals/commit-plan',
    GET_PLANS: '/api/goals/plans',
    GET_PLAN: (id: string) => `/api/goals/plans/${id}`,
    ROLLBACK_PLAN: (id: string) => `/api/goals/plans/${id}/rollback`,
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CALENDAR_EVENTS: 'calendar_events',
  ACTIVE_PLAN: 'active_plan',
} as const;

// Error Codes
export const ERROR_CODES = {
  AUTH: {
    UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
    TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  },
  CALENDAR: {
    NOT_CONNECTED: 'CALENDAR_NOT_CONNECTED',
    FETCH_FAILED: 'CALENDAR_FETCH_FAILED',
    CREATE_FAILED: 'CALENDAR_CREATE_FAILED',
  },
  AI: {
    GENERATION_FAILED: 'AI_GENERATION_FAILED',
    INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
    RATE_LIMIT: 'AI_RATE_LIMIT',
  },
  VALIDATION: {
    INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
    MISSING_FIELD: 'VALIDATION_MISSING_FIELD',
  },
} as const;

// Rate Limits
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 100,
  AI_REQUESTS_PER_HOUR: 50,
  EVENT_CREATION_PER_DAY: 500,
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  DEFAULT_BUFFER_TIME_MINUTES: 15,
  DEFAULT_TASK_DURATION_MINUTES: 60,
  MIN_TASK_DURATION_MINUTES: 15,
  MAX_TASK_DURATION_MINUTES: 480, // 8 hours
  WORKING_HOURS_START: '09:00',
  WORKING_HOURS_END: '18:00',
} as const;

// AI Model Configuration
export const AI_CONFIG = {
  MODEL: 'openai/gpt-4-turbo',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  SYSTEM_PROMPT_VERSION: '1.0',
} as const;

// Calendar Colors
export const CALENDAR_COLORS = {
  GOAL_TASK: '#1E88E5', // Blue
  HIGH_PRIORITY: '#E53935', // Red
  MEDIUM_PRIORITY: '#FB8C00', // Orange
  LOW_PRIORITY: '#43A047', // Green
  COMPLETED: '#757575', // Gray
} as const;
