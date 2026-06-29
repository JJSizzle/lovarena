import type { FriendConnectionType } from "@/lib/friends/connection-type";
import {
  genderLabel,
  type GenderIdentity,
} from "@/lib/profile-orientation";
import { isValidAge } from "@/lib/profile-age";
import { reputationTier } from "@/lib/reputation";
import { formatProfileLocation } from "@/lib/profile-location";

const MAX_BIO_LENGTH = 240;

export type FriendProfileView = {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  interests: string[];
  languages: string[];
  sharedInterests: string[];
  reputationScore: number;
  reputationTier: string;
  chatStreak: number;
  positiveRatings: number;
  ageVerified: boolean;
  memberSince: string;
  connectionType: FriendConnectionType | null;
};

type RawProfile = {
  id: string;
  username: string;
  age: number | null;
  show_age: boolean | null;
  age_verified: boolean | null;
  gender_identity: string | null;
  bio: string | null;
  interests: string[] | null;
  languages: string[] | null;
  avatar_url: string | null;
  avatar_emoji: string | null;
  reputation_score: number | null;
  chat_streak: number | null;
  positive_ratings: number | null;
  created_at: string;
  country_code: string | null;
  state_code: string | null;
};

export function formatMemberSince(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function buildFriendProfileView(
  profile: RawProfile,
  options: {
    connectionType: FriendConnectionType | null;
    viewerInterests?: string[];
  }
): FriendProfileView {
  const showAge = profile.show_age !== false;
  const age =
    showAge && isValidAge(profile.age) ? profile.age : null;

  const interests = (profile.interests ?? []).slice(0, 12);
  const viewerSet = new Set(
    (options.viewerInterests ?? []).map((t) => t.toLowerCase())
  );
  const sharedInterests = interests.filter((tag) =>
    viewerSet.has(tag.toLowerCase())
  );

  const bioRaw = profile.bio?.trim() ?? "";
  const bio = bioRaw
    ? bioRaw.length > MAX_BIO_LENGTH
      ? `${bioRaw.slice(0, MAX_BIO_LENGTH).trim()}…`
      : bioRaw
    : null;

  const rep = profile.reputation_score ?? 100;

  return {
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatar_url,
    avatarEmoji: profile.avatar_emoji ?? "😎",
    bio,
    age,
    gender: profile.gender_identity
      ? genderLabel(profile.gender_identity as GenderIdentity)
      : null,
    location: formatProfileLocation(profile.country_code, profile.state_code),
    interests,
    languages: (profile.languages ?? []).slice(0, 8),
    sharedInterests,
    reputationScore: rep,
    reputationTier: reputationTier(rep),
    chatStreak: profile.chat_streak ?? 0,
    positiveRatings: profile.positive_ratings ?? 0,
    ageVerified: profile.age_verified === true,
    memberSince: formatMemberSince(profile.created_at),
    connectionType: options.connectionType,
  };
}
