export type SeasonalTheme = {
  id: string;
  label: string;
  gradient: string;
  accent: string;
};

export function getSeasonalTheme(): SeasonalTheme {
  const month = new Date().getMonth() + 1;

  if (month === 10) {
    return {
      id: "halloween",
      label: "Spooky season",
      gradient: "from-orange-950 via-slate-900 to-purple-950",
      accent: "orange",
    };
  }
  if (month === 12) {
    return {
      id: "winter",
      label: "Winter glow",
      gradient: "from-indigo-950 via-slate-900 to-cyan-950",
      accent: "cyan",
    };
  }
  if (month === 2 || month === 6) {
    return {
      id: "pride",
      label: "Love wins",
      gradient: "from-indigo-950 via-purple-900 to-pink-950",
      accent: "rainbow",
    };
  }
  return {
    id: "default",
    label: "Arena",
    gradient: "from-indigo-950 via-slate-900 to-purple-950",
    accent: "purple",
  };
}
