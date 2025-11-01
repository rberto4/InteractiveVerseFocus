// API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Auth endpoints
export const AUTH_ENDPOINTS = {
  GOOGLE_AUTH: `${API_BASE_URL}/auth/google`,
  GOOGLE_CALLBACK: `${API_BASE_URL}/auth/google/callback`,
  VERIFY_TOKEN: `${API_BASE_URL}/auth/verify`,
} as const;

// Google OAuth config
export const GOOGLE_OAUTH_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');
