// API base URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Google OAuth config
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID;

// Validate required environment variables
if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR-GOOGLE-CLIENT-ID') {
  console.error('❌ VITE_GOOGLE_CLIENT_ID not configured in .env file');
  console.error('📝 Copy packages/extension/.env.example to .env and configure it');
}

if (!EXTENSION_ID || EXTENSION_ID === 'YOUR-EXTENSION-ID') {
  console.error('❌ VITE_EXTENSION_ID not configured in .env file');
  console.error('📝 Get the ID from chrome://extensions/ after loading the unpacked extension');
}

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
