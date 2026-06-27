"use client";

import { useEffect, useState } from "react";

export function OnlineStatsBanner() {
  const [online, setOnline] = useState<number | null>(null);
  const [inQueue, setInQueue] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stats/online", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setOnline(data.online);
          setInQueue(data.inQueue);
        }
      } catch {
        // ignore
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-center gap-6 text-sm">
      <span className="text-cyan-300">
        <strong className="text-cyan-200">{online ?? "…"}</strong> online
      </span>
      <span className="text-pink-300">
        <strong className="text-pink-200">{inQueue ?? "…"}</strong> in queue
      </span>
    </div>
  );
}
