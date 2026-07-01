"use client";

import { useRef, useState } from "react";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { uploadAvatarPhoto, validateAvatarFile } from "@/lib/avatar-upload";

type Props = {
  userId: string;
  avatarUrl: string | null;
  avatarEmoji: string;
  onUploaded: (url: string) => void;
  onClear?: () => void;
};

export function AvatarUpload({
  userId: _userId,
  avatarUrl,
  avatarEmoji,
  onUploaded,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    try {
      const publicUrl = await uploadAvatarPhoto(file);
      onUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  const displayUrl = preview ?? avatarUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <ProfileAvatar url={displayUrl} emoji={avatarEmoji} size="lg" />
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="rounded-xl border border-purple-500/30 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-fuchsia-300 hover:border-fuchsia-500/40 disabled:opacity-50 transition"
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          {avatarUrl && onClear && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                setPreview(null);
                onClear();
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        JPG, PNG, or WebP · max 2 MB. Photos are scanned for safety before
        publishing.
      </p>
      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
