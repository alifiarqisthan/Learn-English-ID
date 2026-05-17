import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type AuthUser, getStoredUser, storeUser, clearUser, api } from "../api";

type AuthContextValue = {
  user: AuthUser | null;
  login: (name: string, pin: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { setLoading(false); return; }
    // Verify the stored userId is still valid
    api.getMe()
      .then((me) => { setUser(me); })
      .catch(() => { clearUser(); })
      .finally(() => setLoading(false));
  }, []);

  async function login(name: string, pin: string) {
    const result = await api.login(name, pin);
    const authUser: AuthUser = { id: result.id, name: result.name };
    storeUser(authUser);
    setUser(authUser);
  }

  function logout() {
    clearUser();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
