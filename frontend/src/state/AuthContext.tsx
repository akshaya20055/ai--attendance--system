import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type Role, type User } from '../lib/api';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(localStorage.getItem('ai-attendance-token'));
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('ai-attendance-token');
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(email: string, password: string, role: Role) {
    const res = await api.post('/auth/login', { email, password, role });
    localStorage.setItem('ai-attendance-token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still succeed if the server is unreachable.
    }
    localStorage.removeItem('ai-attendance-token');
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
