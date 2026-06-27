export const AVATAR_EMOJIS = [
  "😎", "🔥", "✨", "🎮", "🎵", "🌸", "🦁", "🐺", "🦊", "🐼",
  "🚀", "💜", "🌈", "⚡", "🎯", "🎭", "🤙", "💫", "🌙", "☀️",
  "🎸", "🏆", "🍕", "🎨", "📸", "🧠", "💎", "🦄", "🐉", "🌊",
] as const;

export function isAvatarEmoji(value: string): boolean {
  return (AVATAR_EMOJIS as readonly string[]).includes(value);
}
