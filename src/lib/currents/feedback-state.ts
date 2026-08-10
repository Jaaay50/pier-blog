export const FEEDBACK_STORAGE_KEY = "pier-currents-feedback-v1";
export const FEEDBACK_STORAGE_LIMIT = 200;

/** localStorage 只是防误触提示，不是安全或幂等边界。 */
export function readFeedbackSubmittedKeys(storage?: Pick<Storage, "getItem">): Set<string> {
  if (!storage) return new Set();
  try {
    const raw = storage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

export function markFeedbackSubmittedKey(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  key: string,
): void {
  if (!storage) return;
  try {
    const all = Array.from(readFeedbackSubmittedKeys(storage));
    if (!all.includes(key)) all.push(key);
    storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(all.slice(-FEEDBACK_STORAGE_LIMIT)));
  } catch {
    /* 配额满、隐私模式等异常静默；后端幂等仍然有效 */
  }
}

export function feedbackSubmittedKey(targetType: "item" | "event", targetId: string, category: string): string {
  return `${targetType}:${targetId}:${category}`;
}
