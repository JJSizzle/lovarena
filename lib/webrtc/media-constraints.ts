export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);
}

function assertMediaDevices(): void {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      "Camera not available — use HTTPS in Chrome, Edge, or Firefox.",
      "NotSupportedError"
    );
  }
}

const defaultAudio: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
};

/** Desktop webcams often fail when facingMode is required; phones need user-facing cam. */
export function getVideoConstraints(): MediaTrackConstraints | boolean {
  const size = { width: { ideal: 640 }, height: { ideal: 480 } };
  if (isMobileUserAgent()) {
    return { ...size, facingMode: { ideal: "user" } };
  }
  return size;
}

async function tryGetUserMedia(
  constraints: MediaStreamConstraints
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return null;
  }
}

/** Try each known camera when generic constraints fail (common on Windows). */
async function tryEachVideoDevice(
  withAudio: boolean
): Promise<MediaStream | null> {
  let devices: MediaDeviceInfo[] = [];
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch {
    return null;
  }

  const videoInputs = devices.filter((d) => d.kind === "videoinput");
  for (const device of videoInputs) {
    const video: boolean | MediaTrackConstraints = device.deviceId
      ? { deviceId: { exact: device.deviceId } }
      : true;
    const stream = await tryGetUserMedia({
      video,
      audio: withAudio ? defaultAudio : false,
    });
    if (stream?.getVideoTracks()[0]) return stream;
    stream?.getTracks().forEach((t) => t.stop());
  }
  return null;
}

export async function acquireLocalMedia(voiceOnly: boolean): Promise<MediaStream> {
  assertMediaDevices();

  let lastError: unknown = null;

  if (voiceOnly) {
    const stream = await tryGetUserMedia({ video: false, audio: defaultAudio });
    if (stream) return stream;
    throw new DOMException("Could not open microphone.", "NotFoundError");
  }

  const attempts: MediaStreamConstraints[] = [
    { video: getVideoConstraints(), audio: defaultAudio },
    { video: true, audio: defaultAudio },
    { video: { width: 640, height: 480 }, audio: defaultAudio },
  ];

  for (const constraints of attempts) {
    const stream = await tryGetUserMedia(constraints);
    if (stream?.getVideoTracks()[0]) return stream;
    stream?.getTracks().forEach((t) => t.stop());
  }

  const perDevice = await tryEachVideoDevice(true);
  if (perDevice) return perDevice;

  // Some desktops block mic but allow cam — still show local preview + negotiate video.
  const videoOnlyAttempts: MediaStreamConstraints[] = [
    { video: getVideoConstraints(), audio: false },
    { video: true, audio: false },
  ];
  for (const constraints of videoOnlyAttempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (stream.getVideoTracks()[0]) return stream;
      stream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      lastError = err;
    }
  }

  const videoOnlyPerDevice = await tryEachVideoDevice(false);
  if (videoOnlyPerDevice) return videoOnlyPerDevice;

  throw lastError ?? new DOMException("Could not open camera.", "NotReadableError");
}

export async function acquireCameraTrack(): Promise<{
  track: MediaStreamTrack | null;
  error: string | null;
}> {
  assertMediaDevices();

  const attempts: MediaStreamConstraints[] = [
    { video: getVideoConstraints(), audio: false },
    { video: true, audio: false },
  ];

  for (const constraints of attempts) {
    const stream = await tryGetUserMedia(constraints);
    const track = stream?.getVideoTracks()[0] ?? null;
    stream?.getAudioTracks().forEach((t) => t.stop());
    if (track) return { track, error: null };
    stream?.getTracks().forEach((t) => t.stop());
  }

  const perDevice = await tryEachVideoDevice(false);
  const track = perDevice?.getVideoTracks()[0] ?? null;
  if (track) {
    perDevice!.getAudioTracks().forEach((t) => t.stop());
    return { track, error: null };
  }
  perDevice?.getTracks().forEach((t) => t.stop());

  let lastError: unknown = null;
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (err) {
    lastError = err;
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
      return "Camera is in use by another app or device (close other tabs, phone camera, or Zoom). Also check Windows Settings → Privacy → Camera.";
    }
    if (err.name === "OverconstrainedError") {
      return "Could not use this camera. Try closing other apps that use the camera.";
    }
    if (err.name === "NotSupportedError") {
      return err.message || "Camera not supported in this browser or context.";
    }
  }
  return err instanceof Error ? err.message : "Camera/mic access failed";
}
