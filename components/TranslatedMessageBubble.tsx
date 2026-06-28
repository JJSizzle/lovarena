"use client";

import { useCallback, useEffect, useState } from "react";
import { deepLLabel, fetchTranslation } from "@/lib/translation/client";
import { isSupportedTranslationLanguage } from "@/lib/translation/language-codes";

type Props = {
  messageId: string;
  content: string;
  isMe: boolean;
  targetLanguage: string;
  autoTranslate: boolean;
  className?: string;
};

export function TranslatedMessageBubble({
  messageId,
  content,
  isMe,
  targetLanguage,
  autoTranslate,
  className = "",
}: Props) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTranslate =
    !isMe && isSupportedTranslationLanguage(targetLanguage);

  const runTranslate = useCallback(async () => {
    if (!canTranslate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTranslation(content, targetLanguage);
      setTranslated(result.translated);
      setDetectedLang(result.detectedSourceLanguage);
      setShowOriginal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }, [canTranslate, content, targetLanguage]);

  useEffect(() => {
    setTranslated(null);
    setDetectedLang(null);
    setShowOriginal(false);
    setError(null);
  }, [messageId, content, targetLanguage]);

  useEffect(() => {
    if (!autoTranslate || !canTranslate) return;
    void runTranslate();
  }, [autoTranslate, canTranslate, runTranslate]);

  const showingTranslation =
    Boolean(translated) && !showOriginal && !isMe;

  const displayText = showingTranslation ? translated! : content;

  return (
    <div className={className}>
      <p>{displayText}</p>
      {!isMe && canTranslate && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {loading && (
            <span className="text-[10px] opacity-70">Translating…</span>
          )}
          {error && (
            <span className="text-[10px] text-red-300/90">{error}</span>
          )}
          {translated && (
            <>
              <span className="text-[10px] opacity-60">
                {showingTranslation
                  ? `Translated from ${deepLLabel(detectedLang)}`
                  : "Showing original"}
              </span>
              <button
                type="button"
                onClick={() => setShowOriginal((v) => !v)}
                className="text-[10px] underline opacity-80 hover:opacity-100"
              >
                {showOriginal ? "Show translation" : "Show original"}
              </button>
            </>
          )}
          {!autoTranslate && !translated && !loading && (
            <button
              type="button"
              onClick={() => void runTranslate()}
              className="text-[10px] underline opacity-80 hover:opacity-100"
            >
              Translate
            </button>
          )}
        </div>
      )}
      {!isMe && !canTranslate && autoTranslate && (
        <p className="mt-1 text-[10px] opacity-50">
          Translation unavailable for {targetLanguage}
        </p>
      )}
    </div>
  );
}
