"use client";

import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { useLocale } from "next-intl";
import dynamic from "next/dynamic";
import { useWebGLQuality } from "@/lib/webgl";
import { EXPERIENCE_DEMO_IDS, type LabDemoId } from "./lab-demos";

const ParticlePlayground = dynamic(() => import("./ParticlePlayground"), { ssr: false });
const ShaderMixer = dynamic(() => import("./ShaderMixer"), { ssr: false });
const FluidSim = dynamic(() => import("./FluidSim"), { ssr: false });
const PhysicsSandbox = dynamic(() => import("./PhysicsSandbox"), { ssr: false });
const FlowField = dynamic(() => import("./FlowField"), { ssr: false });
const Morph3D = dynamic(() => import("./Morph3D"), { ssr: false });

const SdfRaymarch = dynamic(() => import("./SdfRaymarch"), { ssr: false });
const TearableCloth = dynamic(() => import("./TearableCloth"), { ssr: false });
const PathfindingLab = dynamic(() => import("./PathfindingLab"), { ssr: false });
const RaftLab = dynamic(() => import("./RaftLab"), { ssr: false });
const AudioSpectrum = dynamic(() => import("./AudioSpectrum"), { ssr: false });
const GeometryLab = dynamic(() => import("./GeometryLab"), { ssr: false });
const WaitFeedback = dynamic(() => import("./WaitFeedback"), { ssr: false });
const StreamReading = dynamic(() => import("./StreamReading"), { ssr: false });
const SourceIndependence = dynamic(() => import("./SourceIndependence"), { ssr: false });
const AfterOff = dynamic(() => import("./AfterOff"), { ssr: false });

const EXPERIENCE = new Set<string>(EXPERIENCE_DEMO_IDS);
const WEBGL_DEMOS = new Set(["fluid", "particles", "shader", "morph", "sdf"]);

class DemoBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const controlClass = "rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const LIGHT_DYE: [number, number, number][] = [[0.85, 0.47, 0.34], [0.83, 0.64, 0.5], [0.95, 0.75, 0.5]];
const DARK_DYE: [number, number, number][] = [[0.42, 0.61, 0.8], [0.55, 0.5, 0.8], [0.65, 0.87, 0.97]];

export function LabDemoEnhance({ id, still, alt }: { id: LabDemoId; still: string; alt: string }) {
  const zh = useLocale() === "zh";
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [nearView, setNearView] = useState(false);
  const [ready, setReady] = useState(false);
  const callbackEpoch = useRef(0);
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [gravityOn, setGravityOn] = useState(true);
  const [ballCount, setBallCount] = useState(5);
  const [attract, setAttract] = useState(true);
  const [flowHue, setFlowHue] = useState(200);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearView(true); observer.disconnect(); }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const runToken = useRef(0);
  const availability =
    !!quality &&
    (EXPERIENCE.has(id) ||
      (!quality.reducedMotion && (!WEBGL_DEMOS.has(id) || quality.enabled)));
  const availableRef = useRef(availability);
  useEffect(() => {
    availableRef.current = availability;
    if (!availability) queueMicrotask(() => { if (mounted.current) { setReady(false); setFailed(false); } });
  }, [availability]);
  const onReadyChange = useCallback((value: boolean) => {
    if (generation !== runToken.current) return;
    const epoch = ++callbackEpoch.current;
    const token = generation;
    queueMicrotask(() => {
      if (!mounted.current || epoch !== callbackEpoch.current || token !== runToken.current || !availableRef.current) return;
      setReady(value);
      if (!value) setFailed(true);
    });
  }, [generation]);
  const onError = useCallback(() => onReadyChange(false), [onReadyChange]);
  const reset = () => {
    callbackEpoch.current++; runToken.current++; setReady(false); setFailed(false); setGeneration(runToken.current);
    setGravityOn(true); setBallCount(5); setAttract(true); setFlowHue(200); setAutoRotate(true);
  };
  const isDark = resolvedTheme === "dark";
  const canRun = availability;
  const active = canRun && nearView && !failed;
  const hasOwnReset = ["sdf", "cloth", "pathfinding", "raft", "audio", "geometry", "wait", "stream", "sources", "afteroff"].includes(id);
  const showOverlayReset = canRun && nearView && (!hasOwnReset || !ready || failed);
  let content: ReactNode = null;

  if (active && quality) {
    const shared = { quality, isDark, onReadyChange };
    if (id === "fluid") content = <FluidSim {...shared} dyeColors={isDark ? DARK_DYE : LIGHT_DYE} />;
    if (id === "physics") content = (
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1"><PhysicsSandbox {...shared} gravityOn={gravityOn} onBallCount={setBallCount} /></div>
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <output className="text-sm text-[var(--text-secondary)]" aria-live="polite">{ballCount} {zh ? "个小球" : "balls"}</output>
          <button type="button" aria-pressed={gravityOn} onClick={() => setGravityOn((g) => !g)} className={controlClass}>{zh ? "重力" : "Gravity"} {gravityOn ? "ON" : "OFF"}</button>
        </div>
      </div>
    );
    if (id === "flow") content = (
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1"><FlowField {...shared} attract={attract} hue={flowHue} /></div>
        <div className="flex items-center gap-3 border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <button type="button" aria-pressed={attract} onClick={() => setAttract((a) => !a)} className={controlClass}>{attract ? zh ? "吸引" : "Attract" : zh ? "排斥" : "Repel"}</button>
          <label className="flex flex-1 items-center gap-2 text-xs text-[var(--text-secondary)]">{zh ? "色相" : "Hue"}<input type="range" min={0} max={360} value={flowHue} onChange={(e) => setFlowHue(Number(e.target.value))} className="lab-slider min-w-0 flex-1" /></label>
        </div>
      </div>
    );
    if (id === "particles") content = <ParticlePlayground {...shared} labels={{ count: zh ? "粒子数量" : "Particle Count", spread: zh ? "分布半径" : "Spread Radius", speed: zh ? "运动速度" : "Motion Speed", hover: zh ? "交互强度" : "Interaction", rotation: zh ? "禁用自转" : "Disable Rotation" }} />;
    if (id === "morph") content = (
      <div className="flex h-full flex-col">
        <div className="relative min-h-0 flex-1"><Morph3D {...shared} autoRotate={autoRotate} /></div>
        <div className="flex items-center justify-end border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3"><button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate((a) => !a)} className={controlClass}>{zh ? "自动旋转" : "Auto Rotate"} {autoRotate ? "ON" : "OFF"}</button></div>
      </div>
    );
    if (id === "shader") content = <ShaderMixer {...shared} labels={{ hue: zh ? "色相" : "Hue", flow: zh ? "流速" : "Flow Speed", turbulence: zh ? "湍流" : "Turbulence", zoom: zh ? "缩放" : "Zoom", randomize: zh ? "随机参数" : "Randomize" }} />;
    if (id === "sdf") content = <SdfRaymarch isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "cloth") content = <TearableCloth isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "pathfinding") content = <PathfindingLab isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "raft") content = <RaftLab isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "audio") content = <AudioSpectrum isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "geometry") content = <GeometryLab isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "wait") content = <WaitFeedback isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "stream") content = <StreamReading isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "sources") content = <SourceIndependence isDark={isDark} onReadyChange={onReadyChange} />;
    if (id === "afteroff") content = <AfterOff isDark={isDark} onReadyChange={onReadyChange} />;

  }

  return (
    <div ref={host} className="relative h-full w-full bg-[var(--bg-primary)]" data-demo={id} data-ready={ready && active}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SSR fallback must survive unavailable WebGL. */}
      <img src={still} alt={alt} width={960} height={540} loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${ready && active ? "invisible" : ""}`} />
      {active && <div inert={!ready} aria-hidden={!ready} className={`absolute inset-0 ${ready ? "" : "opacity-0"}`}><DemoBoundary key={generation} onError={onError}>{content}</DemoBoundary></div>}
      {showOverlayReset && <button type="button" onClick={reset} className={`absolute right-3 top-3 z-10 ${controlClass}`} aria-label={`${zh ? "重置演示" : "Reset demo"}: ${id}`}>{failed ? zh ? "重试" : "Retry" : zh ? "重置" : "Reset"}</button>}
      {failed && <div role="status" className="absolute inset-x-4 bottom-4 rounded-lg bg-[var(--bg-card)] p-3 text-sm text-[var(--text-primary)]">{zh ? "演示无法运行，请重试。" : "Unable to run this demo. Please retry."}</div>}
    </div>
  );
}
