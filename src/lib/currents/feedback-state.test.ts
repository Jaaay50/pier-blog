import { describe, expect, it } from "vitest";
import {
  FEEDBACK_STORAGE_KEY,
  FEEDBACK_STORAGE_LIMIT,
  feedbackSubmittedKey,
  markFeedbackSubmittedKey,
  readFeedbackSubmittedKeys,
} from "./feedback-state";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("feedback localStorage tracker", () => {
  it("损坏或非数组数据安全回落为空集合", () => {
    const storage = new MemoryStorage();
    storage.setItem(FEEDBACK_STORAGE_KEY, "{bad json");
    expect([...readFeedbackSubmittedKeys(storage)]).toEqual([]);
    storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify({ nope: true }));
    expect([...readFeedbackSubmittedKeys(storage)]).toEqual([]);
  });

  it("按 target type/id/category 生成独立键并去重", () => {
    const storage = new MemoryStorage();
    const item = feedbackSubmittedKey("item", "item-1", "broken_link");
    const event = feedbackSubmittedKey("event", "event-1", "broken_link");
    markFeedbackSubmittedKey(storage, item);
    markFeedbackSubmittedKey(storage, item);
    markFeedbackSubmittedKey(storage, event);
    expect([...readFeedbackSubmittedKeys(storage)]).toEqual([item, event]);
  });

  it("最多保留最近 200 条，防止 storage 膨胀", () => {
    const storage = new MemoryStorage();
    for (let i = 0; i < FEEDBACK_STORAGE_LIMIT + 5; i++) {
      markFeedbackSubmittedKey(storage, `item:item-${i}:other`);
    }
    const keys = [...readFeedbackSubmittedKeys(storage)];
    expect(keys).toHaveLength(FEEDBACK_STORAGE_LIMIT);
    expect(keys[0]).toBe("item:item-5:other");
    expect(keys.at(-1)).toBe("item:item-204:other");
  });
});
