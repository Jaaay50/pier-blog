"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

if (process.env.NODE_ENV === "production" && TURNSTILE_SITE_KEY === "") {
  throw new Error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required in production builds");
}

interface TurnstileRenderOptions {
  sitekey: string;
  action: string;
  appearance: "interaction-only";
  theme: "auto";
  language: "auto";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void;
}

export function resetTurnstileScriptForTests(): void {
  if (process.env.NODE_ENV !== "test") return;
  scriptReady = null;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpired: () => void;
  onError: () => void;
  /** Turnstile action 名；默认反馈提交。留言墙用 guestbook_submit。 */
  action?: "feedback_submit" | "guestbook_submit";
}

let scriptReady: Promise<void> | null = null;
const TURNSTILE_API_WAIT_MS = 5_000;
const TURNSTILE_API_POLL_MS = 25;

function waitForTurnstileApi(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      if (window.turnstile) {
        resolve();
      } else if (Date.now() - startedAt >= TURNSTILE_API_WAIT_MS) {
        reject(new Error("Turnstile API was not available after script load"));
      } else {
        window.setTimeout(poll, TURNSTILE_API_POLL_MS);
      }
    };
    poll();
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptReady) return scriptReady.then(waitForTurnstileApi);

  scriptReady = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Turnstile script load timed out")), 10_000);
    const ready = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    const failed = (error: Error) => {
      window.clearTimeout(timeout);
      reject(error);
    };
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    );
    if (existing) {
      if (window.turnstile) {
        ready();
        return;
      }
      if (existing.dataset.turnstileLoaded === "true") {
        void waitForTurnstileApi().then(ready, failed);
        return;
      }
      existing.addEventListener("load", () => {
        existing.dataset.turnstileLoaded = "true";
        void waitForTurnstileApi().then(ready, failed);
      }, { once: true });
      existing.addEventListener("error", () => failed(new Error("Turnstile script failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.dataset.pierTurnstile = "true";
    script.addEventListener("load", () => {
      script.dataset.turnstileLoaded = "true";
      void waitForTurnstileApi().then(ready, failed);
    }, { once: true });
    script.addEventListener("error", () => failed(new Error("Turnstile script failed to load")), { once: true });
    document.head.appendChild(script);
  });
  scriptReady = scriptReady.catch((error: unknown) => {
    scriptReady = null;
    document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"][data-pier-turnstile="true"]`,
    )?.remove();
    throw error;
  });
  return scriptReady;
}

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken, onExpired, onError, action = "feedback_submit" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const callbacksRef = useRef({ onToken, onExpired, onError });
    callbacksRef.current = { onToken, onExpired, onError };

    useImperativeHandle(ref, () => ({
      reset() {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        } else {
          setAttempt((value) => value + 1);
        }
      },
    }), []);

    useEffect(() => {
      let disposed = false;
      loadTurnstileScript()
        .then(() => {
          if (disposed || !containerRef.current || !window.turnstile || widgetIdRef.current !== null) return;
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            action,
            appearance: "interaction-only",
            theme: "auto",
            language: "auto",
            callback: (token) => { if (!disposed) callbacksRef.current.onToken(token); },
            "expired-callback": () => { if (!disposed) callbacksRef.current.onExpired(); },
            "error-callback": () => { if (!disposed) callbacksRef.current.onError(); },
          });
        })
        .catch(() => {
          if (!disposed) callbacksRef.current.onError();
        });

      return () => {
        disposed = true;
        if (widgetIdRef.current !== null && window.turnstile?.remove) {
          window.turnstile.remove(widgetIdRef.current);
        }
        widgetIdRef.current = null;
      };
    }, [attempt, action]);

    return <div ref={containerRef} />;
  },
);
