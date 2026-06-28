"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAgeVerified, syncProfileAgeVerified } from "@/lib/age-gate";
import type { GenderIdentity, LookingFor } from "@/lib/profile-orientation";

export type Profile = {
  id: string;
  username: string;
  username_change_count: number;
  age: number | null;
  show_age: boolean;
  age_verified: boolean;
  is_admin: boolean;
  gender_identity: GenderIdentity | null;
  looking_for: LookingFor | null;
  bio: string | null;
  interests: string[];
  languages: string[];
  avatar_url: string | null;
  avatar_emoji: string | null;
  reputation_score: number;
  referral_code: string | null;
  notifications_enabled: boolean;
  face_blur_default: boolean;
  voice_only_default: boolean;
  chat_streak: number;
  positive_ratings: number;
  qualified_referrals: number;
  referred_by: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  const refreshProfile = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    setUser(authUser ?? null);

    if (!authUser) {
      setProfile(null);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select(
        "id, username, username_change_count, age, show_age, age_verified, is_admin, gender_identity, looking_for, bio, interests, languages, avatar_url, avatar_emoji, reputation_score, referral_code, notifications_enabled, face_blur_default, voice_only_default, chat_streak, positive_ratings, qualified_referrals, referred_by, created_at"
      )
      .eq("id", authUser.id)
      .maybeSingle();

    if (data && !data.age_verified && isAgeVerified()) {
      const synced = await syncProfileAgeVerified();
      if (synced) {
        setProfile({ ...data, age_verified: true });
        return;
      }
    }

    setProfile(data ?? null);
  }, [supabase]);

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshProfile();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, [supabase]);

  const value = useMemo(
    () => ({ user, profile, loading, refreshProfile, signOut }),
    [user, profile, loading, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
