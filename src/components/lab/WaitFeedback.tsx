"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { LabButton, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

const DURATION_MS = 3000;
type Mode = "real" | "none" | "unreliable";
type Phase = "idle" | "running" | "done";

function unreliableProgress(t: number): number {
  if (t < 0.2) return t * 2.2;
  if (t < 0.45) return 0.72 + (t - 0.2) * 0.4;
  if (t < 0.7) return 0.28 + (t - 0.45) * 0.15;
  return Math.min(1, 0.55 + (t - 0.7) * 1.6);
}

function Panel({ mode }: { mode: Mode }) {
  const zh = useLocale() === "zh";
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);

  const start = () => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      setPhase("done");
      return;
    }
    setProgress(0);
    setPhase("running");
  };

  useEffect(() => {
    if (phase !== "running") return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION_MS);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setPhase("done");
    };
    frame = requestAnimationFrame(tick);
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const finish = () => {
      if (!media?.matches) return;
      cancelAnimationFrame(frame);
      setProgress(1);
      setPhase("done");
    };
    media?.addEventListener("change", finish);
    finish();
    return () => { cancelAnimationFrame(frame); media?.removeEventListener("change", finish); };
  }, [phase]);
  const shown =
    mode === "real" ? progress : mode === "unreliable" ? unreliableProgress(progress) : 0;
  const label =
    mode === "real"
      ? zh ? "真实进度" : "True progress"
      : mode === "none"
        ? zh ? "无反馈" : "No feedback"
        : zh ? "不可靠进度" : "Unreliable progress";
  const status =
    phase === "idle"
      ? zh ? "未开始" : "Idle"
      : phase === "running"
        ? mode === "none"
          ? zh ? "处理中…" : "Working…"
          : `${Math.round(shown * 100)}%`
        : zh ? "完成" : "Done";

  return (
    <div className="flex min-w-0 flex-col gap-3 p-4">
      <h4 className="text-sm font-medium text-[var(--text-primary)]">{label}</h4>
      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
        {mode === "real"
          ? zh ? "三秒内按实际时间前进。" : "Advances with real elapsed time."
          : mode === "none"
            ? zh ? "只有一句「处理中」，没有进度。" : "A busy label, and nothing else."
            : zh ? "进度条会乱跳，不能拿它当事实。" : "The bar jumps. Do not treat it as truth."}
      </p>
      {mode !== "none" && (
        <div
          className="h-2 shrink-0 overflow-hidden rounded-full bg-[var(--bg-card)]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={phase === "idle" ? 0 : Math.round(shown * 100)}
          aria-label={label}
        >
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${phase === "idle" ? 0 : shown * 100}%` }}
          />
        </div>
      )}
      <output className="text-xs tabular-nums text-[var(--text-primary)]" aria-live="polite">
        {status}
      </output>
      <LabButton
        className="min-h-11"
        onClick={start}
        disabled={phase === "running"}
      >
        {phase === "done" ? (zh ? "再等一次" : "Wait again") : zh ? "等待三秒" : "Wait 3 seconds"}
      </LabButton>
    </div>
  );
}

export default function WaitFeedback({ onReadyChange }: NewDemoProps) {
  const zh = useLocale() === "zh";
  useEffect(() => {
    onReadyChange?.(true);
    return () => onReadyChange?.(false);
  }, [onReadyChange]);

  return (
    <div className="bg-[var(--bg-primary)]">
      <div className="grid divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-y-0">
        <Panel mode="real" />
        <Panel mode="none" />
        <Panel mode="unreliable" />
      </div>
      <LabToolbar>
        <span className="text-xs text-[var(--text-secondary)]">
          {zh ? "三秒实验，不会提交任何数据。" : "A three-second experiment. No data is submitted."}
        </span>
      </LabToolbar>
    </div>
  );
}
