export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
}

/** Desktop webcams often fail when facingMode is required; phones need user-facing cam. */
export function getVideoConstraints(): MediaTrackConstraints | boolean {
  const size = { width: { ideal: 640 }, height: { ideal: 480 } };
  if (isMobileUserAgent()) {
    return { ...size, facingMode: { ideal: "user" } };
  }
  return size;
}

export async function acquireCameraTrack(): Promise<{
  track: MediaStreamTrack | null;
  error: string | null;
}> {
  const attempts: MediaStreamConstraints[] = [
    { video: getVideoConstraints(), audio: false },
    { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown = null;

  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getVideoTracks()[0] ?? null;
      stream.getAudioTracks().forEach((t) => t.stop());
      if (track) {
        return { track, error: null };
      }
    } catch (err) {
      lastError = err;
    }
  }

  return { track: null, error: mediaErrorMessage(lastError) };
}

export function mediaErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Camera/mic permission denied. Allow access in browser settings or continue with text only.";
    }
    if (err.name === "NotFoundError") {
      return "No camera or microphone found on this device.";
    }
    if (err.name === "NotReadableError") {
      return "Camera is in use by another app or device (close other tabs, phone camera, or Zoom).";
    }
    if (err.name === "OverconstrainedError") {
      return "Could not use this camera. Try closing other apps that use the camera.";
    }
  }
  return err instanceof Error ? err.message : "Camera/mic access failed";
}
