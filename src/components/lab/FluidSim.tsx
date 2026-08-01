"use client";

import { useEffect, useRef, useState } from "react";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";

/**
 * Lab Demo — 流体模拟旗舰
 *
 * 零依赖自写 Navier-Stokes 求解器（WebGL2 ping-pong FBO）：
 * 1. Advection（平流：速度场携带自身与染料）
 * 2. Vorticity confinement（涡量约束：补偿数值耗散）
 * 3. Divergence（散度计算）
 * 4. Jacobi 压力迭代（×20，使速度场无散）
 * 5. Gradient subtract（压力梯度减去，投影到无散场）
 *
 * 交互：鼠标/触摸拖拽注入速度与染料（按主题色）
 */

// 全屏三角形顶点（layout 限定 location=0，与 blit 的 vertexAttribPointer(0) 保证一致）
const VERT = `#version 300 es
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Advection：RK2 半拉格朗日回溯
const advectionFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
out vec4 fragColor;

void main() {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  fragColor = uDissipation * texture(uSource, coord);
}`;

// Divergence（散度）
const divergenceFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;

void main() {
  vec2 ts = uTexelSize;
  float L = texture(uVelocity, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uVelocity, vUv + vec2(ts.x, 0.0)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, ts.y)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, ts.y)).y;
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

// Curl（涡量）
const curlFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
out vec4 fragColor;

void main() {
  vec2 ts = uTexelSize;
  float L = texture(uVelocity, vUv - vec2(ts.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(ts.x, 0.0)).y;
  float T = texture(uVelocity, vUv + vec2(0.0, ts.y)).x;
  float B = texture(uVelocity, vUv - vec2(0.0, ts.y)).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

// Vorticity confinement（涡量约束）
const vorticityFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uCurlStrength;
out vec4 fragColor;

void main() {
  vec2 ts = uTexelSize;
  float L = texture(uCurl, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(ts.x, 0.0)).x;
  float T = texture(uCurl, vUv + vec2(0.0, ts.y)).x;
  float B = texture(uCurl, vUv - vec2(0.0, ts.y)).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 1e-5;
  force *= uCurlStrength * C;
  force.y *= -1.0;

  vec2 vel = texture(uVelocity, vUv).xy;
  fragColor = vec4(vel + force * uDt, 0.0, 1.0);
}`;

// Jacobi 压力迭代
const pressureFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
out vec4 fragColor;

void main() {
  vec2 ts = uTexelSize;
  float L = texture(uPressure, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(ts.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, ts.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, ts.y)).x;
  float C = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - C) * 0.25, 0.0, 0.0, 1.0);
}`;

// Gradient subtract（压力梯度减去）
const gradientSubtractFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uPressure;
uniform vec2 uTexelSize;
out vec4 fragColor;

void main() {
  vec2 ts = uTexelSize;
  float L = texture(uPressure, vUv - vec2(ts.x, 0.0)).x;
  float R = texture(uPressure, vUv + vec2(ts.x, 0.0)).x;
  float T = texture(uPressure, vUv + vec2(0.0, ts.y)).x;
  float B = texture(uPressure, vUv - vec2(0.0, ts.y)).x;
  vec2 vel = texture(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  fragColor = vec4(vel, 0.0, 1.0);
}`;

// Splat（注入）
const splatFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uColor;
uniform float uRadius;
out vec4 fragColor;

void main() {
  vec4 base = texture(uTarget, vUv);
  vec2 p = vUv - uPoint;
  p.x *= uRadius;
  float splat = exp(-dot(p, p) / 0.0008);
  fragColor = base + vec4(splat * uColor, 0.0);
}`;

// Display（最终渲染染料）
const displayFrag = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uDye;
out vec4 fragColor;

void main() {
  vec3 col = texture(uDye, vUv).xyz;
  fragColor = vec4(col, 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vert);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

interface FBO {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

function createFBO(gl: WebGL2RenderingContext, w: number, h: number): FBO {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fbo, tex, w, h };
}

interface DoubleFBO {
  read: FBO;
  write: FBO;
  swap: () => void;
}

function createDoubleFBO(gl: WebGL2RenderingContext, w: number, h: number): DoubleFBO {
  let read = createFBO(gl, w, h);
  let write = createFBO(gl, w, h);
  return {
    get read() {
      return read;
    },
    get write() {
      return write;
    },
    swap() {
      [read, write] = [write, read];
    },
  };
}

interface FluidSimProps {
  quality: WebGLQuality;
  dyeColors: [number, number, number][];
}

export default function FluidSim({ quality, dyeColors }: FluidSimProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    const gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) {
      // WebGL2 不可用：显示错误文字
      host.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">WebGL2 not supported on this device</div>';
      return;
    }
    host.appendChild(canvas);

    // float texture 支持检测
    const floatExt = gl.getExtension("EXT_color_buffer_float");
    if (!floatExt) {
      host.removeChild(canvas);
      host.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:2rem;text-align:center;color:var(--text-muted);font-size:0.875rem;">Float texture not supported on this device</div>';
      return;
    }

    // sim 分辨率按 tier 分级
    const simRes = quality.tier === "high" ? 256 : 128;
    const dyeRes = simRes;

    const velocity = createDoubleFBO(gl, simRes, simRes);
    const dye = createDoubleFBO(gl, dyeRes, dyeRes);
    const divergence = createFBO(gl, simRes, simRes);
    const curl = createFBO(gl, simRes, simRes);
    const pressure = createDoubleFBO(gl, simRes, simRes);

    const progs = {
      advection: createProgram(gl, VERT, advectionFrag),
      divergence: createProgram(gl, VERT, divergenceFrag),
      curl: createProgram(gl, VERT, curlFrag),
      vorticity: createProgram(gl, VERT, vorticityFrag),
      pressure: createProgram(gl, VERT, pressureFrag),
      gradientSubtract: createProgram(gl, VERT, gradientSubtractFrag),
      splat: createProgram(gl, VERT, splatFrag),
      display: createProgram(gl, VERT, displayFrag),
    };

    if (Object.values(progs).some((p) => !p)) {
      host.removeChild(canvas);
      return;
    }

    // 全屏三角形
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const resize = () => {
      const dpr = quality.dpr;
      canvas.width = Math.round(host.clientWidth * dpr);
      canvas.height = Math.round(host.clientHeight * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 鼠标/触摸状态
    const pointers: Map<number, { x: number; y: number; dx: number; dy: number; down: boolean }> =
      new Map();

    const updatePointer = (id: number, x: number, y: number) => {
      const rect = canvas.getBoundingClientRect();
      const nx = x / rect.width;
      const ny = 1.0 - y / rect.height;
      const p = pointers.get(id) || { x: nx, y: ny, dx: 0, dy: 0, down: false };
      p.dx = nx - p.x;
      p.dy = ny - p.y;
      p.x = nx;
      p.y = ny;
      pointers.set(id, p);
    };

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault();
      updatePointer(e.pointerId, e.clientX, e.clientY);
      const p = pointers.get(e.pointerId)!;
      p.down = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e.pointerId, e.clientX, e.clientY);
    };

    const handlePointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);

    // 绘制工具
    const blit = (target: FBO | null) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
      gl.viewport(0, 0, target ? target.w : canvas.width, target ? target.h : canvas.height);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const applyAdvection = (src: DoubleFBO, vel: FBO, dt: number, diss: number) => {
      const prog = progs.advection!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uSource"), 1);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / vel.w, 1 / vel.h);
      gl.uniform1f(gl.getUniformLocation(prog, "uDt"), dt);
      gl.uniform1f(gl.getUniformLocation(prog, "uDissipation"), diss);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, src.read.tex);
      blit(src.write);
      src.swap();
    };

    const applyDivergence = (vel: FBO, out: FBO) => {
      const prog = progs.divergence!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 0);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / vel.w, 1 / vel.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.tex);
      blit(out);
    };

    const applyCurl = (vel: FBO, out: FBO) => {
      const prog = progs.curl!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 0);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / vel.w, 1 / vel.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.tex);
      blit(out);
    };

    const applyVorticity = (vel: DoubleFBO, curlTex: FBO, dt: number) => {
      const prog = progs.vorticity!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uCurl"), 1);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / vel.read.w, 1 / vel.read.h);
      gl.uniform1f(gl.getUniformLocation(prog, "uDt"), dt);
      gl.uniform1f(gl.getUniformLocation(prog, "uCurlStrength"), 20);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, curlTex.tex);
      blit(vel.write);
      vel.swap();
    };

    const applyPressure = (pres: DoubleFBO, div: FBO) => {
      const prog = progs.pressure!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uPressure"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uDivergence"), 1);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / pres.read.w, 1 / pres.read.h);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, div.tex);
      for (let i = 0; i < 20; i++) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pres.read.tex);
        blit(pres.write);
        pres.swap();
      }
    };

    const applyGradientSubtract = (vel: DoubleFBO, pres: FBO) => {
      const prog = progs.gradientSubtract!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uVelocity"), 0);
      gl.uniform1i(gl.getUniformLocation(prog, "uPressure"), 1);
      gl.uniform2f(gl.getUniformLocation(prog, "uTexelSize"), 1 / vel.read.w, 1 / vel.read.h);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, pres.tex);
      blit(vel.write);
      vel.swap();
    };

    const splat = (target: DoubleFBO, x: number, y: number, dx: number, dy: number, color: [number, number, number]) => {
      const prog = progs.splat!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uTarget"), 0);
      gl.uniform2f(gl.getUniformLocation(prog, "uPoint"), x, y);
      gl.uniform3f(gl.getUniformLocation(prog, "uColor"), color[0], color[1], color[2]);
      gl.uniform1f(gl.getUniformLocation(prog, "uRadius"), canvas.width / canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, target.read.tex);
      blit(target.write);
      target.swap();
    };

    let raf: number | null = null;
    let lastTime: number | null = null;
    let colorIndex = 0;
    let elapsed = 0;
    let lastAutoSplat = -4000;

    // 随机 splat：初始点亮 + 周期保活，避免黑屏等交互
    const randomSplat = () => {
      const x = 0.2 + Math.random() * 0.6;
      const y = 0.2 + Math.random() * 0.6;
      const dx = (Math.random() - 0.5) * 800;
      const dy = (Math.random() - 0.5) * 800;
      const col = dyeColors[colorIndex % dyeColors.length];
      colorIndex++;
      splat(velocity, x, y, dx, dy, [dx, dy, 0]);
      splat(dye, x, y, 0, 0, [col[0] * 0.6, col[1] * 0.6, col[2] * 0.6]);
    };

    // 开场烟花：多点同时注入
    for (let i = 0; i < 6; i++) randomSplat();

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = lastTime === null ? 16 : Math.min(t - lastTime, 16);
      if (lastTime !== null) elapsed += t - lastTime;
      lastTime = t;

      // 无交互时每 4s 一次保活 splat
      if (elapsed - lastAutoSplat > 4000) {
        lastAutoSplat = elapsed;
        randomSplat();
      }

      // 处理指针注入：hover 移动即注入（不要求按下，按下时更强）
      pointers.forEach((p) => {
        if (Math.abs(p.dx) > 0 || Math.abs(p.dy) > 0) {
          const force = p.down ? 9000 : 4000;
          splat(velocity, p.x, p.y, p.dx * force, p.dy * force, [p.dx * force, p.dy * force, 0]);
          const col = dyeColors[colorIndex % dyeColors.length];
          const dyeStrength = p.down ? 0.9 : 0.35;
          splat(dye, p.x, p.y, 0, 0, [col[0] * dyeStrength, col[1] * dyeStrength, col[2] * dyeStrength]);
          colorIndex++;
          p.dx = 0;
          p.dy = 0;
        }
      });

      // Navier-Stokes 管线
      applyCurl(velocity.read, curl);
      applyVorticity(velocity, curl, dt * 0.001);
      applyAdvection(velocity, velocity.read, dt * 0.001, 0.98);
      applyDivergence(velocity.read, divergence);
      applyPressure(pressure, divergence);
      applyGradientSubtract(velocity, pressure.read);
      applyAdvection(dye, velocity.read, dt * 0.001, 0.995);

      // 渲染
      const prog = progs.display!;
      gl.useProgram(prog);
      gl.uniform1i(gl.getUniformLocation(prog, "uDye"), 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
      blit(null);
    };

    const start = () => {
      if (raf === null) {
        lastTime = null;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    start();
    const stopGate = observeRenderGate(host, (active) => (active ? start() : stop()));

    return () => {
      stopGate();
      stop();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      if (canvas.parentNode === host) host.removeChild(canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [quality, dyeColors]);

  return <div ref={hostRef} className="h-full w-full" />;
}
