import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ApiUser, LoginInput } from "@launchpad/shared";
import { fetchMe, login, tokenStore } from "../api/client";

type AuthContextValue = {
  user: ApiUser | null;
  isBootstrapping: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setIsBootstrapping(false);
      return;
    }

    fetchMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setIsBootstrapping(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isBootstrapping,
      signIn: async (input) => {
        const session = await login(input);
        tokenStore.set(session.token);
        setUser(session.user);
      },
      signOut: () => {
        tokenStore.clear();
        setUser(null);
      }
    }),
    [isBootstrapping, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
