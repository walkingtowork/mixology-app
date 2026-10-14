import { createContext, useContext } from 'react';
import type { User } from '../types/cocktails';

export interface AuthState {
  /** The signed-in user, or null. Meaningless while `loading` is true. */
  user: User | null;
  /** True until the first "who am I" answer arrives. */
  loading: boolean;
  /** Rejects with a message fit to show the person signing in. */
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>');
  return auth;
}
