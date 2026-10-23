import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../../api/client';
import type { AuthResponse, AuthUser, Farm } from '../../types';

interface AuthState {
  user: AuthUser | null;
  farms: Farm[];
  farmId: number | null;
  setFarmId: (id: number) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshFarms: () => Promise<Farm[]>;
  loading: boolean;
}

const Ctx = createContext<AuthState | undefined>(undefined);

function storeSession(res: AuthResponse): AuthUser {
  localStorage.setItem('sf_token', res.accessToken);
  const user: AuthUser = {
    userId: res.userId, email: res.email, firstName: res.firstName, lastName: res.lastName, roles: res.roles,
  };
  localStorage.setItem('sf_user', JSON.stringify(user));
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('sf_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem('sf_farm');
    return raw ? Number(raw) : null;
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('sf_token'));

  const setFarmId = useCallback((id: number) => {
    localStorage.setItem('sf_farm', String(id));
    setFarmIdState(id);
  }, []);

  const refreshFarms = useCallback(async () => {
    const { data } = await api.get<Farm[]>('/farms');
    setFarms(data);
    setFarmIdState((current) => {
      const next = data.some((f) => f.id === current) ? current : data[0]?.id ?? null;
      if (next) localStorage.setItem('sf_farm', String(next));
      return next;
    });
    return data;
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    refreshFarms().catch(() => undefined).finally(() => setLoading(false));
  }, [user, refreshFarms]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    setUser(storeSession(data));
  }, []);

  const register = useCallback(async (firstName: string, lastName: string, email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/register', { firstName, lastName, email, password });
    setUser(storeSession(data));
  }, []);

  const logout = useCallback(() => {
    ['sf_token', 'sf_user', 'sf_farm'].forEach((k) => localStorage.removeItem(k));
    setUser(null);
    setFarms([]);
    setFarmIdState(null);
  }, []);

  const value = useMemo(
    () => ({ user, farms, farmId, setFarmId, login, register, logout, refreshFarms, loading }),
    [user, farms, farmId, setFarmId, login, register, logout, refreshFarms, loading],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
