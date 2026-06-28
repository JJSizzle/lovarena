type ProfileAvatarProps = {
  url?: string | null;
  emoji?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-10 w-10 text-lg rounded-xl",
  md: "h-16 w-16 text-3xl rounded-2xl",
  lg: "h-20 w-20 text-4xl rounded-2xl",
  xl: "h-24 w-24 text-5xl rounded-full",
} as const;

export function ProfileAvatar({
  url,
  emoji = "😎",
  alt = "",
  size = "md",
  className = "",
}: ProfileAvatarProps) {
  const sizeClass = SIZE_CLASS[size];

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        className={`object-cover border border-purple-500/30 bg-slate-900 ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-600 border border-purple-500/30 ${sizeClass} ${className}`}
      aria-hidden={!alt}
    >
      {emoji ?? "😎"}
    </div>
  );
}
