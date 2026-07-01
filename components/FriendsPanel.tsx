"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useScrollOnNewMessage } from "@/lib/hooks/useScrollOnNewMessage";
import { useTypingIndicator } from "@/lib/hooks/useTypingIndicator";
import { dmTypingChannelId } from "@/lib/dm-thread";
import { chatBtnLove, chatBtnBlock, chatBtnGhost } from "@/lib/chat-buttons";
import { useAuth } from "@/components/AuthProvider";
import { useConfirm } from "@/components/ConfirmProvider";
import { TranslatedMessageBubble } from "@/components/TranslatedMessageBubble";
import { TranslateToolbar } from "@/components/TranslateToolbar";
import { markSenderRead } from "@/lib/notifications/seen-state";

type PrivateMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

function lastReadSentMessageId(
  messages: PrivateMessage[],
  myId: string,
  peerLastReadAt: string | null
): string | null {
  if (!peerLastReadAt) return null;
  let lastId: string | null = null;
  for (const msg of messages) {
    if (msg.sender_id === myId && msg.created_at <= peerLastReadAt) {
      lastId = msg.id;
    }
  }
  return lastId;
}

function markThreadRead(friendId: string, at?: string) {
  markSenderRead(friendId, at);
}

type FriendsPanelProps = {
  friendId: string;
  friendUsername: string;
  myId: string;
  onRemoved?: () => void;
  onViewProfile?: () => void;
};

function appendPrivateMessage(
  list: PrivateMessage[],
  msg: PrivateMessage
): PrivateMessage[] {
  if (list.some((m) => m.id === msg.id)) return list;
  return [...list, msg];
}

export function FriendsPanel({
  friendId,
  friendUsername,
  myId,
  onRemoved,
  onViewProfile,
}: FriendsPanelProps) {
  const { profile, refreshProfile } = useAuth();
  const { confirm } = useConfirm();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const bottomRef = useScrollOnNewMessage(messages, friendId);
  const friendTyping = useTypingIndicator(
    dmTypingChannelId(myId, friendId),
    myId,
    input,
    true
  );

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
    setMessages([]);
    setPeerLastReadAt(null);
    setInput("");
    setError(null);
    markThreadRead(friendId);
  }, [friendId]);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/private-messages?friendId=${encodeURIComponent(friendId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages as PrivateMessage[]);
        setPeerLastReadAt(data.peerLastReadAt ?? null);
        const loaded = data.messages as PrivateMessage[];
        const latestIncoming = [...loaded]
          .reverse()
          .find((msg) => msg.receiver_id === myId);
        if (latestIncoming) {
          markThreadRead(friendId, latestIncoming.created_at);
        }
      }
    }

    load();

    const supabase = createClient();

    const channel = supabase
      .channel(`private:${myId}:${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `sender_id=eq.${friendId}`,
        },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.receiver_id === myId) {
            setMessages((prev) => appendPrivateMessage(prev, msg));
            markThreadRead(friendId, msg.created_at);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `sender_id=eq.${myId}`,
        },
        (payload) => {
          const msg = payload.new as PrivateMessage;
          if (msg.receiver_id === friendId) {
            setMessages((prev) => appendPrivateMessage(prev, msg));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_read_cursors",
          filter: `user_id=eq.${friendId}`,
        },
        (payload) => {
          const row = payload.new as {
            peer_id?: string;
            last_read_at?: string;
          };
          if (row?.peer_id === myId && row.last_read_at) {
            setPeerLastReadAt(row.last_read_at);
          }
        }
      )
      .subscribe();

    const poll = setInterval(load, 5000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [friendId, myId]);

  const seenMessageId = lastReadSentMessageId(
    messages,
    myId,
    profile?.read_receipts_enabled !== false ? peerLastReadAt : null
  );

  async function sendPrivate(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const text = input.trim();
    setInput("");
    setError(null);

    const res = await fetch("/api/private-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId, content: text }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "Failed to send");
      setInput(text);
      return;
    }

    if (data.message) {
      setMessages((prev) => appendPrivateMessage(prev, data.message));
    }
  }

  async function handleRemove() {
    const ok = await confirm({
      title: "Remove friend?",
      message: `Remove ${friendUsername}? You can add them again from a future match.`,
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;

    setRemoving(true);
    setError(null);

    const res = await fetch("/api/friends", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId }),
    });
    const data = await res.json();
    setRemoving(false);

    if (!res.ok) {
      setError(data.error ?? "Could not remove");
      return;
    }

    onRemoved?.();
  }

  return (
    <aside
      className="w-full lg:w-80 shrink-0 border-l border-white/10 bg-slate-900/50 flex flex-col min-h-0"
    >
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-pink-400 font-medium uppercase tracking-wide">
              Friends chat
            </p>
            {onViewProfile ? (
              <button
                type="button"
                onClick={onViewProfile}
                className="text-sm font-semibold text-white truncate hover:text-pink-200 transition text-left max-w-full"
              >
                {friendUsername}
              </button>
            ) : (
              <p className="text-sm font-semibold text-white truncate">
                {friendUsername}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onViewProfile && (
              <button
                type="button"
                onClick={onViewProfile}
                className={`${chatBtnGhost} !px-2 !py-1 !text-[10px]`}
              >
                Profile
              </button>
            )}
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className={`${chatBtnBlock} !px-2 !py-1 !text-[10px]`}
            >
              {removing ? "…" : "Remove"}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Private messages stay after you leave the room
        </p>
        <div className="mt-2">
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
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-[160px] max-h-[40vh] lg:max-h-none">
        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-2 py-1">
            {error}
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
          const showSeen = isMe && msg.id === seenMessageId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              <TranslatedMessageBubble
                messageId={msg.id}
                content={msg.content}
                isMe={isMe}
                targetLanguage={primaryLanguage}
                autoTranslate={autoTranslate}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  isMe
                    ? "bg-pink-600 text-white"
                    : "bg-white/10 text-slate-100"
                }`}
              />
              {showSeen && (
                <span className="text-[9px] text-slate-500 mt-0.5 mr-1">
                  Seen
                </span>
              )}
            </div>
          );
        })}
        {friendTyping && (
          <p className="text-[10px] text-pink-300/80 italic px-1">
            {friendUsername} is typing…
          </p>
        )}
        {messages.length === 0 && !friendTyping && (
          <p className="text-center text-slate-500 text-xs py-8">
            Say hi to your new friend!
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendPrivate}
        className="p-3 border-t border-white/10 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Private message…"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs outline-none focus:border-pink-500/50 text-white"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className={chatBtnLove}
        >
          Send
        </button>
      </form>
    </aside>
  );
}
