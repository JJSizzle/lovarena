"use client";

import { useCallback, useRef, useState } from "react";
import type { ConnectionCardData } from "@/components/ConnectionCardOverlay";
import {
  playConnectSound,
  playMatchCountdownTick,
  playMessageSound,
  playNextSound,
} from "@/lib/sounds";
import { getMatchPrefs } from "@/lib/match-prefs";

export function useMatchCelebration() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState<ConnectionCardData | null>(null);
  const lastRoomRef = useRef<string | null>(null);

  const dismissCard = useCallback(() => setShowCard(false), []);

  const celebrate = useCallback(async (roomId: string) => {
    if (lastRoomRef.current === roomId) return;
    lastRoomRef.current = roomId;

    playConnectSound();
    fetch("/api/streak", { method: "POST" }).catch(() => {});

    const prefs = getMatchPrefs();
    let step = 3;
    setCountdown(step);
    playMatchCountdownTick();

    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        step -= 1;
        if (step > 0) {
          setCountdown(step);
          playMatchCountdownTick();
        } else {
          setCountdown(0);
          clearInterval(interval);
          setTimeout(() => {
            setCountdown(null);
            resolve();
          }, 600);
        }
      }, 800);
    });

    try {
      const res = await fetch(
        `/api/room/partner?roomId=${encodeURIComponent(roomId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setCardData({
          matchMode: data.matchMode ?? prefs.matchMode,
          countryCode:
            prefs.matchMode === "regional" ? prefs.countryCode : undefined,
          sharedTags: data.sharedTags ?? [],
          safetyLabel: data.safetyLabel ?? "Verified 18+",
          safetyTone: data.safetyTone ?? "sky",
          partnerUsername: data.partnerUsername,
          partnerAge: data.partnerAge,
          partnerGender: data.partnerGender,
          partnerLocation: data.partnerLocation,
          partnerBio: data.partnerBio,
          partnerAvatarUrl: data.partnerAvatarUrl,
          partnerEmoji: data.partnerEmoji,
          partnerInterests: data.partnerInterests,
        });
        setShowCard(true);
      }
    } catch {
      // skip card
    }
  }, []);

  const resetCelebration = useCallback(() => {
    lastRoomRef.current = null;
    setCountdown(null);
    setShowCard(false);
    setCardData(null);
  }, []);

  return {
    countdown,
    showCard,
    cardData,
    dismissCard,
    celebrate,
    resetCelebration,
    playMessageSound,
    playNextSound,
  };
}
