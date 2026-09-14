"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { observeRenderGate, type WebGLQuality } from "@/lib/webgl";
import { LabButton, LabRange, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

const VERT = `#version 300 es
in vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;

const DEFAULTS = { speed: 1, zoom: 2.2, yOffset: 0, cloudAmp: 1, noiseDetail: 8, exposure: 1.15 };

export const CLOUDSEA_FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec2 resolution;
uniform float time;
uniform float speed;
uniform float zoom;
uniform float yOffset;
uniform float cloudAmp;
uniform float noiseDetail;
uniform float exposure;
uniform int fgSamples;
uniform sampler2D uNoise;

float noise(vec2 x){
  vec2 f=fract(x);
  vec2 u=f*f*f*(f*(f*6.-15.)+10.);
  vec2 p=floor(x);
  float a=texture(uNoise,(p+vec2(0.,0.))/1024.).x;
  float b=texture(uNoise,(p+vec2(1.,0.))/1024.).x;
  float c=texture(uNoise,(p+vec2(0.,1.))/1024.).x;
  float d=texture(uNoise,(p+vec2(1.,1.))/1024.).x;
  return a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y;
}

float fbm(vec2 x,int detail){
  float a=0.,b=1.,t=0.;
  for(int i=0;i<8;i++){
    if(i>=detail)break;
    a+=b*noise(x);t+=b;b*=.7;x*=2.;
  }
  return a/max(t,.001);
}

float fbm2(vec2 x,int detail){
  float a=0.,b=1.,t=0.;
  for(int i=0;i<8;i++){
    if(i>=detail)break;
    a+=b*noise(x);t+=b;b*=.9;x*=2.;
  }
  return a/max(t,.001);
}

float box(vec2 uv,float x1,float x2,float y1,float y2){
  return (uv.x>x1&&uv.x<x2&&uv.y>y1&&uv.y<y2)?1.:0.;
}

#define dot2(v) dot(v,v)
#define layer(dh,v) if(uv.y<h+midlevel-(dh)) return vec4(v,1.);

vec4 foreground(vec2 uv,float t,int detail){
  float midlevel,h,disp,dist;vec2 uv2;
  uv.y-=.2;
  midlevel=-.1;disp=1.7*cloudAmp;dist=1.;
  uv2=uv+vec2(t/dist+40.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.12,vec3(.43,.32,.31));
  layer(.08,vec3(.55,.42,.41));
  layer(.04,vec3(.66,.42,.40));
  layer(0.,vec3(.77,.48,.46));
  midlevel=.05;disp=1.7*cloudAmp;dist=2.;
  uv2=uv+vec2(t/dist+38.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.95,.66,.48));
  layer(.04,vec3(.98,.76,.64));
  layer(0.,vec3(.95,.80,.77));
  return vec4(.95,.80,.77,0.);
}

vec4 background(vec2 uv,float t,int detail){
  float midlevel,h,disp,dist;vec2 uv2;
  midlevel=.3;disp=.9*cloudAmp;dist=10.;
  uv2=uv+vec2(t/dist+32.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.14,vec3(.48,.19,.20));
  layer(.1,vec3(.68,.28,.19));
  layer(.07,vec3(.88,.38,.24));
  layer(0.,vec3(.95,.45,.30));
  midlevel=.35;disp=1.*cloudAmp;dist=15.;
  uv2=uv+vec2(t/dist+30.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.04,vec3(.98,.76,.64));
  layer(0.,vec3(.95,.80,.77));
  midlevel=.35;disp=3.5*cloudAmp;dist=20.;
  uv2=uv+vec2(t/dist+27.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.12,vec3(.43,.32,.31));
  layer(.08,vec3(.55,.42,.41));
  layer(.04,vec3(.66,.42,.40));
  layer(0.,vec3(.77,.48,.46));
  midlevel=.45;disp=2.*cloudAmp;dist=25.;
  uv2=uv+vec2(t/dist+23.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.04,vec3(.98,.57,.36));
  layer(0.,vec3(1.,.62,.44));
  midlevel=.5;disp=2.3*cloudAmp;dist=30.;
  uv2=uv+vec2(t/dist+20.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.12,vec3(.41,.27,.27));
  layer(.08,vec3(.53,.35,.32));
  layer(.04,vec3(.80,.24,.17));
  layer(0.,vec3(.99,.29,.20));
  midlevel=.5;disp=2.5*cloudAmp;dist=35.;
  uv2=uv+vec2(t/dist+18.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.88,.38,.24));
  layer(.05,vec3(.98,.42,.28));
  layer(0.,vec3(1.,.48,.35));
  midlevel=.6;disp=2.*cloudAmp;dist=40.;
  uv2=uv+vec2(t/dist+18.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.95,.66,.48));
  layer(0.,vec3(1.,.76,.60));
  midlevel=.75;disp=3.5*cloudAmp;dist=45.;
  uv2=uv+vec2(t/dist+15.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.2,vec3(1.,.55,.33));
  layer(.15,vec3(.98,.50,.24));
  layer(.1,vec3(.90,.55,.40));
  layer(0.,vec3(1.,.62,.44));
  midlevel=.7;disp=2.7*cloudAmp;dist=50.;
  uv2=uv+vec2(t/dist+12.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.04,vec3(.73,.36,.30));
  layer(0.,vec3(.80,.40,.34));
  midlevel=.8;disp=2.7*cloudAmp;dist=60.;
  uv2=uv+vec2(t/dist+9.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.93,.58,.35));
  layer(0.,vec3(1.,.76,.60));
  midlevel=.9;disp=3.*cloudAmp;dist=70.;
  uv2=uv+vec2(t/dist+7.,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.56,.25,.22));
  layer(.05,vec3(.60,.30,.27));
  layer(0.,vec3(.74,.35,.30));
  midlevel=1.;disp=5.*cloudAmp;dist=100.;
  uv2=uv+vec2(t/dist+3.5,0.);h=(fbm(uv2,detail)-.5)*disp;
  layer(.1,vec3(.92,.85,.82));
  layer(0.,vec3(1.,.94,.91));
  return vec4(.58,.7,1.,1.);
}

vec3 genRaster(vec2 uv,float iTime,int detail){
  float t=sin(1.2*iTime*speed)+4.*iTime*speed;
  vec4 bg=background(uv,t,detail);
  vec4 fg=vec4(0.);
  int n=fgSamples;
  if(uv.y<.5){
    for(int i=0;i<5;i++){
      if(i>=n)break;
      fg+=foreground(uv,t+4.*float(i)/float(n)/60.,detail)/float(n);
    }
  }
  vec3 col=bg.rgb;
  uv.y-=.2;
  vec2 uv2=fract(uv*9.);
  float wagon=1.;
  wagon*=1.-step(.45,uv.x);
  wagon*=1.-step(.115,uv.y);
  wagon*=step(.103,uv.y);
  wagon*=step(.05,1.-abs(uv2.x*2.-1.));
  float join=1.;
  join*=1.-step(.45,uv.x);
  join*=1.-step(.11,uv.y);
  join*=step(.107,uv.y);
  float roof=1.;
  roof*=1.-step(.45,uv.x);
  roof*=1.-step(.117,uv.y);
  roof*=step(.11,uv.y);
  roof*=step(.15,1.-abs(uv2.x*2.-1.));
  float loco=box(uv,.45,.5,.103,.112);
  float chem1=box(uv,.49,.495,.103,.12);
  float chem2=box(uv,.488,.496,.12,.123);
  float locoRoof=box(uv,.443,.47,.11,.117);
  float wheel=1.-step(.00004,dot2(uv-vec2(.457,.106)));
  wheel+=1.-step(.00002,dot2(uv-vec2(.487,.105)));
  wheel+=1.-step(.00002,dot2(uv-vec2(.497,.105)));
  if(uv.x<.45&&uv.y>.025&&uv.y<.2){
    wheel+=1.-step(.002,dot2(uv2-vec2(.2,.95)));
    wheel+=1.-step(.002,dot2(uv2-vec2(.8,.95)));
  }
  col=mix(col,vec3(.18,.12,.15),join);
  col=mix(col,vec3(.48,.19,.20),wagon);
  col=mix(col,vec3(.18,.12,.15),roof);
  col=mix(col,vec3(.38,.19,.20),loco);
  col=mix(col,vec3(.38,.19,.20),chem1);
  col=mix(col,vec3(.18,.12,.15),locoRoof);
  col=mix(col,vec3(.18,.12,.15),chem2+wheel);
  float dist=5.;
  uv2=uv+vec2(t/dist+3.5,0.);
  uv2.x-=t/dist*.2;
  float hh=fbm2(uv2,detail)-.55;
  if(uv.x<.49){
    float x=-uv.x+.49;
    float y=abs(uv.y+hh*.4-.16*sqrt(x)-.12)-.8*x*exp(-x*10.);
    if(y<0.)col=vec3(1.,.94,.91);
    if(y<-.02)col=vec3(.92,.85,.82);
  }
  dist=5.;
  uv2=uv+vec2(t/dist+32.5,0.);
  uv2.x=fract(uv2.x*3.);
  float k=1.;
  k*=smoothstep(.001,.003,abs(uv2.y-pow(uv2.x-.5,2.)*.15-.12));
  k*=min(step(.05,1.-abs(uv2.x*2.-1.))+step(.17,uv2.y),1.);
  k*=min(smoothstep(.02,.05,1.-abs(uv2.x*2.-1.))+step(.177,uv2.y),1.);
  k*=min(step(.1,uv2.y)+smoothstep(-.09,-.085,-uv2.y-.001/(1.-abs(uv2.x*2.-1.))),1.);
  k*=min(smoothstep(.05,.2,1.-abs(fract(uv2.x*16.)*2.-1.))+step(.12,uv2.y-pow(uv2.x-.5,2.)*.15)+step(-.1,-uv2.y),1.);
  col=mix(vec3(.29,.09,.08)*smoothstep(-.08,.08,uv.y),col,k);
  col=mix(col,fg.rgb,fg.a);
  return col;
}

void main(){
  vec2 frag=gl_FragCoord.xy;
  vec2 uv=frag/resolution.y;
  float aspect=resolution.x/resolution.y;
  vec2 pivot=vec2(.48,.34+yOffset);
  float z=max(zoom,.4);
  uv=(uv-vec2(aspect*.5,.5))/z+pivot;
  int detail=int(clamp(noiseDetail,2.,8.)+.5);
  vec3 col=genRaster(uv,time,detail);
  vec2 uvV=frag/resolution;
  col*=.5+.5*pow(16.*uvV.x*uvV.y*(1.-uvV.x)*(1.-uvV.y),.2);
  col*=exposure;
  fragColor=vec4(clamp(col,0.,1.),1.);
}`;

type Params = typeof DEFAULTS;

export default function CloudSeaTrain({
  onReadyChange,
  quality,
}: NewDemoProps & { quality?: WebGLQuality }) {
  const zh = useLocale() === "zh";
  const canvas = useRef<HTMLCanvasElement>(null);
  const draw = useRef<() => void>(() => {});
  const params = useRef<Params>({ ...DEFAULTS });
  const [speed, setSpeed] = useState(DEFAULTS.speed);
  const [zoom, setZoom] = useState(DEFAULTS.zoom);
  const [yOffset, setYOffset] = useState(DEFAULTS.yOffset);
  const [cloudAmp, setCloudAmp] = useState(DEFAULTS.cloudAmp);
  const [noiseDetail, setNoiseDetail] = useState(DEFAULTS.noiseDetail);
  const [exposure, setExposure] = useState(DEFAULTS.exposure);
  const [failed, setFailed] = useState(false);
  const tier = quality?.tier ?? "medium";

  useEffect(() => {
    params.current = { speed, zoom, yOffset, cloudAmp, noiseDetail, exposure };
  }, [speed, zoom, yOffset, cloudAmp, noiseDetail, exposure]);

  const readyCallback = useRef(onReadyChange);
  useEffect(() => {
    readyCallback.current = onReadyChange;
  }, [onReadyChange]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let gl: WebGL2RenderingContext | null = null;
    let disposed = false, cancelled = false, active = false, ready = false, frame = 0;
    let program: WebGLProgram | null = null, buffer: WebGLBuffer | null = null, texture: WebGLTexture | null = null;
    const shaders: WebGLShader[] = [];
    let stopGate = () => {}, disconnectResize = () => {};
    let lastTime: number | null = null, elapsed = 0;
    const release = () => {
      if (disposed) return;
      disposed = true;
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
      stopGate();
      disconnectResize();
      el.removeEventListener("webglcontextlost", lost);
      draw.current = () => {};
      if (!gl) return;
      gl.useProgram(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (program) { gl.deleteProgram(program); program = null; }
      if (buffer) { gl.deleteBuffer(buffer); buffer = null; }
      if (texture) { gl.deleteTexture(texture); texture = null; }
      for (const shader of shaders) gl.deleteShader(shader);
      shaders.length = 0;
    };
    const fail = () => {
      if (disposed) return;
      release();
      queueMicrotask(() => {
        if (!cancelled) {
          setFailed(true);
          readyCallback.current?.(false);
        }
      });
    };
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    try {
      gl = el.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
      if (!gl || gl.isContextLost()) throw new Error("WebGL2 context unavailable");
      const context = gl;
      el.addEventListener("webglcontextlost", lost);
      const compile = (type: number, source: string) => {
        const shader = context.createShader(type);
        if (!shader) throw new Error("Shader allocation failed");
        shaders.push(shader);
        context.shaderSource(shader, source);
        context.compileShader(shader);
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) throw new Error("Shader compilation failed");
        return shader;
      };
      const vertex = compile(context.VERTEX_SHADER, VERT);
      const fragment = compile(context.FRAGMENT_SHADER, CLOUDSEA_FRAGMENT);
      program = context.createProgram();
      if (!program) throw new Error("Program allocation failed");
      context.attachShader(program, vertex);
      context.attachShader(program, fragment);
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) throw new Error("Program link failed");
      buffer = context.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), context.STATIC_DRAW);
      context.useProgram(program);
      const position = context.getAttribLocation(program, "position");
      if (position < 0) throw new Error("Missing position attribute");
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      texture = context.createTexture();
      if (!texture) throw new Error("Texture allocation failed");
      context.activeTexture(context.TEXTURE0);
      context.bindTexture(context.TEXTURE_2D, texture);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.REPEAT);
      context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.REPEAT);
      context.pixelStorei(context.UNPACK_ALIGNMENT, 1);
      context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, 1, 1, 0, context.RGBA, context.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
      const image = new Image();
      image.onload = () => {
        if (disposed || !texture) return;
        context.bindTexture(context.TEXTURE_2D, texture);
        context.texImage2D(context.TEXTURE_2D, 0, context.RGBA, context.RGBA, context.UNSIGNED_BYTE, image);
      };
      image.src = "/lab/cloudsea-noise.png";
      const uniforms = Object.fromEntries(
        ["resolution", "time", "speed", "zoom", "yOffset", "cloudAmp", "noiseDetail", "exposure", "fgSamples", "uNoise"].map(
          (name) => [name, context.getUniformLocation(program!, name)],
        ),
      );
      context.uniform1i(uniforms.uNoise, 0);
      const fgSamples = tier === "high" ? 3 : 1;
      const paint = (stamp: number) => {
        frame = 0;
        if (!active || disposed || !program) return;
        try {
          if (context.isContextLost()) throw new Error("WebGL context lost");
          if (lastTime !== null) elapsed += stamp - lastTime;
          lastTime = stamp;
          const p = params.current;
          context.viewport(0, 0, el.width, el.height);
          context.uniform2f(uniforms.resolution, el.width, el.height);
          context.uniform1f(uniforms.time, elapsed * 0.001);
          context.uniform1f(uniforms.speed, p.speed);
          context.uniform1f(uniforms.zoom, p.zoom);
          context.uniform1f(uniforms.yOffset, p.yOffset);
          context.uniform1f(uniforms.cloudAmp, p.cloudAmp);
          context.uniform1f(uniforms.noiseDetail, p.noiseDetail);
          context.uniform1f(uniforms.exposure, p.exposure);
          context.uniform1i(uniforms.fgSamples, fgSamples);
          context.drawArrays(context.TRIANGLES, 0, 3);
          if (context.getError() !== context.NO_ERROR) throw new Error("WebGL drawing failed");
          if (!ready) {
            ready = true;
            setFailed(false);
            readyCallback.current?.(true);
          }
          if (active && !disposed) frame = requestAnimationFrame(paint);
        } catch {
          fail();
        }
      };
      const schedule = () => {
        if (active && !disposed && !frame) frame = requestAnimationFrame(paint);
      };
      draw.current = schedule;
      const resize = () => {
        if (disposed) return;
        const rect = el.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 1.25 : 1);
        el.width = Math.max(1, Math.round(rect.width * dpr));
        el.height = Math.max(1, Math.round(rect.height * dpr));
        schedule();
      };
      const observer = new ResizeObserver(resize);
      disconnectResize = () => observer.disconnect();
      observer.observe(el);
      stopGate = observeRenderGate(el, (inView) => {
        if (disposed) return;
        active = inView;
        if (active) {
          lastTime = null;
          schedule();
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
          lastTime = null;
        }
      });
      resize();
    } catch {
      fail();
    }
    return () => {
      cancelled = true;
      release();
    };
  }, [tier]);

  const reset = () => {
    setSpeed(DEFAULTS.speed);
    setZoom(DEFAULTS.zoom);
    setYOffset(DEFAULTS.yOffset);
    setCloudAmp(DEFAULTS.cloudAmp);
    setNoiseDetail(DEFAULTS.noiseDetail);
    setExposure(DEFAULTS.exposure);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <canvas ref={canvas} role="img" aria-label={zh ? "云海中的列车与悬索桥" : "Train and suspension bridge in a sea of clouds"} className="min-h-0 w-full flex-1" />
      {failed && <p role="alert" className="p-3 text-sm text-[var(--text-primary)]">{zh ? "WebGL2 渲染不可用" : "WebGL2 rendering unavailable"}</p>}
      <fieldset disabled={failed}>
        <LabToolbar>
          <LabRange label={zh ? "速度" : "Speed"} value={speed} min={0} max={2} step={0.02} onChange={setSpeed} />
          <LabRange label={zh ? "取景" : "Framing"} value={zoom} min={0.8} max={3.5} step={0.05} onChange={setZoom} />
          <LabRange label={zh ? "高度" : "Height"} value={yOffset} min={-0.25} max={0.25} step={0.01} onChange={setYOffset} />
          <LabRange label={zh ? "云层" : "Clouds"} value={cloudAmp} min={0.4} max={2} step={0.02} onChange={setCloudAmp} />
          <LabRange label={zh ? "细节" : "Detail"} value={noiseDetail} min={2} max={8} step={1} onChange={setNoiseDetail} />
          <LabRange label={zh ? "曝光" : "Exposure"} value={exposure} min={0.5} max={1.8} step={0.02} onChange={setExposure} />
          <LabButton onClick={reset}>{zh ? "重置" : "Reset"}</LabButton>
        </LabToolbar>
      </fieldset>
    </div>
  );
}
