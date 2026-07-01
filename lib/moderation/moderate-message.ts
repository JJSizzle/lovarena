import { scanMessageForSevereViolation } from "./scan-message";
import { scanMessageForSpam } from "./scan-spam";

export type MessageModerationResult =
  | { allowed: true }
  | {
      allowed: false;
      kind: "severe" | "spam";
      userMessage: string;
    };

const SPAM_USER_MESSAGE =
  "Message blocked — links and off-platform contact requests aren't allowed in chat.";

const SEVERE_USER_MESSAGE =
  "Message blocked due to a severe policy violation.";

export function moderateMessageContent(content: string): MessageModerationResult {
  const severe = scanMessageForSevereViolation(content);
  if (severe.violation) {
    return {
      allowed: false,
      kind: "severe",
      userMessage: SEVERE_USER_MESSAGE,
    };
  }

  const spam = scanMessageForSpam(content);
  if (spam.violation) {
    return {
      allowed: false,
      kind: "spam",
      userMessage: SPAM_USER_MESSAGE,
    };
  }

  return { allowed: true };
}
