"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { LabButton, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

export default function AfterOff({ onReadyChange }: NewDemoProps) {
  const zh = useLocale() === "zh";
  const [animation, setAnimation] = useState(true);
  const [background, setBackground] = useState(true);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState("");

  useEffect(() => {
    onReadyChange?.(true);
    return () => onReadyChange?.(false);
  }, [onReadyChange]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    setSubmitted(value);
  };

  return (
    <div className="relative bg-[var(--bg-primary)]">
      {background && (
        <div
          aria-hidden
          className={`lab-afteroff-backdrop pointer-events-none absolute inset-0 opacity-40 ${animation ? "afteroff-glow" : ""}`}
        />
      )}
      <form className="relative z-10 flex flex-col gap-4 p-5" onSubmit={onSubmit}>
        <label className="flex flex-col gap-2 text-sm text-[var(--text-primary)]">
          {zh ? "给这艘船起个名字" : "Name this boat"}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            maxLength={40}
            required
          />
        </label>
        <LabButton type="submit" className="self-start px-4 py-2">{zh ? "完成" : "Finish"}</LabButton>
        <output className="text-sm text-[var(--text-secondary)] [overflow-wrap:anywhere]" aria-live="polite">
          {submitted
            ? zh ? `已记下：${submitted}` : `Recorded: ${submitted}`
            : zh ? "还没有提交。" : "Nothing submitted yet."}
        </output>
      </form>
      <LabToolbar>
        <label className="flex min-h-11 items-center gap-2 px-2 text-sm text-[var(--text-primary)]">
          <input type="checkbox" checked={animation} onChange={(event) => setAnimation(event.target.checked)} className="accent-[var(--accent)]" />
          {zh ? "动画" : "Animation"}
        </label>
        <label className="flex min-h-11 items-center gap-2 px-2 text-sm text-[var(--text-primary)]">
          <input type="checkbox" checked={background} onChange={(event) => setBackground(event.target.checked)} className="accent-[var(--accent)]" />
          {zh ? "CSS 背景光" : "CSS background glow"}
        </label>
      </LabToolbar>
    </div>
  );
}
