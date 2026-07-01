const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use a JPG, PNG, or WebP photo.";
  }
  if (file.size > MAX_BYTES) {
    return "Photo must be 2 MB or smaller.";
  }
  return null;
}

export function avatarStoragePath(userId: string, mimeType: string): string {
  const ext =
    mimeType === "image/png"
      ? "png"
      : mimeType === "image/webp"
        ? "webp"
        : "jpg";
  return `${userId}/avatar.${ext}`;
}

export async function uploadAvatarPhoto(file: File): Promise<string> {
  const validationError = validateAvatarFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/avatar/upload", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Upload failed");
  }
  if (!data.url) {
    throw new Error("Upload failed");
  }

  return data.url;
}
