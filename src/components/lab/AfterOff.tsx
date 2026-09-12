"use client";

import { FormEvent, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { LabButton, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

export default function AfterOff({ isDark, onReadyChange }: NewDemoProps) {
  const zh = useLocale() === "zh";
  const [animation, setAnimation] = useState(true);
  const [pointerLayer, setPointerLayer] = useState(true);
  const [webglLayer, setWebglLayer] = useState(true);
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
    <div className="relative flex h-full flex-col bg-[var(--bg-primary)]">
      {webglLayer && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 opacity-40 ${animation ? "afteroff-glow" : ""}`}
          style={{
            background: isDark
              ? "radial-gradient(circle at 30% 20%, rgba(106,155,204,0.35), transparent 55%)"
              : "radial-gradient(circle at 30% 20%, rgba(217,119,87,0.28), transparent 55%)",
          }}
        />
      )}
      {pointerLayer && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          data-pointer-deco=""
        />
      )}
      <p className="relative border-b border-[var(--border)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {zh
          ? "实验：关掉动画、指针装饰或 WebGL 层之后，下面的表单仍可完成。焦点不会被锁住。"
          : "Experiment: turn off animation, the pointer deco, or the WebGL layer. The form still completes. Focus is never trapped."}
      </p>
      <form className="relative z-10 flex min-h-0 flex-1 flex-col gap-4 p-5" onSubmit={onSubmit}>
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
        <output className="text-sm text-[var(--text-secondary)]" aria-live="polite">
          {submitted
            ? zh ? `已记下：${submitted}` : `Recorded: ${submitted}`
            : zh ? "还没有提交。" : "Nothing submitted yet."}
        </output>
      </form>
      <LabToolbar>
        <LabButton aria-pressed={!animation} onClick={() => setAnimation((value) => !value)}>
          {zh ? "关闭动画" : "Animation off"} {animation ? "ON" : "OFF"}
        </LabButton>
        <LabButton aria-pressed={!pointerLayer} onClick={() => setPointerLayer((value) => !value)}>
          {zh ? "指针装饰" : "Pointer deco"} {pointerLayer ? "ON" : "OFF"}
        </LabButton>
        <LabButton aria-pressed={!webglLayer} onClick={() => setWebglLayer((value) => !value)}>
          {zh ? "WebGL 层" : "WebGL layer"} {webglLayer ? "ON" : "OFF"}
        </LabButton>
      </LabToolbar>
    </div>
  );
}
