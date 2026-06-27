export const SOUNDS_STORAGE_KEY = "lovarena_sounds_enabled";

export function soundsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(SOUNDS_STORAGE_KEY) !== "false";
}

export function setSoundsEnabled(on: boolean) {
  localStorage.setItem(SOUNDS_STORAGE_KEY, on ? "true" : "false");
}

function playTone(freq: number, duration: number, volume = 0.08) {
  if (typeof window === "undefined" || !soundsEnabled()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => void ctx.close();
  } catch {
    // ignore autoplay blocks
  }
}

export function playConnectSound() {
  playTone(523, 0.12);
  setTimeout(() => playTone(659, 0.15, 0.07), 100);
}

export function playMessageSound() {
  playTone(880, 0.06, 0.05);
}

export function playNextSound() {
  playTone(392, 0.1, 0.06);
}

export function playMatchCountdownTick() {
  playTone(440, 0.08, 0.05);
}
