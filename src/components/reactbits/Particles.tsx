'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';
import { observeRenderGate } from '@/lib/webgl';

interface ParticlesProps {
  particleCount?: number;
  particleSpread?: number;
  speed?: number;
  particleColors?: string[];
  moveParticlesOnHover?: boolean;
  particleHoverFactor?: number;
  alphaParticles?: boolean;
  particleBaseSize?: number;
  sizeRandomness?: number;
  cameraDistance?: number;
  disableRotation?: boolean;
  pixelRatio?: number;
  className?: string;
  onReadyChange?: (ready: boolean) => void;
  interactionLabel?: string;
}

const defaultColors: string[] = ['#ffffff', '#ffffff', '#ffffff'];

const hexToRgb = (hex: string): [number, number, number] => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  const int = parseInt(hex.slice(0, 6), 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  return [r, g, b];
};

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;
  
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vRandom = random;
    vColor = color;
    
    vec3 pos = position * uSpread;
    pos.z *= 10.0;
    
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);
    
    vec4 mvPos = viewMatrix * mPos;

    if (uSizeRandomness == 0.0) {
      gl_PointSize = uBaseSize;
    } else {
      gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);
    }
    
    gl_Position = projectionMatrix * mvPos;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  
  uniform float uTime;
  uniform float uAlphaParticles;
  varying vec4 vRandom;
  varying vec3 vColor;
  
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    
    if(uAlphaParticles < 0.5) {
      if(d > 0.5) {
        discard;
      }
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), 1.0);
    } else {
      float circle = (1.0 - smoothstep(0.4, 0.5, d)) * 0.8;
      gl_FragColor = vec4(vColor + 0.2 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle);
    }
  }
`;

const Particles: React.FC<ParticlesProps> = ({
  particleCount = 200,
  particleSpread = 10,
  speed = 0.1,
  particleColors,
  moveParticlesOnHover = false,
  particleHoverFactor = 1,
  alphaParticles = false,
  particleBaseSize = 100,
  sizeRandomness = 1,
  cameraDistance = 20,
  disableRotation = false,
  pixelRatio = 1,
  className,
  onReadyChange,
  interactionLabel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const live = useRef({ particleCount, particleSpread, speed, particleColors, moveParticlesOnHover, particleHoverFactor, alphaParticles, particleBaseSize, sizeRandomness, cameraDistance, disableRotation, onReadyChange });
  useEffect(() => { live.current = { particleCount, particleSpread, speed, particleColors, moveParticlesOnHover, particleHoverFactor, alphaParticles, particleBaseSize, sizeRandomness, cameraDistance, disableRotation, onReadyChange }; }, [particleCount, particleSpread, speed, particleColors, moveParticlesOnHover, particleHoverFactor, alphaParticles, particleBaseSize, sizeRandomness, cameraDistance, disableRotation, onReadyChange]);

  useEffect(() => {
    const container = containerRef.current; if (!container) return;
    let renderer: Renderer | undefined, geometry: Geometry | undefined, program: Program | undefined;
    let raf: number | null = null, last: number | null = null, disposed = false;
    let stopGate = () => {}, clearResize = () => {}, clearInput = () => {};
    const stop = () => { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; };
    const dispose = () => {
      if (disposed) return; disposed = true; stopGate(); stop(); clearResize(); clearInput(); geometry?.remove(); program?.remove();
      const gl = renderer?.gl;
      if (gl) { gl.canvas.removeEventListener('webglcontextlost', fail); if (gl.canvas.parentNode === container) container.removeChild(gl.canvas); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    };
    const fail = () => { dispose(); live.current.onReadyChange?.(false); };
    try {
      renderer = new Renderer({ dpr: pixelRatio, depth: false, alpha: true });
      const activeRenderer = renderer, gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0); container.appendChild(gl.canvas); gl.canvas.style.display = 'block';
      gl.canvas.addEventListener('webglcontextlost', fail);
      const camera = new Camera(gl, { fov: 15 }); camera.position.set(0, 0, live.current.cameraDistance);
      const resize = () => { activeRenderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight)); camera.perspective({ aspect: Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight) }); };
      resize(); const ro = new ResizeObserver(resize); ro.observe(container); clearResize = () => ro.disconnect();
      const mouse = { x: 0, y: 0 };
      let pointer: number | null = null;
      const move = (e: PointerEvent) => { if (!live.current.moveParticlesOnHover || (pointer !== null && pointer !== e.pointerId)) return; const rect = container.getBoundingClientRect(); mouse.x = Math.max(-1, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width) * 2 - 1)); mouse.y = Math.max(-1, Math.min(1, 1 - (e.clientY - rect.top) / Math.max(1, rect.height) * 2)); };
      const leave = () => { mouse.x = 0; mouse.y = 0; };
      const down = (event: PointerEvent) => {
        if (!live.current.moveParticlesOnHover || !container.hasAttribute('tabindex') || pointer !== null || event.button !== 0) return;
        event.preventDefault(); pointer = event.pointerId;
        container.setPointerCapture(pointer); move(event);
      };
      const release = () => {
        const id = pointer; pointer = null;
        if (id !== null && container.hasPointerCapture(id)) container.releasePointerCapture(id);
        leave();
      };
      const up = (event: PointerEvent) => { if (event.pointerId === pointer) release(); };
      const exit = () => { if (pointer === null) leave(); };
      const key = (event: KeyboardEvent) => {
        if (!live.current.moveParticlesOnHover) return;
        if (event.key === 'Escape') { leave(); return; }
        const directions: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.15], ArrowDown: [0, -0.15] };
        const delta = directions[event.key]; if (!delta) return;
        event.preventDefault(); mouse.x = Math.max(-1, Math.min(1, mouse.x + delta[0])); mouse.y = Math.max(-1, Math.min(1, mouse.y + delta[1]));
      };
      container.addEventListener('keydown', key);
      container.addEventListener('pointerdown', down); container.addEventListener('pointermove', move); container.addEventListener('pointerleave', exit);
      container.addEventListener('pointerup', up); container.addEventListener('pointercancel', up); container.addEventListener('lostpointercapture', up);
      clearInput = () => {
        container.removeEventListener('keydown', key); container.removeEventListener('pointerdown', down); container.removeEventListener('pointermove', move); container.removeEventListener('pointerleave', exit);
        container.removeEventListener('pointerup', up); container.removeEventListener('pointercancel', up); container.removeEventListener('lostpointercapture', up); release();
      };
      let builtCount = 0, paletteKey = '';
      const buildGeometry = () => {
        const count = Math.max(1, Math.min(10000, Math.round(live.current.particleCount)));
        const positions = new Float32Array(count * 3), randoms = new Float32Array(count * 4), colors = new Float32Array(count * 3);
        const palette = live.current.particleColors?.length ? live.current.particleColors : defaultColors;
        for (let i = 0; i < count; i++) {
          let x: number, y: number, z: number, len: number;
          do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; len = Math.hypot(x, y, z); } while (len > 1 || len === 0);
          const radius = Math.cbrt(Math.random()); positions.set([x / len * radius, y / len * radius, z / len * radius], i * 3);
          randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
          colors.set(hexToRgb(palette[i % palette.length]), i * 3);
        }
        geometry?.remove(); geometry = new Geometry(gl, { position: { size: 3, data: positions }, random: { size: 4, data: randoms }, color: { size: 3, data: colors } });
        builtCount = count; paletteKey = palette.join(',');
        return geometry;
      };
      program = new Program(gl, { vertex, fragment, uniforms: { uTime: { value: 0 }, uSpread: { value: particleSpread }, uBaseSize: { value: particleBaseSize * pixelRatio }, uSizeRandomness: { value: sizeRandomness }, uAlphaParticles: { value: alphaParticles ? 1 : 0 } }, transparent: true, depthTest: false });
      const activeProgram = program;
      if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) throw new Error('Unable to link particles');
      const particles = new Mesh(gl, { mode: gl.POINTS, geometry: buildGeometry(), program });
      let elapsed = 0, ready = false;
      const frame = (time: number) => {
        raf = null; if (disposed) return;
        const dt = last === null ? 0 : Math.min(50, time - last); last = time;
        const p = live.current; elapsed += dt * p.speed;
        try {
          if (builtCount !== Math.max(1, Math.min(10000, Math.round(p.particleCount)))) particles.geometry = buildGeometry();
          const palette = p.particleColors?.length ? p.particleColors : defaultColors;
          if (palette.join(',') !== paletteKey && geometry) {
            const colors = geometry.attributes.color.data as Float32Array;
            for (let i = 0; i < builtCount; i++) colors.set(hexToRgb(palette[i % palette.length]), i * 3);
            geometry.attributes.color.needsUpdate = true; paletteKey = palette.join(',');
          }
          activeProgram.uniforms.uTime.value = elapsed * 0.001; activeProgram.uniforms.uSpread.value = p.particleSpread;
          activeProgram.uniforms.uBaseSize.value = p.particleBaseSize * pixelRatio; activeProgram.uniforms.uSizeRandomness.value = p.sizeRandomness; activeProgram.uniforms.uAlphaParticles.value = p.alphaParticles ? 1 : 0;
          camera.position.z = p.cameraDistance;
          particles.position.x = p.moveParticlesOnHover ? -mouse.x * p.particleHoverFactor : 0; particles.position.y = p.moveParticlesOnHover ? -mouse.y * p.particleHoverFactor : 0;
          if (!p.disableRotation) { particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1; particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15; particles.rotation.z += dt * 0.0006 * p.speed; }
          activeRenderer.render({ scene: particles, camera });
        } catch { fail(); return; }
        if (!ready) { ready = true; live.current.onReadyChange?.(true); }
        raf = requestAnimationFrame(frame);
      };
      stopGate = observeRenderGate(container, (active) => { if (active && !disposed && raf === null) raf = requestAnimationFrame(frame); else if (!active) { release(); stop(); } });
    } catch { fail(); }
    return dispose;
  }, [pixelRatio]);

  return <div ref={containerRef} tabIndex={interactionLabel ? 0 : undefined} role={interactionLabel ? "img" : undefined} aria-label={interactionLabel} style={{ touchAction: moveParticlesOnHover && interactionLabel ? 'none' : undefined }} className={`relative w-full h-full ${className ?? ''}`} />;
};

export default Particles;
