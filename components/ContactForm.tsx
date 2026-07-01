"use client";

import { useState } from "react";

type ContactTopic = "general" | "safety" | "privacy" | "legal";

const TOPICS: { value: ContactTopic; label: string }[] = [
  { value: "general", label: "General support" },
  { value: "safety", label: "Safety / abuse" },
  { value: "privacy", label: "Privacy" },
  { value: "legal", label: "Legal / DMCA" },
];

export function ContactForm() {
  const [topic, setTopic] = useState<ContactTopic>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, message }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Could not send message");
      }

      setStatus("sent");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send message");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        Message sent. We&apos;ll reply to {email} as soon as we can.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 not-prose">
      <div>
        <label htmlFor="contact-topic" className="block text-sm text-slate-400 mb-1">
          Topic
        </label>
        <select
          id="contact-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white"
        >
          {TOPICS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-sm text-slate-400 mb-1">
            Name (optional)
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm text-slate-400 mb-1">
            Your email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm text-slate-400 mb-1">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm text-white resize-y"
        />
      </div>

      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
