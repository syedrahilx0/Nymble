import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearJwt, getJwt, setJwt, tokenStore } from '../lib/api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getJwt()));

  useEffect(() => {
    if (!getJwt()) return;
    api('/auth/me').then((r) => setUser(r.user)).catch(() => clearJwt()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => { clearJwt(); setUser(null); };
    window.addEventListener('nymble:logout', onLogout);
    return () => window.removeEventListener('nymble:logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    setJwt(r.token); setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (body) => {
    const r = await api('/auth/register', { method: 'POST', body });
    setJwt(r.token);
    tokenStore.set(r.user.id, r.nymbleToken);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => { clearJwt(); setUser(null); }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
