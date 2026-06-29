import Link from "next/link";

const exploreLinks = [
  { href: "/chat", label: "Enter Arena" },
  { href: "/friends", label: "Friends" },
  { href: "/blog/stay-safe", label: "Safety tips" },
  { href: "/blog/ice-breaker-questions", label: "Ice breakers" },
];

const accountLinks = [
  { href: "/settings", label: "Settings" },
  { href: "/profile", label: "Profile" },
];

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/community", label: "Guidelines" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-purple-500/20 bg-slate-950/90 text-slate-500 text-xs mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-bold bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">
              LOVARENA
            </p>
            <p className="text-slate-500 mt-2 leading-relaxed">
              Video &amp; text chat for adults 18+. Add to Home Screen for an
              app-like experience.
            </p>
          </div>

          <div>
            <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wide text-[10px]">
              Explore
            </p>
            <nav className="flex flex-col gap-1.5">
              {exploreLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-fuchsia-300 transition"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wide text-[10px]">
              Account
            </p>
            <nav className="flex flex-col gap-1.5">
              {accountLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-fuchsia-300 transition"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-slate-400 font-semibold mb-2 uppercase tracking-wide text-[10px]">
              Legal
            </p>
            <nav className="flex flex-col gap-1.5">
              {legalLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="hover:text-white transition"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-600">
          <p>© {new Date().getFullYear()} Lovarena · lovarena.app</p>
          <p>Be kind. Report abuse. Stay safe.</p>
        </div>
      </div>
    </footer>
  );
}
