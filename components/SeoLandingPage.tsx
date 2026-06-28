import Link from "next/link";
import { ArenaPageLayout } from "@/components/ArenaPageLayout";
import { SITE_NAME } from "@/lib/site";

type Bullet = string;

type SeoLandingPageProps = {
  title: string;
  headline: string;
  description: string;
  bullets: Bullet[];
  ctaHref?: string;
  ctaLabel?: string;
  related?: { href: string; label: string }[];
};

export function SeoLandingPage({
  title,
  headline,
  description,
  bullets,
  ctaHref = "/login?next=/chat",
  ctaLabel = `Join ${SITE_NAME}`,
  related = [],
}: SeoLandingPageProps) {
  return (
    <ArenaPageLayout className="px-6 py-16">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-fuchsia-400/80">
          {title}
        </p>
        <h1 className="text-4xl font-extrabold text-slate-100">{headline}</h1>
        <p className="text-slate-400 leading-relaxed">{description}</p>
        <ul className="text-left text-sm text-slate-400 space-y-2 max-w-md mx-auto">
          {bullets.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
        <Link
          href={ctaHref}
          className="inline-block rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-extrabold px-8 py-4"
        >
          {ctaLabel}
        </Link>
        {related.length > 0 && (
          <nav className="pt-4 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
            {related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-fuchsia-300 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </ArenaPageLayout>
  );
}
