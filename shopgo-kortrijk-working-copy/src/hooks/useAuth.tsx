import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

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
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateTheme = async (theme: "dark" | "light") => {
    if (session) {
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
    if (!clerkLoaded) return;
    let cancelled = false;

    const setThemeFromSession = (sess: Session | null) => {
      const storedTheme = sess?.user?.user_metadata?.theme;
      if (!storedTheme) return;
      localStorage.setItem("theme", storedTheme);
      document.documentElement.classList.toggle("dark", storedTheme === "dark");
    };

    const bridgeAccount = async () => {
      setLoading(true);
      if (!isSignedIn || !clerkUser) {
        if (isSupabaseConfigured) await supabase.auth.signOut({ scope: "local" });
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      if (!isSupabaseConfigured) {
        const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
        if (!cancelled) {
          setSession(null);
          setUser({
            id: clerkUser.id,
            email,
            user_metadata: {},
          } as User);
          setProfile({
            id: clerkUser.id,
            email,
            display_name: clerkUser.fullName || clerkUser.username || null,
            avatar_url: clerkUser.imageUrl || null,
            provider: "clerk",
          });
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch("/api/auth/bootstrap", {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.tokenHash) {
          throw new Error(payload.error || "Account kon niet worden voorbereid");
        }

        const { data, error } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: payload.tokenHash,
        });
        if (error || !data.session) throw error ?? new Error("Account-sessie kon niet worden gestart");
        if (cancelled) return;

        setSession(data.session);
        setUser(data.session.user);
        setThemeFromSession(data.session);
        await loadProfile(data.session.user.id);
      } catch (error) {
        console.error("Account bridge error:", error);
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bridgeAccount();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, clerkUser]);

  const signOut = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut({ scope: "local" });
    await clerkSignOut();
    setSession(null);
    setUser(null);
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
