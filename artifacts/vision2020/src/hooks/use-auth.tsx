import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { CurrentUser } from "@workspace/api-client-react/src/generated/api.schemas";

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: CurrentUser, mustChangePassword?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("vision2020_token"));
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isMeLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      localStorage.removeItem("vision2020_token");
      setToken(null);
    }
  }, [error]);

  const login = (newToken: string, newUser: CurrentUser, mustChangePassword?: boolean) => {
    localStorage.setItem("vision2020_token", newToken);
    setToken(newToken);

    if (mustChangePassword && newUser.userType !== "participant") {
      setLocation("/staff/change-password");
      return;
    }

    // Route by role
    switch (newUser.userType) {
      case "admin":
        setLocation("/admin/dashboard");
        break;
      case "track_coordinator":
        setLocation("/track/dashboard");
        break;
      case "food_coordinator":
        setLocation("/food/dashboard");
        break;
      case "scientific_committee":
        setLocation("/scientific/dashboard");
        break;
      default:
        setLocation("/participant/dashboard");
    }
  };

  const logout = () => {
    localStorage.removeItem("vision2020_token");
    setToken(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, token, isLoading: !!token && isMeLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
