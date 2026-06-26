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
