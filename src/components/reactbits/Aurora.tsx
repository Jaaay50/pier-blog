'use client';

import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { observeRenderGate } from '@/lib/webgl';

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;
uniform vec3 uBackgroundColor;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  // React Bits 浅色分支：先在纸色上合成，避免预乘透明色在浅底上发灰。
  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(uBackgroundColor, chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`;

const DEFAULT_COLOR_STOPS = ['#5227FF', '#7cff67', '#5227FF'];
const DEFAULT_BACKGROUND_COLOR = '#ffffff';

const colorToVec3 = (value: string): [number, number, number] => {
  const color = new Color(value);
  const result: [number, number, number] = [color.r, color.g, color.b];
  if (!result.every(Number.isFinite)) throw new Error('Invalid Aurora color');
  return result;
};

const parseColorStops = (stops: string[]) => {
  if (stops.length !== 3) throw new Error('Aurora requires three color stops');
  return stops.map(colorToVec3);
};

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  time?: number;
  speed?: number;
  lightMode?: boolean;
  /** 仅浅色模式参与合成，默认白色。 */
  backgroundColor?: string;
  /** 首帧成功后为 true；暂停保留画面及就绪状态，失败或卸载后为 false。 */
  onReadyChange?: (ready: boolean) => void;
}

export default function Aurora(props: AuroraProps) {
  const propsRef = useRef<AuroraProps>(props);
  propsRef.current = props;
  const readyRef = useRef(false);
  const ctnDom = useRef<HTMLDivElement>(null);

  // 回调更新只同步当前状态，不重建 GPU 资源，也不重置动画进度。
  useEffect(() => {
    props.onReadyChange?.(readyRef.current);
  }, [props.onReadyChange]);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    let renderer: Renderer | undefined;
    let geometry: Triangle | undefined;
    let program: Program | undefined;
    let stopGate = () => {};
    let removeResize = () => {};
    let removeContextLost = () => {};
    let animateId: number | null = null;
    let lastTime: number | null = null;
    let elapsed = 0;
    let disposed = false;
    let loopActive = false;
    let needsDrawValidation = true;

    const setReady = (ready: boolean) => {
      if (readyRef.current === ready) return;
      readyRef.current = ready;
      propsRef.current.onReadyChange?.(ready);
    };
    const stopLoop = () => {
      loopActive = false;
      if (animateId !== null) cancelAnimationFrame(animateId);
      animateId = null;
      lastTime = null;
    };
    const safelyRelease = (release: () => void) => {
      // 上下文已丢失时，单项释放失败不能阻止其余监听器与 GPU 资源清理。
      try { release(); } catch { /* 已失效的资源无需恢复。 */ }
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      stopLoop();
      safelyRelease(stopGate);
      safelyRelease(removeResize);
      safelyRelease(removeContextLost);
      const gl = renderer?.gl;
      if (gl) {
        safelyRelease(() => geometry?.remove());
        if (program) {
          const activeProgram = program;
          safelyRelease(() => gl.deleteShader(activeProgram.vertexShader));
          safelyRelease(() => gl.deleteShader(activeProgram.fragmentShader));
          safelyRelease(() => activeProgram.remove());
        }
        if (gl.canvas.parentNode === ctn) ctn.removeChild(gl.canvas);
        safelyRelease(() => gl.getExtension('WEBGL_lose_context')?.loseContext());
      }
      setReady(false);
    };

    try {
      renderer = new Renderer({
        alpha: true,
        premultipliedAlpha: true,
        antialias: true,
      });
      const activeRenderer = renderer;
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.canvas.style.backgroundColor = 'transparent';
      gl.canvas.addEventListener('webglcontextlost', dispose);
      removeContextLost = () => gl.canvas.removeEventListener('webglcontextlost', dispose);

      geometry = new Triangle(gl);
      if (geometry.attributes.uv) {
        gl.deleteBuffer(geometry.attributes.uv.buffer!);
        delete geometry.attributes.uv;
      }

      const initial = propsRef.current;
      // 按颜色值缓存，等值新数组和其它 props 更新都不产生每帧 Color 分配。
      let cachedStops = [...(initial.colorStops ?? DEFAULT_COLOR_STOPS)];
      let cachedStopsArray = parseColorStops(cachedStops);
      let cachedBackground = initial.lightMode
        ? initial.backgroundColor ?? DEFAULT_BACKGROUND_COLOR
        : null;
      let cachedBackgroundArray: [number, number, number] = cachedBackground === null
        ? [1, 1, 1]
        : colorToVec3(cachedBackground);

      program = new Program(gl, {
        vertex: VERT,
        fragment: FRAG,
        uniforms: {
          uTime: { value: 0 },
          uAmplitude: { value: initial.amplitude ?? 1.0 },
          uColorStops: { value: cachedStopsArray },
          uResolution: { value: [1, 1] },
          uBlend: { value: initial.blend ?? 0.5 },
          uLightMode: { value: initial.lightMode ? 1 : 0 },
          uBackgroundColor: { value: cachedBackgroundArray },
        },
      });
      const activeProgram = program;
      // OGL 只记录编译/链接错误而不抛出；必须检查状态，不能误报首帧就绪。
      if (
        !gl.getShaderParameter(program.vertexShader, gl.COMPILE_STATUS) ||
        !gl.getShaderParameter(program.fragmentShader, gl.COMPILE_STATUS) ||
        !gl.getProgramParameter(program.program, gl.LINK_STATUS)
      ) {
        throw new Error('Aurora shader initialization failed');
      }
      const mesh = new Mesh(gl, { geometry, program });
      ctn.appendChild(gl.canvas);

      const resize = () => {
        if (disposed) return;
        try {
          const width = Math.max(1, ctn.offsetWidth);
          const height = Math.max(1, ctn.offsetHeight);
          activeRenderer.setSize(width, height);
          activeProgram.uniforms.uResolution.value = [width, height];
          needsDrawValidation = true;
        } catch {
          dispose();
        }
      };
      window.addEventListener('resize', resize);
      removeResize = () => window.removeEventListener('resize', resize);
      resize();
      if (disposed) return dispose;

      const update = (t: number) => {
        animateId = null;
        if (disposed || !loopActive) return;
        // 累积时间：离屏/隐藏期间不计时，恢复时延续上一帧而不是追赶墙钟。
        if (lastTime !== null) elapsed += t - lastTime;
        lastTime = t;
        try {
          const current = propsRef.current;
          const { time = elapsed * 0.01, speed = 1.0 } = current;
          activeProgram.uniforms.uTime.value = time * speed * 0.1;
          const amplitude = current.amplitude ?? 1.0;
          const blend = current.blend ?? 0.5;
          const lightMode = current.lightMode ? 1 : 0;
          if (
            amplitude !== activeProgram.uniforms.uAmplitude.value ||
            blend !== activeProgram.uniforms.uBlend.value ||
            lightMode !== activeProgram.uniforms.uLightMode.value
          ) needsDrawValidation = true;
          activeProgram.uniforms.uAmplitude.value = amplitude;
          activeProgram.uniforms.uBlend.value = blend;
          activeProgram.uniforms.uLightMode.value = lightMode;
          const stops = current.colorStops ?? DEFAULT_COLOR_STOPS;
          if (stops.length !== cachedStops.length || stops.some((color, i) => color !== cachedStops[i])) {
            cachedStopsArray = parseColorStops(stops);
            cachedStops = [...stops];
            needsDrawValidation = true;
          }
          activeProgram.uniforms.uColorStops.value = cachedStopsArray;
          const background = current.backgroundColor ?? DEFAULT_BACKGROUND_COLOR;
          if (current.lightMode && background !== cachedBackground) {
            cachedBackgroundArray = colorToVec3(background);
            cachedBackground = background;
            needsDrawValidation = true;
          }
          activeProgram.uniforms.uBackgroundColor.value = cachedBackgroundArray;
          activeRenderer.render({ scene: mesh });
          // 固定场景只在首帧、重配及恢复时读取 GL 错误，避免每帧 GPU 同步。
          // 后续帧仍捕获异常/上下文丢失；若新增动态网格或纹理，须在变更时重新置位。
          if (gl.isContextLost() || (needsDrawValidation && gl.getError() !== gl.NO_ERROR)) {
            throw new Error('Aurora draw failed');
          }
          needsDrawValidation = false;
        } catch {
          dispose();
          return;
        }
        if (disposed) return;
        setReady(true);
        if (!disposed && loopActive) animateId = requestAnimationFrame(update);
      };
      const startLoop = () => {
        if (disposed) return;
        if (!loopActive) {
          // 主题 CSS 可能在挂载 effect 之后才解除 display:none；可见时重新量尺寸。
          resize();
          if (disposed) return;
          needsDrawValidation = true;
        }
        loopActive = true;
        if (animateId === null) animateId = requestAnimationFrame(update);
      };

      // 等待可见性门控，避免隐藏标签页或首屏外的调用方浪费第一帧。
      stopGate = observeRenderGate(ctn, active => active ? startLoop() : stopLoop());
    } catch {
      // 能力探测通过后仍可能耗尽上下文；保留调用方的静态背景而不崩溃。
      dispose();
    }

    return dispose;
  }, []);

  return <div ref={ctnDom} className="w-full h-full" aria-hidden />;
}
