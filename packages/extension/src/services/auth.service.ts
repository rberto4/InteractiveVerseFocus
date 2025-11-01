import { API_BASE_URL } from '../config/constants';

interface AuthState {
  token: string | null;
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  } | null;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const EXTENSION_ID = chrome.runtime.id;

class AuthService {
  private buildGoogleAuthUrl(): string {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID is not configured. Please check your .env file.');
    }
    
    const redirectUri = `https://${EXTENSION_ID}.chromiumapp.org/`;
    const scopes = [
      'email',
      'profile',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' ');

    console.log('Building OAuth URL with:', { 
      clientId: GOOGLE_CLIENT_ID.substring(0, 20) + '...', 
      redirectUri 
    });

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: Math.random().toString(36).substring(7), // CSRF protection
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async initiateGoogleAuth(): Promise<{ token: string; userId: string }> {
    return new Promise((resolve, reject) => {
      const authUrl = this.buildGoogleAuthUrl();
      console.log('Starting Google OAuth flow...');
      
      chrome.identity.launchWebAuthFlow(
        {
          url: authUrl,
          interactive: true,
        },
        async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome identity error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!redirectUrl) {
            console.error('No redirect URL received');
            reject(new Error('No redirect URL received'));
            return;
          }

          console.log('Received redirect URL');
          
          try {
            const url = new URL(redirectUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              reject(new Error(error));
              return;
            }

            if (!code) {
              reject(new Error('No authorization code received'));
              return;
            }

            // Exchange code for token via backend
            console.log('Exchanging code for token...', { code: code.substring(0, 10) + '...' });
            const response = await fetch(`${API_BASE_URL}/auth/exchange`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });

            console.log('Exchange response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Exchange failed:', errorText);
              throw new Error(`Failed to exchange authorization code: ${errorText}`);
            }

            const data = await response.json();
            console.log('Exchange successful, received token');
            resolve({ token: data.token, userId: data.user.id });
          } catch (error) {
            console.error('Error in OAuth callback handler:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during authentication';
            reject(new Error(errorMessage));
          }
        }
      );
    });
  }

  async verifyToken(token: string): Promise<AuthState['user']> {
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${token}`);
    
    if (!response.ok) {
      throw new Error('Invalid token');
    }

    const data = await response.json();
    return data.user;
  }

  async saveAuthState(state: AuthState): Promise<void> {
    await chrome.storage.local.set({ authState: state });
  }

  async getAuthState(): Promise<AuthState> {
    const result = await chrome.storage.local.get('authState');
    return result.authState || { token: null, userId: null, user: null };
  }

  async clearAuthState(): Promise<void> {
    await chrome.storage.local.remove('authState');
  }

  async login(): Promise<AuthState> {
    try {
      const { token, userId } = await this.initiateGoogleAuth();
      const user = await this.verifyToken(token);

      const authState: AuthState = {
        token,
        userId,
        user,
      };

      await this.saveAuthState(authState);
      return authState;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await this.clearAuthState();
  }

  async isAuthenticated(): Promise<boolean> {
    const state = await this.getAuthState();
    if (!state.token) return false;

    try {
      await this.verifyToken(state.token);
      return true;
    } catch {
      await this.clearAuthState();
      return false;
    }
  }
}

export const authService = new AuthService();
