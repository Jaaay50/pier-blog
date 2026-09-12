"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { TransitionLink } from "@/components/TransitionLink";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

type Line = { kind: "in" | "out"; text: string };

function reply(command: string, zh: boolean): { text: string; href?: string } {
  const token = command.trim().toLowerCase();
  if (token === "" || token === "help") {
    return {
      text: zh
        ? "命令：help · whoami · ls · now · lab · exit。不进导航。"
        : "Commands: help · whoami · ls · now · lab · exit. Not in the nav.",
    };
  }
  if (token === "whoami") {
    return { text: "Ethan Pier · full-stack · AI-native products" };
  }
  if (token === "ls") {
    return {
      text: zh
        ? "流体 物理 流场 粒子 形变 shader SDF 布料 寻路 Raft 频谱 几何 等待 流式 来源 关掉之后"
        : "fluid physics flow particles morph shader sdf cloth pathfinding raft audio geometry wait stream sources afteroff",
    };
  }
  if (token === "now") {
    return {
      text: zh ? "此刻的短动态在 /now。" : "The short status lives at /now.",
      href: "/now",
    };
  }
  if (token === "lab") {
    return { text: zh ? "你已经在船坞。" : "You are already in the lab." };
  }
  if (token === "exit") {
    return { text: "exit" };
  }
  return { text: zh ? `未知命令：${command}` : `Unknown command: ${command}` };
}

export function LabTerminal() {
  const zh = useLocale() === "zh";
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const buffer = useRef<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const next = [...buffer.current, key].slice(-KONAMI.length);
      buffer.current = next;
      if (next.join(",") === KONAMI.join(",")) {
        setOpen(true);
        buffer.current = [];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onFocus = (event: FocusEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        inputRef.current?.focus();
      }
    };
    // 不锁 Tab 循环到页面外；只在打开时把初始焦点放进对话框。
    void onFocus;
  }, [open]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const command = value;
    setValue("");
    const result = reply(command, zh);
    if (result.text === "exit") {
      setOpen(false);
      setLines([]);
      return;
    }
    setLines((current) => [
      ...current,
      { kind: "in", text: command },
      { kind: "out", text: result.text },
    ]);
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={zh ? "船坞终端" : "Lab terminal"}
      className="fixed bottom-4 right-4 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-card)]"
    >
      <p className="mb-2 text-xs text-[var(--text-secondary)]">
        {zh ? "终端彩蛋。Esc 关闭。不是首页。" : "Terminal easter egg. Esc closes. Not the homepage."}
      </p>
      <div className="mb-2 max-h-40 overflow-auto font-mono text-xs text-[var(--text-primary)]">
        {lines.map((line, index) => (
          <p key={`${line.kind}-${index}`}>
            {line.kind === "in" ? "> " : ""}
            {line.text}
          </p>
        ))}
        {lines.some((line) => line.text.includes("/now")) && (
          <p>
            <TransitionLink href="/now" className="underline">
              /now
            </TransitionLink>
          </p>
        )}
      </div>
      <form onSubmit={onSubmit}>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label={zh ? "终端输入" : "Terminal input"}
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 font-mono text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        />
      </form>
    </div>
  );
}
