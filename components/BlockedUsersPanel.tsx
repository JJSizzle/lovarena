"use client";

import { useCallback, useEffect, useState } from "react";

type BlockRow = {
  id: string;
  blockedId: string;
  username: string;
  createdAt?: string;
};

type Props = {
  className?: string;
  compact?: boolean;
};

export function BlockedUsersPanel({ className = "", compact = false }: Props) {
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadBlocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setBlocks(data.blocks ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlocks();
  }, [loadBlocks]);

  async function handleUnblock(blockedId: string) {
    setBusyId(blockedId);
    try {
      const res = await fetch("/api/blocks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId }),
      });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.blockedId !== blockedId));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={className}>
      {!compact && (
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Blocked users won&apos;t match you or send friend requests. Unblock
          anytime — they won&apos;t be re-added as friends automatically.
        </p>
      )}
      {loading ? (
        <p className="text-xs text-slate-500">Loading…</p>
      ) : blocks.length === 0 ? (
        <p className="text-xs text-slate-500">No blocked users.</p>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2"
            >
              <span className="text-sm text-slate-200 truncate">{b.username}</span>
              <button
                type="button"
                onClick={() => void handleUnblock(b.blockedId)}
                disabled={busyId === b.blockedId}
                className="text-xs text-slate-400 hover:text-white shrink-0 disabled:opacity-50"
              >
                {busyId === b.blockedId ? "…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
