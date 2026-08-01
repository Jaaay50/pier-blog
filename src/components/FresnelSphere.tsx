"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Renderer, Camera, Transform, Geometry, Program, Mesh, Vec3 } from "ogl";
import { useWebGLQuality } from "@/lib/webgl";
import { observeRenderGate } from "@/lib/webgl";
import { useMotionValue, useSpring, motion } from "motion/react";

/**
 * Phase 9.3 — 菲涅尔渐变球（前景交互元素）
 *
 * - ogl 球体 + fresnel 边缘光 + 主题三色环境渐变
 * - 鼠标接近时被弹簧推开（useSpring）
 * - 缓慢自转
 * - pointer-events: none，从 window mousemove 计算 proximity
 */

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;

varying vec3 vNormal;
varying vec3 vViewPos;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mvPos.xyz;
  vNormal = normalMatrix * normal;
  gl_Position = projectionMatrix * mvPos;
}
`;

const fragment = /* glsl */ `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewPos;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uTime;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(-vViewPos);
  
  // Fresnel
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.0);
  
  // 环境映射三色（按 normal.y 分层）
  float mixer = (normal.y + 1.0) * 0.5;
  vec3 envColor = mixer < 0.5
    ? mix(uColor1, uColor2, mixer * 2.0)
    : mix(uColor2, uColor3, mixer * 2.0 - 1.0);
  
  // 加微弱流光
  float shimmer = sin(normal.x * 4.0 + uTime) * 0.5 + 0.5;
  envColor += shimmer * 0.05;
  
  // 边缘高光
  vec3 finalColor = mix(envColor, envColor * 1.5, fresnel * 0.8);
  float alpha = 0.75 + fresnel * 0.25;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

/**
 * Props:
 * - initialX/initialY: 初始位置（百分比，如 "85%", "25%"）
 * - size: 球体半径（像素）
 */
interface FresnelSphereProps {
  initialX?: string;
  initialY?: string;
  size?: number;
}

export function FresnelSphere({
  initialX = "85%",
  initialY = "25%",
  size = 120,
}: FresnelSphereProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const quality = useWebGLQuality();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const offsetX = useSpring(0, { stiffness: 80, damping: 15 });
  const offsetY = useSpring(0, { stiffness: 80, damping: 15 });

  useEffect(() => {
    if (!quality?.enabled || quality.reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [quality, mouseX, mouseY]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !quality?.enabled || quality.reducedMotion) return;

    const isDark = resolvedTheme === "dark";
    const colors: [Vec3, Vec3, Vec3] = isDark
      ? [new Vec3(0.42, 0.61, 0.8), new Vec3(0.55, 0.5, 0.8), new Vec3(0.65, 0.87, 0.97)]
      : [new Vec3(0.85, 0.47, 0.34), new Vec3(0.83, 0.64, 0.5), new Vec3(0.95, 0.75, 0.5)];

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
    gl.enable(gl.CULL_FACE);
    host.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 35 });
    camera.position.set(0, 0, 5);

    const scene = new Transform();
    const geometry = new Geometry(gl, {
      position: { size: 3, data: createSpherePositions(32, 16) },
      normal: { size: 3, data: createSphereNormals(32, 16) },
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uColor1: { value: colors[0] },
        uColor2: { value: colors[1] },
        uColor3: { value: colors[2] },
        uTime: { value: 0 },
      },
      transparent: true,
      cullFace: gl.BACK,
    });

    const mesh = new Mesh(gl, { geometry, program });
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

      // 计算鼠标 proximity 推开
      const rect = host.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = mouseX.get() - centerX;
      const dy = mouseY.get() - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 250;
      if (dist < maxDist) {
        const pushStr = Math.pow(1 - dist / maxDist, 2) * 60;
        offsetX.set((dx / dist) * pushStr);
        offsetY.set(-(dy / dist) * pushStr);
      } else {
        offsetX.set(0);
        offsetY.set(0);
      }

      scene.rotation.y = elapsed * 0.0002;
      scene.rotation.x = Math.sin(elapsed * 0.0003) * 0.1;
      program.uniforms.uTime.value = elapsed * 0.001;

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
  }, [quality, resolvedTheme, mouseX, mouseY, offsetX, offsetY]);

  if (!quality?.enabled || quality.reducedMotion) return null;

  return (
    <motion.div
      className="pointer-events-none fixed z-[5]"
      style={{
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        x: offsetX,
        y: offsetY,
        translateX: "-50%",
        translateY: "-50%",
      }}
      aria-hidden
    >
      <div ref={hostRef} className="h-full w-full" />
    </motion.div>
  );
}

function createSpherePositions(segments: number, rings: number): Float32Array {
  const arr: number[] = [];
  for (let j = 0; j <= rings; j++) {
    for (let i = 0; i <= segments; i++) {
      const u = (i / segments) * Math.PI * 2;
      const v = (j / rings) * Math.PI;
      const x = Math.sin(v) * Math.cos(u);
      const y = Math.cos(v);
      const z = Math.sin(v) * Math.sin(u);
      arr.push(x, y, z);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * (segments + 1) + i;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const indexed: number[] = [];
  for (const idx of indices) {
    indexed.push(arr[idx * 3], arr[idx * 3 + 1], arr[idx * 3 + 2]);
  }
  return new Float32Array(indexed);
}

function createSphereNormals(segments: number, rings: number): Float32Array {
  return createSpherePositions(segments, rings); // 单位球：position = normal
}
