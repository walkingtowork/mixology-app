import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../services/cocktailsApi';
import type { SignupDetails, User } from '../types/cocktails';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [returnAfterLogin, setReturnAfterLogin] = useState(true);

  useEffect(() => {
    api.fetchSession()
      .then(setUser)
      // Unreachable server: show the login page, whose own error says what went wrong.
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // A 401 on any request means the session ended (it lasts two weeks); RequireAuth then
  // sends the user to the login page and back to where they were.
  useEffect(() => {
    api.setUnauthorizedHandler(() => setUser(null));
    return () => api.setUnauthorizedHandler(() => {});
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setUser(await api.login(identifier, password));
    setReturnAfterLogin(true);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    // Set together with the user, so the guard's redirect already knows not to remember
    // this page. Navigating here instead would race the guard: router navigations are
    // low-priority transitions and the guard would redirect first.
    setReturnAfterLogin(false);
    setUser(null);
  }, []);

  const signup = useCallback(async (token: string, details: SignupDetails) => {
    setUser(await api.signup(token, details));
    setReturnAfterLogin(true);
  }, []);

  const value = useMemo(
    () => ({ user, loading, returnAfterLogin, login, logout, signup }),
    [user, loading, returnAfterLogin, login, logout, signup],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
