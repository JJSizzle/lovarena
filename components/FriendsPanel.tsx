"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useScrollOnNewMessage } from "@/lib/hooks/useScrollOnNewMessage";
import { chatBtnLove, chatBtnBlock } from "@/lib/chat-buttons";
import { useAuth } from "@/components/AuthProvider";
import { TranslatedMessageBubble } from "@/components/TranslatedMessageBubble";
import { TranslateToolbar } from "@/components/TranslateToolbar";

type PrivateMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
};

type FriendsPanelProps = {
  friendId: string;
  friendUsername: string;
  myId: string;
  onRemoved?: () => void;
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
}: FriendsPanelProps) {
  const { profile, refreshProfile } = useAuth();
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState("English");
  const [autoTranslate, setAutoTranslate] = useState(false);
  const bottomRef = useScrollOnNewMessage(messages, friendId);

  useEffect(() => {
    if (!profile) return;
    setPrimaryLanguage(profile.primary_language ?? "English");
    setAutoTranslate(profile.auto_translate ?? false);
  }, [profile?.primary_language, profile?.auto_translate, profile]);

  async function saveTranslationPrefs(
    updates: Partial<{ primary_language: string; auto_translate: boolean }>
  ) {
    if (updates.primary_language != null) {
      setPrimaryLanguage(updates.primary_language);
    }
    if (updates.auto_translate != null) {
      setAutoTranslate(updates.auto_translate);
    }
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      await refreshProfile();
    } catch {
      // local UI still updated
    }
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `/api/private-messages?friendId=${encodeURIComponent(friendId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages((prev) => {
          let next = prev;
          for (const msg of data.messages as PrivateMessage[]) {
            next = appendPrivateMessage(next, msg);
          }
          return next === prev ? prev : next;
        });
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
      .subscribe();

    const poll = setInterval(load, 5000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [friendId, myId]);

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
    if (
      !confirm(
        `Remove ${friendUsername}? You can add them again from a future match.`
      )
    ) {
      return;
    }

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
            <p className="text-sm font-semibold text-white truncate">
              {friendUsername}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className={`${chatBtnBlock} !px-2 !py-1 !text-[10px] shrink-0`}
          >
            {removing ? "…" : "Remove"}
          </button>
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
        {messages.length === 0 && (
          <p className="text-center text-slate-500 text-xs py-8">
            Say hi to your new friend!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === myId;
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
                className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  isMe
                    ? "bg-pink-600 text-white"
                    : "bg-white/10 text-slate-100"
                }`}
              />
            </div>
          );
        })}
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
