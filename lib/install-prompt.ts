export const INSTALL_DISMISSED_KEY = "lovarena_install_dismissed";
export const FIRST_CHAT_DONE_KEY = "lovarena_first_chat_done";

export function markFirstChatComplete(): void {
  try {
    localStorage.setItem(FIRST_CHAT_DONE_KEY, "1");
    window.dispatchEvent(new Event("lovarena:first-chat"));
  } catch {
    // ignore
  }
}

export function hasCompletedFirstChat(): boolean {
  try {
    return localStorage.getItem(FIRST_CHAT_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // ignore
  }
}
