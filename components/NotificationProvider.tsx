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
import { dispatchNewDm } from "@/lib/notifications/dm-events";

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
  hasMoreMessages: boolean;
};

type NotificationContextValue = {
  friendRequests: FriendRequestNotification[];
  unreadMessages: MessageNotification[];
  totalCount: number;
  incomingFriendCount: number;
  unreadMessageCount: number;
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  refresh: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const MESSAGE_PAGE_SIZE = 25;
const MESSAGE_LIST_MAX = 100;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [messageLimit, setMessageLimit] = useState(MESSAGE_PAGE_SIZE);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [data, setData] = useState<NotificationPayload>({
    friendRequests: [],
    messages: [],
    incomingFriendRequestCount: 0,
    unreadMessageCount: 0,
    hasMoreMessages: false,
  });

  const fetchNotifications = useCallback(
    async (limit: number) => {
      if (!profile?.id) {
        setData({
          friendRequests: [],
          messages: [],
          incomingFriendRequestCount: 0,
          unreadMessageCount: 0,
          hasMoreMessages: false,
        });
        return;
      }

      const res = await fetch(
        `/api/notifications?messageLimit=${encodeURIComponent(String(limit))}`,
        { cache: "no-store" }
      );
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
          hasMoreMessages: Boolean(json.hasMoreMessages),
        });
      }
    },
    [profile?.id]
  );

  const refresh = useCallback(async () => {
    setMessageLimit(MESSAGE_PAGE_SIZE);
    try {
      await fetchNotifications(MESSAGE_PAGE_SIZE);
    } catch {
      // ignore
    }
  }, [fetchNotifications]);

  const loadMoreMessages = useCallback(async () => {
    if (!data.hasMoreMessages || loadingMoreMessages) return;
    const nextLimit = Math.min(messageLimit + MESSAGE_PAGE_SIZE, MESSAGE_LIST_MAX);
    if (nextLimit === messageLimit) return;

    setLoadingMoreMessages(true);
    try {
      await fetchNotifications(nextLimit);
      setMessageLimit(nextLimit);
    } catch {
      // ignore
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [
    data.hasMoreMessages,
    fetchNotifications,
    loadingMoreMessages,
    messageLimit,
  ]);

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
        async (payload) => {
          const msg = payload.new as {
            id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          const { data: sender } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", msg.sender_id)
            .maybeSingle();

          const senderUsername = sender?.username ?? "A friend";
          const preview =
            msg.content.length > 80
              ? `${msg.content.slice(0, 77)}…`
              : msg.content;

          dispatchNewDm({
            id: msg.id,
            senderId: msg.sender_id,
            senderUsername,
            preview,
            createdAt: msg.created_at,
          });

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
      hasMoreMessages: data.hasMoreMessages,
      loadingMoreMessages,
      refresh,
      loadMoreMessages,
    }),
    [
      data.friendRequests,
      data.incomingFriendRequestCount,
      data.unreadMessageCount,
      data.hasMoreMessages,
      unreadMessages,
      loadingMoreMessages,
      refresh,
      loadMoreMessages,
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
