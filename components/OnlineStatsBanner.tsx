"use client";

import { useCallback, useEffect, useState } from "react";

type LoadState = "loading" | "ok" | "error";

export function OnlineStatsBanner() {
  const [online, setOnline] = useState<number | null>(null);
  const [inQueue, setInQueue] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stats/online", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setOnline(data.online);
        setInQueue(data.inQueue);
        setState("ok");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 15000);
    return () => clearInterval(id);
  }, [load]);

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-2 text-sm">
        <span className="text-slate-500">Couldn&apos;t load live stats</span>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            void load();
          }}
          className="text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-6 text-sm">
      <span className="text-cyan-300">
        <strong className="text-cyan-200">
          {state === "loading" ? "…" : online}
        </strong>{" "}
        online
      </span>
      <span className="text-pink-300">
        <strong className="text-pink-200">
          {state === "loading" ? "…" : inQueue}
        </strong>{" "}
        in queue
      </span>
    </div>
  );
}
