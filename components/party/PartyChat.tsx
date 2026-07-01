"use client";

import { useEffect, useRef, useState } from "react";
import { chatBtnGhost, chatBtnSend } from "@/lib/chat-buttons";
import { useScrollOnNewMessage } from "@/lib/hooks/useScrollOnNewMessage";
import type { PartyMessageView } from "@/lib/party/party-types";

type Props = {
  partyId: string;
  enabled: boolean;
};

export function PartyChat({ partyId, enabled }: Props) {
  const [messages, setMessages] = useState<PartyMessageView[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useScrollOnNewMessage(messages, partyId, scrollRef);

  useEffect(() => {
    if (!enabled || !partyId) return;

    async function load() {
      try {
        const res = await fetch(
          `/api/party/messages?partyId=${encodeURIComponent(partyId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (res.ok) setMessages(data.messages ?? []);
      } catch {
        // ignore
      }
    }

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [partyId, enabled]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/party/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId, content: text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="flex flex-col h-full min-h-[12rem] rounded-2xl border border-purple-500/20 bg-slate-950/70 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
          Party chat
        </p>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-2 space-y-2 max-h-48 lg:max-h-none"
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4">
            Say hi to your friends…
          </p>
        )}
        {messages.map((msg, index) => {
          const showSeen =
            msg.isYou &&
            msg.seenByAll &&
            (index === messages.length - 1 ||
              !messages.slice(index + 1).some((m) => m.isYou));

          return (
          <div
            key={msg.id}
            className={`text-xs ${msg.isYou ? "text-right" : "text-left"}`}
          >
            <span className="text-[10px] text-slate-500">
              {msg.isYou ? "You" : msg.username}
            </span>
            <p
              className={`mt-0.5 inline-block rounded-xl px-2.5 py-1.5 max-w-[90%] ${
                msg.isYou
                  ? "bg-fuchsia-500/20 text-fuchsia-100"
                  : "bg-white/5 text-slate-200"
              }`}
            >
              {msg.content}
            </p>
            {showSeen && (
              <p className="text-[9px] text-slate-500 mt-0.5">Seen</p>
            )}
          </div>
        );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2 p-2 border-t border-white/5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={500}
          placeholder="Message…"
          aria-label="Party chat message"
          className="flex-1 rounded-xl bg-slate-900 border border-purple-500/20 px-3 py-2 text-xs outline-none focus:border-fuchsia-500/40"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className={`${chatBtnSend} !px-3 !py-2 !text-xs shrink-0`}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export function CopyInviteButton({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`${chatBtnGhost} !text-xs w-full`}
    >
      {copied ? "Link copied!" : "Copy invite link"}
    </button>
  );
}
