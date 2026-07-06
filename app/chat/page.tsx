"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getMatchPrefs,
  getMatchRequestBody,
  formatRegionalBadge,
  expandRegionalToCountry,
} from "@/lib/match-prefs";
import { randomIceBreaker } from "@/lib/ice-breakers";
import { useWebRTC } from "@/lib/webrtc/useWebRTC";
import {
  acquireLocalMedia,
  mediaErrorMessage,
} from "@/lib/webrtc/media-constraints";
import { VideoPanel } from "./video-panel";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { FriendsPanel } from "@/components/FriendsPanel";
import { SafetyActions } from "@/components/SafetyActions";
import { MediaPermissionGate } from "@/components/MediaPermissionGate";
import { MatchingWaitScreen } from "@/components/MatchingWaitScreen";
import { RestrictionPanel } from "@/components/RestrictionPanel";
import { FriendProfileSheet } from "@/components/FriendProfileSheet";
import { OnboardingTour } from "@/components/OnboardingTour";
import { markFirstChatComplete } from "@/lib/install-prompt";
import { matchPollIntervalMs } from "@/lib/reputation-gating";
import dynamic from "next/dynamic";

const LazyChatParticles = dynamic(
  () =>
    import("@/components/AdaptiveParticleBackground").then((m) => ({
      default: m.AdaptiveParticleBackground,
    })),
  { ssr: false }
);
import { MatchCountdown } from "@/components/MatchCountdown";
import { ConnectionCardOverlay } from "@/components/ConnectionCardOverlay";
import { MutualConnectCelebration } from "@/components/MutualConnectCelebration";
import { PostChatFeedback } from "@/components/PostChatFeedback";
import { RulesReminder } from "@/components/RulesReminder";
import { TranslatedMessageBubble } from "@/components/TranslatedMessageBubble";
import { TranslateToolbar } from "@/components/TranslateToolbar";
import { AppModal } from "@/components/AppModal";
import { AppQuickNav } from "@/components/AppQuickNav";
import { isOnboardingComplete } from "@/lib/profile-orientation";
import { formatPartnerLine } from "@/lib/profile-age";
import {
  allowsFriendRequests,
  allowsMutualSpark,
} from "@/lib/social-privacy";
import { isAgeVerified, syncProfileAgeVerified } from "@/lib/age-gate";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { useMatchCelebration } from "@/lib/hooks/useMatchCelebration";
import { useScrollOnNewMessage } from "@/lib/hooks/useScrollOnNewMessage";
import { countryCodeToFlag } from "@/lib/flags";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { chatBtnLove, chatBtnSend, chatBtnFun, chatBtnGhost, chatBtnFriend } from "@/lib/chat-buttons";
import type { FriendLinkStatus } from "@/lib/friends/friend-link-status";
import type { FriendConnectionType } from "@/lib/friends/connection-type";
import type { FriendProfileView } from "@/lib/friends/friend-profile-view";
import { beaconLeaveChat } from "@/lib/chat-leave-beacon";

const turnstileSiteKey =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type Message = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

function appendMessage(list: Message[], msg: Message): Message[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

export default function ChatPage() {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const userId = profile?.id ?? "";
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "matching" | "connected" | "disconnected" | "restricted" | "idle"
  >("matching");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loadingNext, setLoadingNext] = useState(false);
  const [cancellingWait, setCancellingWait] = useState(false);
  const [expandingRegion, setExpandingRegion] = useState(false);
  const [matchScopeKey, setMatchScopeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showIceBreakerPopup, setShowIceBreakerPopup] = useState(false);
  const [iceBreakerQuestion, setIceBreakerQuestion] = useState("");
  const [friendId, setFriendId] = useState<string | null>(null);
  const [friendUsername, setFriendUsername] = useState("");
  const [connectNotice, setConnectNotice] = useState<string | null>(null);
  const [youClickedConnect, setYouClickedConnect] = useState(false);
  const [partnerClickedConnect, setPartnerClickedConnect] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [chatFriendStatus, setChatFriendStatus] =
    useState<FriendLinkStatus>("none");
  const [chatConnectionType, setChatConnectionType] =
    useState<FriendConnectionType | null>(null);
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);
  const [showMutualConnectCelebration, setShowMutualConnectCelebration] =
    useState(false);
  const [matchCaptchaBlocked, setMatchCaptchaBlocked] = useState(false);
  const [matchCaptchaToken, setMatchCaptchaToken] = useState("");
  const matchTurnstileTokenRef = useRef("");
  const mutualSparkCelebratedRef = useRef(false);
  const [bothRevealed, setBothRevealed] = useState(false);
  const [partnerProfileOpen, setPartnerProfileOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerLabel, setPartnerLabel] = useState<string | null>(null);
  const [partnerSafetyLabel, setPartnerSafetyLabel] = useState<string | null>(
    null
  );
  const [partnerSafetyTone, setPartnerSafetyTone] = useState<
    "green" | "amber" | "sky" | "violet" | null
  >(null);
  const [partnerAllowsFriendRequests, setPartnerAllowsFriendRequests] =
    useState(true);
  const [partnerAllowsMutualSpark, setPartnerAllowsMutualSpark] = useState(true);
  const [sharedTags, setSharedTags] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRoomId, setFeedbackRoomId] = useState<string | null>(null);
  const [feedbackPartnerId, setFeedbackPartnerId] = useState<string | null>(null);
  const [pendingNext, setPendingNext] = useState(false);
  const [endedBySelf, setEndedBySelf] = useState(false);
  const [mediaMode, setMediaMode] = useState<"pending" | "granted" | "text-only">(
    "pending"
  );
  const [mediaEnabling, setMediaEnabling] = useState(false);
  const [mediaGateError, setMediaGateError] = useState<string | null>(null);
  const prefetchedMediaRef = useRef<MediaStream | null>(null);
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const bottomRef = useScrollOnNewMessage(messages, roomId);
  const roomIdRef = useRef(roomId);
  const statusRef = useRef(status);
  roomIdRef.current = roomId;
  statusRef.current = status;

  const openMutualConnectCelebration = useCallback(() => {
    if (mutualSparkCelebratedRef.current) return;
    mutualSparkCelebratedRef.current = true;
    setShowMutualConnectCelebration(true);
  }, []);

  const videoBlurred = profile?.face_blur_default ?? true;
  const voiceOnly = profile?.voice_only_default ?? false;
  const seasonal = getSeasonalTheme();

  const {
    countdown,
    showCard,
    cardData,
    dismissCard,
    celebrate,
    resetCelebration,
    playMessageSound,
    playNextSound,
  } = useMatchCelebration();

  const partnerTyping = useTypingIndicator(
    roomId ? `typing:${roomId}` : null,
    userId,
    input,
    status === "connected"
  );

  const webrtcActive =
    status === "connected" &&
    !!roomId &&
    !!userId &&
    mediaMode === "granted";
  const {
    attachLocalVideo,
    remoteVideoRef,
    mediaError,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    stopMedia,
    connectionState,
  } = useWebRTC(roomId, userId, webrtcActive, voiceOnly, prefetchedMediaRef);

  const handleEnableMedia = useCallback(async () => {
    setMediaGateError(null);
    setMediaEnabling(true);
    try {
      prefetchedMediaRef.current?.getTracks().forEach((t) => t.stop());
      prefetchedMediaRef.current = await acquireLocalMedia(voiceOnly);
      setMediaMode("granted");
    } catch (err) {
      prefetchedMediaRef.current = null;
      setMediaGateError(mediaErrorMessage(err));
    } finally {
      setMediaEnabling(false);
    }
  }, [voiceOnly]);

  useEffect(() => {
    if (status === "connected" && roomId) {
      markFirstChatComplete();
      celebrate(roomId);
      fetch(`/api/room/partner?roomId=${encodeURIComponent(roomId)}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.partnerId) setPartnerId(d.partnerId);
          if (d.sharedTags) setSharedTags(d.sharedTags);
          if (d.friendStatus) setChatFriendStatus(d.friendStatus);
          if (d.connectionType) setChatConnectionType(d.connectionType);
          if (d.partnerUsername) {
            setPartnerLabel(
              formatPartnerLine(d.partnerUsername, d.partnerAge, true)
            );
            setFriendUsername(d.partnerUsername);
          }
          if (typeof d.partnerAllowsFriendRequests === "boolean") {
            setPartnerAllowsFriendRequests(d.partnerAllowsFriendRequests);
          }
          if (typeof d.partnerAllowsMutualSpark === "boolean") {
            setPartnerAllowsMutualSpark(d.partnerAllowsMutualSpark);
          }
          if (d.safetyLabel) setPartnerSafetyLabel(d.safetyLabel);
          if (d.safetyTone) setPartnerSafetyTone(d.safetyTone);
        })
        .catch(() => {});
    }
  }, [status, roomId, celebrate]);

  useEffect(() => {
    if (status === "matching") {
      resetCelebration();
      setPartnerId(null);
      setPartnerLabel(null);
      setPartnerSafetyLabel(null);
      setPartnerSafetyTone(null);
      setPartnerAllowsFriendRequests(true);
      setPartnerAllowsMutualSpark(true);
      setSharedTags([]);
      setChatFriendStatus("none");
      setChatConnectionType(null);
      setYouClickedConnect(false);
      setPartnerClickedConnect(false);
      setConnectNotice(null);
      resetCelebration();
      mutualSparkCelebratedRef.current = false;
      setShowMutualConnectCelebration(false);
    }
  }, [status, resetCelebration]);

  const matchPrefs = getMatchPrefs();
  const roomBadge =
    matchPrefs.matchMode === "regional"
      ? formatRegionalBadge(matchPrefs.countryCode, matchPrefs.stateCode)
      : "GLOBAL ROOM";

  function buildMatchPayload(extra?: Record<string, unknown>) {
    const body = { ...getMatchRequestBody(), ...extra };
    const token = matchTurnstileTokenRef.current;
    if (matchCaptchaBlocked && token) {
      return { ...body, turnstileToken: token };
    }
    return body;
  }

  function handleMatchCaptchaToken(token: string) {
    matchTurnstileTokenRef.current = token;
    setMatchCaptchaToken(token);
    if (token) {
      setError(null);
      setMatchScopeKey((k) => k + 1);
    }
  }

  useEffect(() => {
    if (!profile?.id) return;

    fetch("/api/match/captcha-status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.required && !d.satisfied) {
          setMatchCaptchaBlocked(true);
        } else {
          setMatchCaptchaBlocked(false);
        }
      })
      .catch(() => {});
  }, [profile?.id, profile?.created_at]);

  useEffect(() => {
    if (!profile) return;
    setPrimaryLanguage(profile.primary_language ?? "English");
    setAutoTranslate(profile.auto_translate ?? false);
  }, [profile?.primary_language, profile?.auto_translate, profile]);

  async function saveTranslationPrefs(
    updates: Partial<{ primary_language: string; auto_translate: boolean }>
  ) {
    const prevLanguage = primaryLanguage;
    const prevAutoTranslate = autoTranslate;

    if (updates.primary_language != null) {
      setPrimaryLanguage(updates.primary_language);
    }
    if (updates.auto_translate != null) {
      setAutoTranslate(updates.auto_translate);
    }
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Save failed");
      await refreshProfile();
    } catch {
      setPrimaryLanguage(prevLanguage);
      setAutoTranslate(prevAutoTranslate);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/chat");
      return;
    }
    if (profile && !isOnboardingComplete(profile)) {
      router.replace("/onboarding?next=/chat");
      return;
    }
    if (user && profile && !profile.age_verified) {
      if (isAgeVerified()) {
        void (async () => {
          const synced = await syncProfileAgeVerified();
          if (synced) {
            await refreshProfile();
            setError(null);
          } else {
            setError(
              "Age verification did not save. Go to the home page, confirm 18+ again, then refresh."
            );
          }
        })();
        return;
      }
      setError(
        "Confirm you are 18+ on the age verification screen first, then return to chat."
      );
    }
  }, [authLoading, user, profile, router, refreshProfile]);

  useEffect(() => {
    if (!userId) return;

    const intervalMs =
      status === "connected" ? 8_000 : status === "matching" ? 15_000 : 30_000;

    async function pingPresence() {
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inQueue: status === "matching",
            inChat: status === "connected",
          }),
        });
      } catch {
        // ignore
      }
    }

    pingPresence();
    const interval = setInterval(pingPresence, intervalMs);
    return () => clearInterval(interval);
  }, [userId, status]);

  useEffect(() => {
    function leaveOnExit() {
      const id = roomIdRef.current;
      const currentStatus = statusRef.current;
      if (currentStatus !== "connected" && currentStatus !== "matching") return;
      beaconLeaveChat(id);
    }

    window.addEventListener("pagehide", leaveOnExit);
    return () => {
      window.removeEventListener("pagehide", leaveOnExit);
      leaveOnExit();
    };
  }, []);

  useEffect(() => {
    if (!roomId || status !== "connected" || !videoBlurred) {
      setBothRevealed(false);
      return;
    }

    async function checkConsent() {
      try {
        const res = await fetch(
          `/api/video-consent?roomId=${encodeURIComponent(roomId!)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) setBothRevealed(Boolean(data.bothRevealed));
      } catch {
        // ignore
      }
    }

    checkConsent();
    const interval = setInterval(checkConsent, 3000);
    return () => clearInterval(interval);
  }, [roomId, status, videoBlurred]);

  async function handleRevealVideo() {
    if (!roomId) return;
    const res = await fetch("/api/video-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId }),
    });
    const data = await res.json();
    if (res.ok) setBothRevealed(Boolean(data.bothRevealed));
  }

  const refreshConnectStatus = useCallback(async () => {
    if (!roomId || !userId) return;

    try {
      const res = await fetch(
        `/api/friends/connect?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) return;

      setYouClickedConnect(data.youClicked);
      setPartnerClickedConnect(Boolean(data.partnerClicked));
      if (data.friendStatus) {
        setChatFriendStatus(data.friendStatus as FriendLinkStatus);
      }
      if (data.connectionType) {
        setChatConnectionType(data.connectionType as FriendConnectionType);
      }
      if (data.mutualSpark && data.partnerProfileId) {
        setFriendId(data.partnerProfileId);
        if (data.partnerUsername) {
          setFriendUsername(data.partnerUsername);
        }
        setChatFriendStatus("friends");
        openMutualConnectCelebration();
      }
    } catch {
      // retry on next poll
    }
  }, [roomId, userId, openMutualConnectCelebration]);

  useEffect(() => {
    if (!roomId || status !== "connected" || !userId) return;

    refreshConnectStatus();
    const interval = setInterval(refreshConnectStatus, 2000);

    const supabase = createClient();
    const channel = supabase
      .channel(`connect:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_connect_clicks",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refreshConnectStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [roomId, status, userId, refreshConnectStatus]);

  useEffect(() => {
    if (!userId || authLoading || !profile?.age_verified) return;
    if (status !== "matching") return;
    if (matchCaptchaBlocked && !matchCaptchaToken) return;

    let cancelled = false;

    async function tryMatch() {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildMatchPayload()),
          cache: "no-store",
        });
        const text = await res.text();
        if (cancelled) return;

        if (!text) {
          setError(
            "Server returned empty response. Restart npm run dev, or redeploy on Vercel if this is lovarena.app."
          );
          return;
        }

        const data = JSON.parse(text);
        if (!res.ok || data.error) {
          if (data.needsAuth) {
            router.replace("/login?next=/chat");
            return;
          }
          if (data.needsCaptcha) {
            setMatchCaptchaBlocked(true);
            matchTurnstileTokenRef.current = "";
            setMatchCaptchaToken("");
          }
          if (data.flagged) {
            setStatus("restricted");
            clearInterval(interval);
          }
          setError(data.error ?? `Match failed (${res.status})`);
          return;
        }

        setError(null);
        setMatchCaptchaBlocked(false);
        if (data.roomId) {
          setEndedBySelf(false);
          setRoomId(data.roomId);
          setStatus("connected");
          clearInterval(interval);
        }
      } catch {
        if (!cancelled) setError("Could not reach /api/match. Is npm run dev running?");
      }
    }

    void tryMatch();
    const pollMs = matchPollIntervalMs(profile?.reputation_score ?? 100);
    const interval = setInterval(tryMatch, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, authLoading, profile?.age_verified, profile?.reputation_score, status, router, matchScopeKey, matchCaptchaBlocked, matchCaptchaToken]);

  async function handleExpandRegion() {
    if (status !== "matching" || expandingRegion) return;
    setExpandingRegion(true);
    setError(null);
    expandRegionalToCountry();
    setMatchScopeKey((k) => k + 1);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildMatchPayload()),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not expand search");
        return;
      }
      if (data.roomId) {
        setEndedBySelf(false);
        setRoomId(data.roomId);
        setStatus("connected");
      }
    } catch {
      setError("Could not expand search. Try again.");
    } finally {
      setExpandingRegion(false);
    }
  }

  useEffect(() => {
    if (!roomId) return;

    setMessages([]);

    const supabase = createClient();

    async function loadMessages() {
      try {
        const res = await fetch(`/api/messages?roomId=${roomId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages((prev) => {
            let next = prev;
            for (const msg of data.messages as Message[]) {
              next = appendMessage(next, msg);
            }
            return next === prev ? prev : next;
          });
        }
      } catch {
        // polling will retry
      }
    }

    loadMessages();
    const poll = setInterval(loadMessages, 2000);

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => appendMessage(prev, msg));
          if (msg.sender_id !== userId) playMessageSound();
        }
      )
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, playMessageSound]);

  useEffect(() => {
    setMediaMode("pending");
    setMediaGateError(null);
    prefetchedMediaRef.current?.getTracks().forEach((t) => t.stop());
    prefetchedMediaRef.current = null;
  }, [roomId]);

  useEffect(() => {
    if (!roomId || status !== "connected") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`room-status:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row.status === "ended") {
            stopMedia();
            setEndedBySelf(false);
            setStatus("disconnected");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, status, stopMedia]);

  useEffect(() => {
    if (!roomId || status !== "connected") return;

    async function checkRoom() {
      try {
        const res = await fetch(`/api/room?roomId=${roomId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.status === "ended") {
          stopMedia();
          setEndedBySelf(false);
          setStatus("disconnected");
        }
      } catch {
        // retry on next poll
      }
    }

    checkRoom();
    const interval = setInterval(checkRoom, 2000);
    return () => clearInterval(interval);
  }, [roomId, status, stopMedia]);

  useEffect(() => {
    if (status !== "connected" || !roomId) return;
    if (connectionState !== "disconnected" && connectionState !== "failed") {
      return;
    }

    const disconnectGraceMs =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
        ? 8000
        : 3000;

    const timer = setTimeout(() => {
      if (statusRef.current !== "connected") return;
      stopMedia();
      setEndedBySelf(false);
      setStatus("disconnected");
    }, disconnectGraceMs);

    return () => clearTimeout(timer);
  }, [connectionState, status, roomId, stopMedia]);

  useEffect(() => {
    if (status !== "disconnected") return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [status, endedBySelf, bottomRef]);

  async function handleCancelMatching() {
    if (status !== "matching" || cancellingWait) return;
    setCancellingWait(true);
    try {
      await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setError(null);
      setStatus("idle");
    } catch {
      setError("Could not leave the queue. Try again.");
    } finally {
      setCancellingWait(false);
    }
  }

  function handleResumeMatching() {
    setError(null);
    setMessages([]);
    setRoomId(null);
    setPartnerId(null);
    setStatus("matching");
  }

  async function handleStop() {
    if (!userId || status !== "connected" || !roomId) return;

    const currentRoomId = roomId;
    stopMedia();
    setMessages([]);
    setRoomId(null);
    setPartnerId(null);
    setPartnerLabel(null);
    setPartnerSafetyLabel(null);
    setPartnerSafetyTone(null);
    setSharedTags([]);
    setChatFriendStatus("none");
    setChatConnectionType(null);
    setYouClickedConnect(false);
    setPartnerClickedConnect(false);
    setConnectNotice(null);
    resetCelebration();
    mutualSparkCelebratedRef.current = false;
    setEndedBySelf(true);
    setStatus("disconnected");

    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: currentRoomId }),
      });
      const data = await res.json();
      if (data.referralReward?.message) {
        setConnectNotice(data.referralReward.message);
        void refreshProfile();
      }
    } catch {
      // local UI already ended the chat
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !roomId || !userId) return;

    const text = input.trim();
    setInput("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, content: text }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        if (data.violation && data.sessionTerminated) {
          stopMedia();
          setStatus("restricted");
          setRoomId(null);
          setError(data.error);
          return;
        }
        setError(data.error ?? "Failed to send message");
        setInput(text);
        return;
      }

      if (data.message) {
        setMessages((prev) => appendMessage(prev, data.message as Message));
        if (data.message.sender_id !== userId) playMessageSound();
      }
    } catch {
      setError("Failed to send message. Check npm run dev.");
      setInput(text);
    }
  }

  function promptFeedback(prevRoomId: string | null, prevPartnerId: string | null) {
    if (prevRoomId && prevPartnerId) {
      setFeedbackRoomId(prevRoomId);
      setFeedbackPartnerId(prevPartnerId);
      setShowFeedback(true);
      setPendingNext(true);
      return true;
    }
    return false;
  }

  async function handleNext() {
    if (!userId || loadingNext) return;
    if (showFeedback) return;

    if (roomId && partnerId && promptFeedback(roomId, partnerId)) {
      return;
    }

    await doNext();
  }

  async function doNext() {
    if (!userId || loadingNext) return;
    playNextSound();
    stopMedia();
    setLoadingNext(true);
    setMessages([]);
    setEndedBySelf(false);
    const previousRoomId = roomId;
    setRoomId(null);
    setPartnerId(null);
    setSharedTags([]);
    resetCelebration();
    setStatus("matching");

    const res = await fetch("/api/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: previousRoomId,
        ...getMatchRequestBody(),
      }),
    });
    const data = await res.json();

    if (data.referralReward?.message) {
      setConnectNotice(data.referralReward.message);
      void refreshProfile();
    }

    if (data.roomId) {
      setRoomId(data.roomId);
      setStatus("connected");
      setLoadingNext(false);
      return;
    }

    setLoadingNext(false);
  }

  function generateIceBreaker() {
    setIceBreakerQuestion(randomIceBreaker());
    setShowIceBreakerPopup(true);
  }

  function useIceBreakerQuestion() {
    setInput(iceBreakerQuestion);
    setShowIceBreakerPopup(false);
  }

  async function handleConnect() {
    if (!roomId || !userId) return;

    if (!user) {
      router.push("/login?next=/chat");
      return;
    }

    setConnectLoading(true);
    setConnectNotice(null);

    try {
      const res = await fetch("/api/friends/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();

      if (data.needsAuth || res.status === 401) {
        router.push("/login?next=/chat");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Could not connect");
        return;
      }

      setYouClickedConnect(true);

      if (
        data.error &&
        data.youClicked &&
        data.partnerClicked &&
        !data.matched
      ) {
        setConnectNotice(data.error);
        return;
      }

      if (data.matched && data.connectionType === "mutual_connect") {
        setChatConnectionType("mutual_connect");
        setChatFriendStatus("friends");
        setFriendId(data.partnerProfileId);
        setFriendUsername(data.partnerUsername ?? "Friend");
        openMutualConnectCelebration();
      } else if (data.friendStatus === "friends") {
        setChatFriendStatus("friends");
        setChatConnectionType(
          (data.connectionType as FriendConnectionType | undefined) ??
            "mutual_connect"
        );
        if (data.partnerProfileId) setFriendId(data.partnerProfileId);
        if (data.partnerUsername) setFriendUsername(data.partnerUsername);
        openMutualConnectCelebration();
      } else if (data.waitingForPartner) {
        setConnectNotice("Waiting for them to feel the spark too…");
      }
    } catch {
      setError("Connect failed. Try again.");
    } finally {
      setConnectLoading(false);
    }
  }

  async function handleFriendRequest(accept = false) {
    if (!partnerId) return;

    setFriendRequestLoading(true);
    setConnectNotice(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendId: partnerId,
          ...(accept ? { action: "accept" } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Friend request failed");
        return;
      }

      const nextStatus = (data.friendStatus ?? chatFriendStatus) as FriendLinkStatus;
      setChatFriendStatus(nextStatus);

      if (nextStatus === "friends") {
        setChatConnectionType(
          (data.connectionType as FriendConnectionType | undefined) ?? "request"
        );
        setFriendId(partnerId);
        setConnectNotice(data.message ?? "You are now friends!");
      } else {
        setConnectNotice(data.message ?? "Friend request sent.");
      }
      setTimeout(() => setConnectNotice(null), 5000);
    } catch {
      setError("Friend request failed. Try again.");
    } finally {
      setFriendRequestLoading(false);
    }
  }

  async function handleCancelFriendRequest() {
    if (!partnerId) return;

    setFriendRequestLoading(true);
    setConnectNotice(null);

    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId: partnerId, action: "cancel" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not cancel request");
        return;
      }

      setChatFriendStatus("none");
      setConnectNotice(data.message ?? "Request cancelled.");
      setTimeout(() => setConnectNotice(null), 4000);
    } catch {
      setError("Could not cancel request.");
    } finally {
      setFriendRequestLoading(false);
    }
  }

  async function handleRemovePartnerFriend(profile: FriendProfileView) {
    const ok = await confirm({
      title: "Remove friend?",
      message: `Remove ${profile.username} from your friends? You can add them again from a future match.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;

    const res = await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: profile.id }),
    });
    const data = await res.json();

    if (res.ok) {
      setPartnerProfileOpen(false);
      setChatFriendStatus("none");
      setChatConnectionType(null);
      setConnectNotice(data.message ?? "Removed from friends.");
      setTimeout(() => setConnectNotice(null), 4000);
    } else {
      setError(data.error ?? "Remove failed");
    }
  }

  async function handleBlockPartner(profile: FriendProfileView) {
    const ok = await confirm({
      title: "Block user?",
      message: `Block ${profile.username}? They won't be matched with you again.`,
      confirmLabel: "Block",
      variant: "danger",
    });
    if (!ok) return;

    const res = await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: profile.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Block failed");
      return;
    }

    setPartnerProfileOpen(false);
    stopMedia();
    setRoomId(null);
    setEndedBySelf(false);
    setStatus("disconnected");
    setError(`${profile.username} blocked. Press Next for a new match.`);
  }

  function renderSparkButton() {
    const selfAllowsSpark = allowsMutualSpark(profile?.allow_mutual_spark);

    if (chatConnectionType === "mutual_connect") {
      return (
        <span className="text-xs font-semibold text-pink-200 px-2 py-1.5">
          Mutual spark ✨
        </span>
      );
    }
    if (!selfAllowsSpark) {
      return (
        <span className="text-[10px] text-slate-500 px-2 py-1.5 text-center leading-snug">
          Spark off in{" "}
          <Link href="/settings" className="text-fuchsia-400 hover:text-fuchsia-300">
            Settings
          </Link>
        </span>
      );
    }
    if (!partnerAllowsMutualSpark) {
      return (
        <span className="text-[10px] text-slate-500 px-2 py-1.5 text-center leading-snug">
          Not accepting sparks
        </span>
      );
    }
    if (youClickedConnect && partnerClickedConnect) {
      return (
        <span className="text-xs font-semibold text-pink-200/80 px-2 py-1.5">
          Spark matched…
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={connectLoading}
        className={chatBtnLove}
      >
        {connectLoading
          ? "…"
          : youClickedConnect
            ? "Waiting for their spark…"
            : "Feel the spark"}
      </button>
    );
  }

  function renderFriendRequestButton() {
    const selfAllowsRequests = allowsFriendRequests(
      profile?.allow_friend_requests
    );

    if (chatFriendStatus === "friends") {
      if (chatConnectionType === "mutual_connect") {
        return (
          <span className="text-[10px] text-pink-300 px-2 py-1.5">
            Mutual spark — you&apos;re connected
          </span>
        );
      }
      return (
        <span className="text-[10px] text-purple-300 px-2 py-1.5">
          Friends — message anytime
        </span>
      );
    }
    if (chatFriendStatus === "pending_sent") {
      return (
        <button
          type="button"
          onClick={handleCancelFriendRequest}
          disabled={friendRequestLoading}
          className={chatBtnGhost}
        >
          {friendRequestLoading ? "…" : "Cancel request"}
        </button>
      );
    }
    if (chatFriendStatus === "pending_received") {
      return (
        <button
          type="button"
          onClick={() => handleFriendRequest(true)}
          disabled={friendRequestLoading}
          className={chatBtnFriend}
        >
          {friendRequestLoading ? "…" : "Accept request"}
        </button>
      );
    }
    if (!selfAllowsRequests) {
      return (
        <span className="text-[10px] text-slate-500 px-2 py-1.5 text-center leading-snug">
          Requests off in{" "}
          <Link href="/settings" className="text-fuchsia-400 hover:text-fuchsia-300">
            Settings
          </Link>
        </span>
      );
    }
    if (!partnerAllowsFriendRequests) {
      return (
        <span className="text-[10px] text-slate-500 px-2 py-1.5 text-center leading-snug">
          Not accepting requests
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleFriendRequest(false)}
        disabled={friendRequestLoading || !partnerId}
        className={chatBtnFriend}
      >
        {friendRequestLoading ? "…" : "Add friend"}
      </button>
    );
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row w-full bg-gradient-to-br ${seasonal.gradient} text-white relative`}>
    <LazyChatParticles />
    <main className="flex-1 flex flex-col min-w-0 w-full max-w-4xl mx-auto lg:mx-0 relative z-[1] pb-safe">
      <MediaPermissionGate
        visible={status === "connected" && !!roomId && mediaMode === "pending"}
        voiceOnly={voiceOnly}
        loading={mediaEnabling}
        error={mediaGateError}
        onEnable={handleEnableMedia}
        onTextOnly={() => setMediaMode("text-only")}
      />
      {status === "connected" && mediaMode === "text-only" && !voiceOnly && (
        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => void handleEnableMedia()}
            disabled={mediaEnabling}
            className="w-full max-w-4xl mx-auto block rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-60"
          >
            {mediaEnabling ? "Opening camera…" : "Enable camera & microphone"}
          </button>
        </div>
      )}
      <header className="grid grid-cols-[auto_1fr_auto] items-center px-3 sm:px-4 py-3 gap-2 text-sm min-w-0">
        <Link href="/" className="text-slate-400 hover:text-white shrink-0 text-xs">
          ← Home
        </Link>
        <div className="flex items-center justify-center gap-1.5 min-w-0 text-[10px] sm:text-xs text-slate-400">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              status === "connected"
                ? "bg-emerald-400"
                : status === "matching"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
            }`}
          />
          <span className="truncate">
            {status === "matching" && (
              <>
                <span className="max-[380px]:hidden">Looking for someone…</span>
                <span className="hidden max-[380px]:inline">Matching…</span>
              </>
            )}
            {status === "idle" && "Matching paused"}
            {status === "connected" && "Connected"}
            {status === "disconnected" &&
              (endedBySelf ? "Chat ended" : "Stranger left")}
            {status === "restricted" && "Restricted"}
          </span>
        </div>
        <div className="flex items-center justify-end gap-1.5 shrink-0 pr-12 sm:pr-14">
          {status === "connected" && partnerId && (
            <button
              type="button"
              onClick={() => setPartnerProfileOpen(true)}
              className={`${chatBtnGhost} !text-[10px] !py-1 !px-2 max-[380px]:!px-1.5`}
            >
              Profile
            </button>
          )}
          {profile && (
            <Link
              href="/settings"
              className="hidden min-[381px]:inline text-[10px] text-slate-400 hover:text-white transition"
            >
              Settings
            </Link>
          )}
        </div>
      </header>
      {profile && (
        <div className="px-4 pb-2">
          <AppQuickNav className="max-w-md mx-auto" />
        </div>
      )}
      <div className="px-4 pb-2">
        <TranslateToolbar
          primaryLanguage={primaryLanguage}
          autoTranslate={autoTranslate}
          onPrimaryLanguageChange={(lang) => {
            void saveTranslationPrefs({ primary_language: lang });
          }}
          onAutoTranslateChange={(enabled) => {
            void saveTranslationPrefs({ auto_translate: enabled });
          }}
        />
      </div>

      {status !== "restricted" && (
        <>
        <MatchingWaitScreen
          visible={status === "matching"}
          stateCode={matchPrefs.stateCode}
          onCancel={handleCancelMatching}
          cancelling={cancellingWait}
          onExpandToCountry={
            matchPrefs.matchMode === "regional" &&
            matchPrefs.countryCode === "US" &&
            matchPrefs.stateCode
              ? handleExpandRegion
              : undefined
          }
          expanding={expandingRegion}
          showCaptcha={matchCaptchaBlocked && Boolean(turnstileSiteKey)}
          turnstileSiteKey={turnstileSiteKey}
          onCaptchaToken={handleMatchCaptchaToken}
        />
        {status !== "idle" && (
        <VideoPanel
          attachLocalVideo={attachLocalVideo}
          remoteVideoRef={remoteVideoRef}
          mediaError={mediaError}
          connectionState={connectionState}
          status={status}
          selfLabel={
            profile
              ? formatPartnerLine(
                  profile.username,
                  profile.age,
                  profile.show_age ?? true
                )
              : "You"
          }
          partnerLabel={partnerLabel}
          partnerSafetyLabel={partnerSafetyLabel}
          partnerSafetyTone={partnerSafetyTone}
          matchBadge={roomBadge}
          videoEnabled={videoEnabled}
          mediaStarting={
            mediaMode === "granted" &&
            webrtcActive &&
            !videoEnabled &&
            !mediaError &&
            !voiceOnly
          }
          audioEnabled={audioEnabled}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
          onStop={handleStop}
          endedBySelf={endedBySelf}
          onNext={handleNext}
          onIceBreaker={generateIceBreaker}
          loadingNext={loadingNext}
          showConnect={status === "connected"}
          videoBlurred={videoBlurred}
          bothRevealed={bothRevealed}
          onRevealVideo={handleRevealVideo}
          strangerFlag={
            matchPrefs.matchMode === "regional"
              ? countryCodeToFlag(matchPrefs.countryCode)
              : undefined
          }
          sharedTags={sharedTags}
          voiceOnly={voiceOnly}
          connectHint={null}
          socialCompact={chatFriendStatus === "friends"}
          socialCompactLabel={
            chatConnectionType === "mutual_connect"
              ? "✨ Mutual spark — you're friends"
              : "🤝 Friends — message anytime"
          }
          socialCompactShowDmLink={chatFriendStatus === "friends"}
          sparkSlot={
            chatFriendStatus === "friends" ? null : renderSparkButton()
          }
          friendSlot={
            chatFriendStatus === "friends" ? null : renderFriendRequestButton()
          }
          actionSlot={
            roomId ? (
              <SafetyActions
                roomId={roomId}
                onBlocked={() => {
                  stopMedia();
                  setRoomId(null);
                  setEndedBySelf(false);
                  setStatus("disconnected");
                  setError("User blocked. Press Next for a new match.");
                }}
              />
            ) : null
          }
        />
        )}
        </>
      )}

      <OnboardingTour />

      <MatchCountdown countdown={countdown} visible={countdown !== null} />
      <ConnectionCardOverlay
        data={cardData}
        visible={showCard}
        onDone={dismissCard}
      />
      <MutualConnectCelebration
        visible={showMutualConnectCelebration}
        partnerUsername={
          cardData?.partnerUsername ?? friendUsername ?? "Stranger"
        }
        partnerAge={cardData?.partnerAge}
        partnerAvatarUrl={cardData?.partnerAvatarUrl}
        partnerEmoji={cardData?.partnerEmoji}
        onDone={() => setShowMutualConnectCelebration(false)}
      />
      <PostChatFeedback
        roomId={feedbackRoomId ?? ""}
        partnerId={feedbackPartnerId ?? ""}
        visible={showFeedback}
        referralCode={profile?.referral_code}
        onClose={() => {
          setShowFeedback(false);
          if (pendingNext) {
            setPendingNext(false);
            void doNext();
          }
        }}
      />

      {connectNotice && (
        <div className="mx-4 mb-3 rounded-xl border border-pink-500/40 bg-pink-500/15 px-4 py-3 text-sm text-pink-200 text-center animate-fade-in">
          {connectNotice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-[100px] max-w-4xl w-full mx-auto">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
            {status !== "restricted" &&
              !error.includes("18+") &&
              !error.includes("Age verification") && (
              <p className="mt-2 text-xs text-red-400/80">
                Local: run <code className="text-red-300">npm run dev</code> and
                check <code className="text-red-300">.env.local</code>. Supabase:
                run{" "}
                <code className="text-red-300">supabase/fix-function-missing.sql</code>{" "}
                (not full schema.sql). Production: add Supabase keys in Vercel →
                Environment Variables, then redeploy.
              </p>
            )}
          </div>
        )}
        {status === "restricted" && <RestrictionPanel />}
        {status === "idle" && (
          <div className="mx-4 mb-4 rounded-3xl border border-slate-600/40 bg-slate-950/80 backdrop-blur-xl p-6 text-center">
            <p className="text-slate-300 font-medium text-sm">You left the match queue</p>
            <p className="text-xs text-slate-500 mt-2">
              Tap below when you are ready to find someone new.
            </p>
            <button
              type="button"
              onClick={handleResumeMatching}
              className="mt-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold px-6 py-3 text-sm"
            >
              Find a match
            </button>
          </div>
        )}
        {status === "matching" && messages.length === 0 && !error && (
          <p className="text-center text-slate-500 mt-20">
            Waiting for a stranger to join...
            <br />
            <span className="text-sm">
              Open another tab or incognito window to test with yourself.
            </span>
          </p>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <TranslatedMessageBubble
                messageId={msg.id}
                content={msg.content}
                isMe={isMe}
                targetLanguage={primaryLanguage}
                autoTranslate={autoTranslate}
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMe
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                    : "bg-white/10 text-slate-100"
                }`}
              />
            </div>
          );
        })}

        {status === "disconnected" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 text-center">
            {endedBySelf ? (
              <>
                You ended the chat. Press <strong>Next</strong> when you want
                someone new.
              </>
            ) : (
              <>
                Stranger disconnected. Press <strong>Next</strong> to find
                someone new.
              </>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="sticky bottom-0 z-10 p-3 sm:p-4 border-t border-purple-500/20 space-y-2 max-w-4xl w-full mx-auto bg-slate-950/90 backdrop-blur-md"
      >
        {partnerTyping && (
          <p className="text-center text-xs text-fuchsia-300/80 pb-2 animate-pulse">
            Stranger is typing…
          </p>
        )}

        <RulesReminder />

        <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "connected"}
          placeholder={
            status === "connected"
              ? "Type a message..."
              : status === "disconnected"
                ? endedBySelf
                  ? "Chat ended — press Next for a new match"
                  : "Stranger left — press Next"
                : "Waiting for match..."
          }
          aria-label="Message to stranger"
          className="flex-1 rounded-lg bg-slate-950/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-fuchsia-500/40 disabled:opacity-50 text-white"
        />
        <button
          type="submit"
          disabled={status !== "connected" || !input.trim()}
          className={chatBtnSend}
        >
          Send
        </button>
        </div>
      </form>

      {showIceBreakerPopup && (
        <AppModal
          open
          onClose={() => setShowIceBreakerPopup(false)}
          title="Break the Ice!"
          titleVisible
          titleClassName="text-fuchsia-400 font-extrabold text-xl tracking-wide mb-4 text-center"
          panelClassName="bg-slate-900 border-2 border-fuchsia-500 p-8 rounded-3xl max-w-sm w-full text-center shadow-[0_0_40px_rgba(217,70,239,0.3)]"
        >
          <div className="text-4xl mb-3 animate-pulse" aria-hidden>
            🔮
          </div>
          <p className="text-slate-100 text-base md:text-lg font-medium italic leading-relaxed mb-6 px-1">
            &ldquo;{iceBreakerQuestion}&rdquo;
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={useIceBreakerQuestion}
              className={chatBtnSend}
            >
              Send to chat
            </button>
            <button
              type="button"
              onClick={generateIceBreaker}
              className={chatBtnFun}
            >
              New question
            </button>
            <button
              type="button"
              onClick={() => setShowIceBreakerPopup(false)}
              className={`${chatBtnGhost} w-full`}
            >
              Dismiss
            </button>
          </div>
        </AppModal>
      )}
    </main>

    {chatFriendStatus === "friends" && friendId && profile && (
      <FriendsPanel
        friendId={friendId}
        friendUsername={friendUsername || "Friend"}
        myId={profile.id}
      />
    )}

    <FriendProfileSheet
      friendId={partnerId}
      open={partnerProfileOpen && !!partnerId}
      onClose={() => setPartnerProfileOpen(false)}
      roomId={roomId}
      onRemove={
        chatFriendStatus === "friends" ? handleRemovePartnerFriend : undefined
      }
      onBlock={handleBlockPartner}
    />
    </div>
  );
}
