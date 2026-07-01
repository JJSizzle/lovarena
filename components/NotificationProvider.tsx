"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export type FriendRequestNotification = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  createdAt: string;
};

export type MessageNotification = {
  id: string;
  senderId: string;
  username: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  preview: string;
  createdAt: string;
};

type NotificationPayload = {
  friendRequests: FriendRequestNotification[];
  messages: MessageNotification[];
  incomingFriendRequestCount: number;
  unreadMessageCount: number;
};

type NotificationContextValue = {
  friendRequests: FriendRequestNotification[];
  unreadMessages: MessageNotification[];
  totalCount: number;
  incomingFriendCount: number;
  unreadMessageCount: number;
  refresh: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [data, setData] = useState<NotificationPayload>({
    friendRequests: [],
    messages: [],
    incomingFriendRequestCount: 0,
    unreadMessageCount: 0,
  });

  const refresh = useCallback(async () => {
    if (!profile?.id) {
      setData({
        friendRequests: [],
        messages: [],
        incomingFriendRequestCount: 0,
        unreadMessageCount: 0,
      });
      return;
    }

    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setData({
          friendRequests: json.friendRequests ?? [],
          messages: json.messages ?? [],
          incomingFriendRequestCount:
            typeof json.incomingFriendRequestCount === "number"
              ? json.incomingFriendRequestCount
              : (json.friendRequests ?? []).length,
          unreadMessageCount:
            typeof json.unreadMessageCount === "number"
              ? json.unreadMessageCount
              : (json.messages ?? []).length,
        });
      }
    } catch {
      // ignore
    }
  }, [profile?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onSeen() {
      void refresh();
    }
    window.addEventListener("lovarena:notifications-seen", onSeen);
    return () =>
      window.removeEventListener("lovarena:notifications-seen", onSeen);
  }, [refresh]);

  useEffect(() => {
    if (!profile?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `friend_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `receiver_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_read_cursors",
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          void refresh();
        }
      )
      .subscribe();

    const poll = setInterval(() => void refresh(), 60_000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [profile?.id, refresh]);

  const unreadMessages = data.messages;

  const value = useMemo<NotificationContextValue>(
    () => ({
      friendRequests: data.friendRequests,
      unreadMessages,
      totalCount:
        data.incomingFriendRequestCount + data.unreadMessageCount,
      incomingFriendCount: data.incomingFriendRequestCount,
      unreadMessageCount: data.unreadMessageCount,
      refresh,
    }),
    [
      data.friendRequests,
      data.incomingFriendRequestCount,
      data.unreadMessageCount,
      unreadMessages,
      refresh,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useAppNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useAppNotifications must be used within NotificationProvider");
  }
  return ctx;
}
