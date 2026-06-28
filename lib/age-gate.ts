const AGE_GATE_KEY = "lovarena_age_verified";

export function isAgeVerified(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AGE_GATE_KEY) === "true";
}

export function setAgeVerified(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGE_GATE_KEY, "true");
}

export function clearAgeVerified(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AGE_GATE_KEY);
}

/** Persist browser age confirmation to the logged-in profile row. */
export async function syncProfileAgeVerified(): Promise<boolean> {
  if (typeof window === "undefined" || !isAgeVerified()) return false;

  try {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ age_verified: true }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
