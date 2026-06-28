import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-purple-500/20 bg-slate-950/80 text-slate-500 text-xs py-8 px-6 mt-auto">
      <div className="max-w-5xl mx-auto space-y-4">
        <p className="text-center text-slate-400 leading-relaxed max-w-xl mx-auto">
          Use Lovarena in your browser today — add to Home Screen for an
          app-like experience. Native iOS &amp; Android apps are coming in the near future.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 justify-between items-center">
        <p>© {new Date().getFullYear()} Lovarena · Adults 18+ only</p>
        <nav className="flex flex-wrap gap-4 justify-center">
          <Link href="/video-chat" className="hover:text-fuchsia-300 transition">
            Video chat
          </Link>
          <Link href="/omegle-alternative" className="hover:text-fuchsia-300 transition">
            Omegle alternative
          </Link>
          <Link href="/free-video-chat" className="hover:text-fuchsia-300 transition">
            Free video chat
          </Link>
          <Link href="/random-chat" className="hover:text-fuchsia-300 transition">
            Random chat
          </Link>
          <Link href="/talk-to-strangers" className="hover:text-fuchsia-300 transition">
            Talk to strangers
          </Link>
          <Link href="/blog/stay-safe" className="hover:text-fuchsia-300 transition">
            Safety tips
          </Link>
          <Link href="/blog/ice-breaker-questions" className="hover:text-fuchsia-300 transition">
            Ice breakers
          </Link>
          <Link href="/friends" className="hover:text-fuchsia-300 transition">
            Friends
          </Link>
          <Link href="/profile" className="hover:text-fuchsia-300 transition">
            Profile
          </Link>
          <Link href="/terms" className="hover:text-white transition">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white transition">
            Privacy
          </Link>
          <Link href="/community" className="hover:text-white transition">
            Guidelines
          </Link>
          <Link href="/contact" className="hover:text-white transition">
            Contact
          </Link>
        </nav>
        </div>
      </div>
    </footer>
  );
}
