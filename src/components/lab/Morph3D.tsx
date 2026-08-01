"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Geometry, Vec3 } from "ogl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — 3D 形变
 *
 * ogl POINTS 参数曲面 per-point stagger morph：
 * - 4 种形态：球 → 环面结 → 立方 → 波面
 * - 鼠标拖拽旋转（惯性）
 * - 点击/自动轮播切换形态
 * - per-point delay 使形变有流体感
 */

const COUNT = 80; // 每维度采样数（total = COUNT²）

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec3 targetPos;
attribute float delay;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uMorphProgress;
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform float uPointSize;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float p = clamp(uMorphProgress * 1.3 - delay * 0.3, 0.0, 1.0);
  p = p * p * (3.0 - 2.0 * p);
  
  vec3 pos = mix(position, targetPos, p);
  
  // 轻微扰动
  float wobble = sin(uTime * 1.2 + delay * 6.2831) * 0.02;
  pos += normalize(pos + 0.001) * wobble;
  
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = uPointSize * (200.0 / -mvPos.z);
  
  float mixer = (pos.y + 1.5) / 3.0;
  vColor = mix(uColor1, uColor2, mixer);
  vAlpha = 0.8 + 0.2 * sin(uTime + delay * 3.14);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.2, d) * vAlpha;
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

type Shape = "sphere" | "torus" | "cube" | "wave";

function generateSphere(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * Math.PI;
      const v = (j / (count - 1)) * Math.PI * 2;
      arr.push(
        Math.sin(u) * Math.cos(v),
        Math.cos(u),
        Math.sin(u) * Math.sin(v)
      );
    }
  }
  return new Float32Array(arr);
}

function generateTorus(count: number): Float32Array {
  const arr: number[] = [];
  const R = 1.0, r = 0.4;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * Math.PI * 2;
      const v = (j / (count - 1)) * Math.PI * 2;
      arr.push(
        (R + r * Math.cos(v)) * Math.cos(u),
        r * Math.sin(v),
        (R + r * Math.cos(v)) * Math.sin(u)
      );
    }
  }
  return new Float32Array(arr);
}

function generateCube(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1)) * 2 - 1;
      const v = (j / (count - 1)) * 2 - 1;
      const face = Math.floor(Math.random() * 6);
      switch (face) {
        case 0: arr.push(1, u, v); break;
        case 1: arr.push(-1, u, v); break;
        case 2: arr.push(u, 1, v); break;
        case 3: arr.push(u, -1, v); break;
        case 4: arr.push(u, v, 1); break;
        default: arr.push(u, v, -1);
      }
    }
  }
  return new Float32Array(arr);
}

function generateWave(count: number): Float32Array {
  const arr: number[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      const u = (i / (count - 1) - 0.5) * 4;
      const v = (j / (count - 1) - 0.5) * 4;
      const y = Math.sin(u * 1.5) * Math.cos(v * 1.5) * 0.6;
      arr.push(u * 0.4, y, v * 0.4);
    }
  }
  return new Float32Array(arr);
}

const SHAPES: Shape[] = ["sphere", "torus", "cube", "wave"];

interface Morph3DProps {
  quality: WebGLQuality;
  autoRotate: boolean;
  isDark: boolean;
  onShapeChange?: (shape: Shape) => void;
}

export default function Morph3D({ quality, autoRotate, isDark, onShapeChange }: Morph3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [currentShape, setCurrentShape] = useState<Shape>("sphere");

  const nextShape = () => {
    const idx = SHAPES.indexOf(currentShape);
    const next = SHAPES[(idx + 1) % SHAPES.length];
    setCurrentShape(next);
    onShapeChange?.(next);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ alpha: true, dpr: quality.dpr });
    } catch {
      return;
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    host.appendChild(gl.canvas);

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 相机（透视投影手动模拟）
    const camera = { position: new Vec3(0, 0, 3.5), fov: 45 };
    const aspect = () => host.clientWidth / host.clientHeight;
    const projectionMatrix = () => {
      const f = 1 / Math.tan((camera.fov * Math.PI) / 360);
      const a = aspect();
      const near = 0.1, far = 100;
      return [
        f / a, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0,
      ];
    };

    const shapes: Record<Shape, Float32Array> = {
      sphere: generateSphere(COUNT),
      torus: generateTorus(COUNT),
      cube: generateCube(COUNT),
      wave: generateWave(COUNT),
    };

    const delays = new Float32Array(COUNT * COUNT);
    for (let i = 0; i < delays.length; i++) delays[i] = Math.random();

    const geometry = new Geometry(gl, {
      position: { size: 3, data: shapes.sphere },
      targetPos: { size: 3, data: shapes.sphere },
      delay: { size: 1, data: delays },
    });

    const getColors = () => {
      if (isDark) return [[0.42, 0.61, 0.8], [0.55, 0.5, 0.8]];
      return [[0.85, 0.47, 0.34], [0.83, 0.64, 0.5]];
    };

    const [c1, c2] = getColors();
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uMorphProgress: { value: 1 },
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uColor1: { value: c1 },
        uColor2: { value: c2 },
        uPointSize: { value: quality.dpr * 2.5 },
        projectionMatrix: { value: projectionMatrix() },
      },
      transparent: true,
      depthTest: false,
    });

    const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let rotX = 0.2, rotY = 0;
    let rotVX = 0, rotVY = 0;
    let targetRotX = rotX, targetRotY = rotY;
    let dragging = false;
    let lastMX = 0, lastMY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastMX = e.clientX;
      lastMY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastMX;
      const dy = e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      targetRotY += dx * 0.01;
      targetRotX -= dy * 0.01;
      targetRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, targetRotX));
    };

    const onPointerUp = () => { dragging = false; };

    gl.canvas.addEventListener("pointerdown", onPointerDown);
    gl.canvas.addEventListener("pointermove", onPointerMove);
    gl.canvas.addEventListener("pointerup", onPointerUp);
    gl.canvas.addEventListener("pointerleave", onPointerUp);

    let raf: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;
    let morphProgress = 1;
    let morphing = false;
    let shapeIndex = 0;

    const startMorph = (nextIndex: number) => {
      const from = SHAPES[shapeIndex];
      const to = SHAPES[nextIndex];
      geometry.attributes.position.data = shapes[from];
      geometry.attributes.targetPos.data = shapes[to];
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.targetPos.needsUpdate = true;
      morphProgress = 0;
      morphing = true;
      shapeIndex = nextIndex;
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (lastTime !== null) elapsed += t - lastTime;
      lastTime = t;
      const dt = Math.min(16, lastTime ? t - lastTime : 16) / 1000;

      if (morphing) {
        morphProgress += dt * 0.8;
        if (morphProgress >= 1) {
          morphProgress = 1;
          morphing = false;
        }
      }

      rotVX += (targetRotX - rotX) * 0.1;
      rotVY += (targetRotY - rotY) * 0.1;
      rotVX *= 0.92;
      rotVY *= 0.92;
      rotX += rotVX;
      rotY += rotVY;
      if (autoRotate && !dragging) rotY += dt * 0.3;

      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const modelView = [
        cosY, sinX * sinY, cosX * sinY, 0,
        0, cosX, -sinX, 0,
        -sinY, sinX * cosY, cosX * cosY, 0,
        0, 0, -camera.position.z, 1,
      ];

      program.uniforms.uMorphProgress.value = morphProgress;
      program.uniforms.uTime.value = elapsed * 0.001;
      program.uniforms.modelViewMatrix = { value: modelView };
      program.uniforms.projectionMatrix.value = projectionMatrix();

      renderer.render({ scene: mesh });
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

    // 响应外部 shape 变化
    const shapeChangeHandler = () => {
      const nextIdx = SHAPES.indexOf(currentShape);
      if (nextIdx !== shapeIndex && !morphing) {
        startMorph(nextIdx);
      }
    };
    shapeChangeHandler();

    return () => {
      stopGate();
      stopLoop();
      ro.disconnect();
      gl.canvas.removeEventListener("pointerdown", onPointerDown);
      gl.canvas.removeEventListener("pointermove", onPointerMove);
      gl.canvas.removeEventListener("pointerup", onPointerUp);
      gl.canvas.removeEventListener("pointerleave", onPointerUp);
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [quality, autoRotate, isDark, currentShape]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full" />
      <button
        type="button"
        onClick={nextShape}
        className="absolute bottom-4 right-4 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]/80 px-4 py-2 text-sm text-[var(--text-secondary)] backdrop-blur-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        Next Shape →
      </button>
    </div>
  );
}
