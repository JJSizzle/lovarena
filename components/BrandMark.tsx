import { SITE_NAME } from "@/lib/site";

const tmClass =
  "text-[0.42em] font-normal opacity-40 ml-[0.06em] relative -top-[0.55em] leading-none";

type Props = {
  /** Defaults to SITE_NAME ("Lovarena"). */
  name?: string;
  uppercase?: boolean;
  className?: string;
  tmClassName?: string;
};

export function BrandMark({
  name = SITE_NAME,
  uppercase = false,
  className,
  tmClassName,
}: Props) {
  const label = uppercase ? name.toUpperCase() : name;

  return (
    <span className={className}>
      {label}
      <sup className={tmClassName ?? tmClass} aria-hidden>
        ™
      </sup>
    </span>
  );
}
