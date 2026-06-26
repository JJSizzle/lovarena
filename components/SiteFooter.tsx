import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#070b14] text-slate-500 text-xs py-8 px-6 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 justify-between items-center">
        <p>© {new Date().getFullYear()} Lovarena · Adults 18+ only</p>
        <nav className="flex flex-wrap gap-4 justify-center">
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
    </footer>
  );
}
