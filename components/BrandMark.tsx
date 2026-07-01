import { SITE_NAME } from "@/lib/site";

type Props = {
  /** Defaults to SITE_NAME ("Lovarena"). */
  name?: string;
  uppercase?: boolean;
  className?: string;
  tmClassName?: string;
  /** Gradient wordmark; ™ stays a visible solid color (not clipped). */
  gradient?: boolean;
};

export function BrandMark({
  name = SITE_NAME,
  uppercase = false,
  className,
  tmClassName,
  gradient = false,
}: Props) {
  const label = uppercase ? name.toUpperCase() : name;

  const wordClass = gradient
    ? "bg-gradient-to-r from-pink-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
    : undefined;

  const defaultTm = gradient
    ? "text-[0.38em] font-normal text-fuchsia-300/75 relative -top-[0.55em] leading-none ml-[0.05em]"
    : "text-[0.42em] font-normal text-slate-500/85 relative -top-[0.5em] leading-none ml-[0.05em]";

  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      <span className={wordClass}>{label}</span>
      <sup className={tmClassName ?? defaultTm} aria-label="Trademark">
        ™
      </sup>
    </span>
  );
}
