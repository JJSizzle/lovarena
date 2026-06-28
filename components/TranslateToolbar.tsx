"use client";

import { LANGUAGE_OPTIONS } from "@/lib/profile-tags";
import { isSupportedTranslationLanguage } from "@/lib/translation/language-codes";

type Props = {
  primaryLanguage: string;
  autoTranslate: boolean;
  onPrimaryLanguageChange: (lang: string) => void;
  onAutoTranslateChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function TranslateToolbar({
  primaryLanguage,
  autoTranslate,
  onPrimaryLanguageChange,
  onAutoTranslateChange,
  disabled = false,
}: Props) {
  const supported = isSupportedTranslationLanguage(primaryLanguage);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <label className="flex items-center gap-1 text-slate-400">
        <span className="text-cyan-300/90" aria-hidden>
          🌐
        </span>
        <select
          value={primaryLanguage}
          disabled={disabled}
          onChange={(e) => onPrimaryLanguageChange(e.target.value)}
          className="select-dark rounded-md bg-slate-900/80 border border-purple-500/20 px-1.5 py-0.5 text-[10px] text-slate-200 outline-none"
        >
          {LANGUAGE_OPTIONS.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
              {!isSupportedTranslationLanguage(lang) ? " · soon" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
        <input
          type="checkbox"
          checked={autoTranslate}
          disabled={disabled || !supported}
          onChange={(e) => onAutoTranslateChange(e.target.checked)}
          className="accent-cyan-400 scale-90"
        />
        Auto-translate
      </label>
    </div>
  );
}
