import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "omegle_user_id";

export function getUserId(): string {
  if (typeof window === "undefined") return "";

  // sessionStorage = one ID per tab (so two tabs in the same browser can match for testing)
  let id = sessionStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
