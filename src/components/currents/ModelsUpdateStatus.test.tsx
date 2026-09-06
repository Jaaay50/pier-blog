// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import type { ModelsUpdate } from "@/lib/currents/models-types";
import zh from "@/messages/zh.json";
import en from "@/messages/en.json";
import { ModelsUpdateStatus } from "./ModelsUpdateStatus";

const update: ModelsUpdate = {
  lastAttemptAt: "2026-09-07T01:00:00.000Z",
  lastCompleteSuccessAt: "2026-09-06T01:00:00.000Z",
  lastPublishedAt: "2026-09-06T01:01:00.000Z",
  lastContentChangeAt: "2026-09-05T01:00:00.000Z",
  nextScheduledCheckAt: null,
  status: "ok",
  sources: [],
};

function view(value?: ModelsUpdate, detailed = false, locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "en" ? en : zh}>
      <ModelsUpdateStatus update={value} detailed={detailed} sourceNames={{ epoch: "Epoch AI" }} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe("ModelsUpdateStatus", () => {
  it("does not invent an update schedule for legacy APIs", () => {
    const { container } = view();
    expect(container.textContent).toBe("");
  });

  it.each(["zh", "en"])("separates check and content timestamps in %s", (locale) => {
    const { container } = view(update, false, locale);
    const times = Array.from(container.querySelectorAll("time")).map((time) => time.dateTime);
    expect(times).toEqual([update.lastAttemptAt, update.lastContentChangeAt]);
    expect(screen.queryByText(/Next scheduled check|下次计划检查/)).toBeNull();
  });

  it("only shows a next check when supplied by the backend", () => {
    view({ ...update, nextScheduledCheckAt: "2026-09-08T01:00:00.000Z" });
    expect(screen.getByText(/Next scheduled check/)).toBeTruthy();
  });

  it.each(["never", "partial", "failed", "stale", "running"] as const)("announces %s with a distinct message", (status) => {
    view({ ...update, status });
    const key = `modelsUpdateStatus_${status}` as const;
    expect(screen.getByRole("status").textContent).toContain(en.currents[key]);
  });

  it("renders source failures as escaped text only on the detailed view", () => {
    const value: ModelsUpdate = { ...update, status: "partial", sources: [{ sourceId: "epoch", status: "failed", checkedAt: update.lastAttemptAt, error: "<script>bad()</script>" }] };
    const normal = view(value);
    expect(screen.queryByText("<script>bad()</script>")).toBeNull();
    normal.unmount();
    const { container } = view(value, true);
    expect(screen.getByText("Epoch AI")).toBeTruthy();
    expect(screen.getByText("<script>bad()</script>")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/Last all-source success/)).toBeTruthy();
    expect(screen.getByText(/Rankings published/)).toBeTruthy();
  });
});
