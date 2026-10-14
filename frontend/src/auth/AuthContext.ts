import { createContext, useContext } from 'react';
import type { SignupDetails, User } from '../types/cocktails';

export interface AuthState {
  /** The signed-in user, or null. Meaningless while `loading` is true. */
  user: User | null;
  /** True until the first "who am I" answer arrives. */
  loading: boolean;
  /**
   * Whether the login page should send the next person back to the page they were on.
   * True when a guard or an expired session sent them there; false after a deliberate
   * log out, which should not hand the next user the previous one's last screen.
   */
  returnAfterLogin: boolean;
  /** Rejects with a message fit to show the person signing in. */
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Uses an invite to create an account and sign it in. Rejects with a message to show. */
  signup: (token: string, details: SignupDetails) => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
