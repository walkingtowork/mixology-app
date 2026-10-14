import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/cocktailsApi';
import type { User } from '../types/cocktails';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    // Navigate first, in the same render: signing out deliberately should land on a plain
    // login page, not one that returns the next person to this user's last screen.
    navigate('/login', { replace: true });
    setUser(null);
  }, [navigate]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
