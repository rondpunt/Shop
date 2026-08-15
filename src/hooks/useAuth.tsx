import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  provider: string | null;
};

type AuthContextValue = {
  updateTheme: (theme: "dark" | "light") => Promise<void>;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateTheme = async (theme: "dark" | "light") => {
    if (user) {
      await supabase.auth.updateUser({ data: { theme } });
    }
    localStorage.setItem("theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, email, provider")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data ?? null);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // Then check existing
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      // Apply user metadata theme if available
      const storedTheme = sess?.user?.user_metadata?.theme;
      if (storedTheme) {
        localStorage.setItem("theme", storedTheme);
        if (storedTheme === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
      
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile, updateTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
