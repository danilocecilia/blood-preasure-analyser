import { supabase } from './supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';

// Complete the WebBrowser authentication flow
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

class AuthService {
  async signInWithGoogle(): Promise<{ data: any; error: any }> {
    try {
      console.log('Starting Google sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        return { data: null, error };
      }

      if (data?.url) {
        console.log('Opening OAuth URL:', data.url);
        
        // Get the correct redirect URL based on environment
        const redirectUrl = __DEV__ 
          ? Linking.createURL('/auth/callback')
          : 'bloodpressureanalyzer://auth/callback';
        
        console.log('Using redirect URL:', redirectUrl);
        
        // Open the OAuth URL in the browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        console.log('Auth session result:', result);

        if (result.type === 'success' && result.url) {
          console.log('Success URL:', result.url);
          
          // Extract tokens from the URL fragment
          const urlParts = result.url.split('#');
          if (urlParts.length > 1) {
            const params = new URLSearchParams(urlParts[1]);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            console.log('Extracted tokens:', { 
              hasAccessToken: !!accessToken, 
              hasRefreshToken: !!refreshToken 
            });

            if (accessToken) {
              // Set the session in Supabase
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (sessionError) {
                console.error('Session error:', sessionError);
                return { data: null, error: sessionError };
              }

              console.log('Session set successfully');
              return { data: sessionData, error: null };
            }
          }
        } else if (result.type === 'cancel') {
          return { data: null, error: { message: 'User cancelled authentication' } };
        }

        return { data: null, error: { message: 'Authentication failed' } };
      }

      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  }

  async signOut(): Promise<{ error: any }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return { session, error };
    } catch (error) {
      console.error('Get session error:', error);
      return { session: null, error };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();