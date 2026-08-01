"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Renderer, Camera, Transform, Geometry, Program, Mesh } from "ogl";
import { useWebGLQuality, observeRenderGate } from "@/lib/webgl";
import { useScroll, useTransform, motion } from "motion/react";

/**
 * Phase 9.3 — 波动网格分隔带
 *
 * ogl LINES 3D 网格，滚动驱动波浪相位：
 * - 横向 + 纵向线，节点随 sin(x+t) * cos(y+t) 波动
 * - 滚动进入视口时相位加速，形成呼吸感
 * - 替代文章画廊与 footer 之间的纯空白留白
 */

const vertex = /* glsl */ `
attribute vec3 position;
attribute float phase;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColor;

varying float vIntensity;

void main() {
  vec3 pos = position;
  float wave = sin(pos.x * 1.8 + uTime + phase) * cos(pos.z * 1.4 + uTime * 0.7) * uAmplitude;
  pos.y += wave;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // 按高度映射亮度
  vIntensity = (wave / uAmplitude) * 0.5 + 0.5;
}
`;

const fragment = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vIntensity;

void main() {
  gl_FragColor = vec4(uColor * (0.4 + vIntensity * 0.6), 0.6 + vIntensity * 0.4);
}
`;

function buildGrid(cols: number, rows: number): { positions: Float32Array; phases: Float32Array } {
  const posArr: number[] = [];
  const phaseArr: number[] = [];

  const push = (x: number, y: number, z: number, p: number) => {
    posArr.push(x, y, z);
    phaseArr.push(p);
  };

  // 横线
  for (let j = 0; j <= rows; j++) {
    const z = (j / rows - 0.5) * 4;
    for (let i = 0; i < cols; i++) {
      const x0 = (i / cols - 0.5) * 8;
      const x1 = ((i + 1) / cols - 0.5) * 8;
      const p = j * 0.3;
      push(x0, 0, z, p);
      push(x1, 0, z, p);
    }
  }

  // 纵线
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols - 0.5) * 8;
    for (let j = 0; j < rows; j++) {
      const z0 = (j / rows - 0.5) * 4;
      const z1 = ((j + 1) / rows - 0.5) * 4;
      const p = i * 0.2;
      push(x, 0, z0, p);
      push(x, 0, z1, p);
    }
  }

  return {
    positions: new Float32Array(posArr),
    phases: new Float32Array(phaseArr),
  };
}

export function WaveGrid() {
  const hostRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();

  const { scrollYProgress } = useScroll({
    target: hostRef,
    offset: ["start end", "end start"],
  });
  // 滚动时波幅增大
  const amplitude = useTransform(scrollYProgress, [0, 0.5, 1], [0.05, 0.22, 0.05]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !quality?.enabled || quality.reducedMotion) return;

    const isDark = resolvedTheme === "dark";
    const color = isDark ? [0.42, 0.61, 0.8] : [0.85, 0.47, 0.34];
    const cols = quality.tier === "high" ? 28 : 18;
    const rows = quality.tier === "high" ? 14 : 9;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, dpr: quality.dpr });
    } catch {
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    host.appendChild(gl.canvas);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";

    const camera = new Camera(gl, { fov: 40 });
    camera.position.set(0, 3.5, 5);
    camera.lookAt([0, 0, 0]);

    const scene = new Transform();
    const { positions, phases } = buildGrid(cols, rows);

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      phase: { size: 1, data: phases },
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uAmplitude: { value: 0.12 },
        uColor: { value: color },
      },
      transparent: true,
    });

    const mesh = new Mesh(gl, { mode: gl.LINES, geometry, program });
    mesh.setParent(scene);

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let raf: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (lastTime !== null) elapsed += t - lastTime;
      lastTime = t;

      program.uniforms.uTime.value = elapsed * 0.001;
      program.uniforms.uAmplitude.value = amplitude.get();

      renderer.render({ scene, camera });
    };

    const startLoop = () => {
      if (raf === null) {
        lastTime = null;
        raf = requestAnimationFrame(frame);
      }
    };
    const stopLoop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    startLoop();
    const stopGate = observeRenderGate(host, (active) => (active ? startLoop() : stopLoop()));

    return () => {
      stopGate();
      stopLoop();
      ro.disconnect();
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [quality, resolvedTheme, amplitude]);

  if (!quality?.enabled || quality.reducedMotion) {
    return <div className="h-px w-full bg-[var(--border)]" />;
  }

  return (
    <motion.div
      ref={hostRef}
      className="relative h-48 w-full overflow-hidden"
      aria-hidden
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2 }}
    />
  );
}
