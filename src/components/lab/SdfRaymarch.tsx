'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {LabButton,LabRange,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';
const VERT=`#version 300 es
in vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
export const SDF_FRAGMENT=`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 resolution;
uniform float angle;
uniform float lightAngle;
uniform float metallic;
uniform float hue;
uniform float dark;
uniform int operation;
uniform int shape;
float sphere(vec3 p){return length(p)-.78;}
float box(vec3 p){vec3 q=abs(p)-vec3(.65);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float torus(vec3 p){return length(vec2(length(p.xz)-.66,p.y))-.24;}
float object(vec3 p){
  float c=cos(angle),s=sin(angle);p.xz=mat2(c,-s,s,c)*p.xz;
  float a=shape==0?sphere(p):shape==1?box(p):torus(p);
  if(operation==1)a=min(a,box(p-vec3(.65,.05,0.)));
  if(operation==2)a=max(a,-sphere((p-vec3(.55,.25,.35))*1.35)/1.35);
  return a;
}
vec2 scene(vec3 p){float d=object(p);float plane=p.y+1.;return d<plane?vec2(d,1.):vec2(plane,0.);}
vec3 normal(vec3 p){const vec2 e=vec2(.001,0.);return normalize(vec3(scene(p+e.xyy).x-scene(p-e.xyy).x,scene(p+e.yxy).x-scene(p-e.yxy).x,scene(p+e.yyx).x-scene(p-e.yyx).x));}
vec2 march(vec3 origin,vec3 ray){float t=0.;float id=-1.;for(int i=0;i<90;i++){vec2 h=scene(origin+ray*t);if(h.x<.0015){id=h.y;break;}t+=h.x*.85;if(t>18.)break;}return vec2(t,id);}
float softShadow(vec3 origin,vec3 light,float limit){float shade=1.,t=.025;for(int i=0;i<36;i++){float h=scene(origin+light*t).x;shade=min(shade,12.*h/t);t+=clamp(h,.025,.25);if(h<.001||t>limit)break;}return clamp(shade,0.,1.);}
vec3 sky(vec3 ray){return mix(mix(vec3(.8,.83,.85),vec3(.03,.06,.1),dark),mix(vec3(.95,.92,.85),vec3(.13,.2,.27),dark),clamp(ray.y*.5+.5,0.,1.));}
vec3 color(vec3 p,vec3 n,vec3 rd,float id){
  vec3 light=vec3(sin(lightAngle)*3.,4.,cos(lightAngle)*3.);vec3 l=normalize(light-p);
  vec3 tint=.5+.45*cos(hue*6.283+vec3(0.,2.,4.));
  vec3 base=id>.5?tint:mix(vec3(.68,.65,.59),vec3(.11,.15,.18),dark)*(0.92+.08*mod(floor(p.x)+floor(p.z),2.));
  float sh=softShadow(p+n*.012,l,length(light-p));float diffuse=max(dot(n,l),0.);
  float spec=pow(max(dot(n,normalize(l-rd)),0.),mix(22.,100.,metallic));
  return base*(.25+.75*diffuse*sh)+spec*sh*mix(.25,1.,metallic);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
  vec3 origin=vec3(3.1,2.,4.2),target=vec3(.1,-.1,0.);vec3 forward=normalize(target-origin),right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
  vec3 ray=normalize(right*uv.x+up*uv.y+forward*1.5);vec2 hit=march(origin,ray);vec3 col=sky(ray);
  if(hit.y>=0.){vec3 p=origin+ray*hit.x,n=normal(p);col=color(p,n,ray,hit.y);vec3 reflection=reflect(ray,n);vec2 bounce=march(p+n*.015,reflection);vec3 reflected=sky(reflection);if(bounce.y>=0.){vec3 p2=p+n*.015+reflection*bounce.x;reflected=color(p2,normal(p2),reflection,bounce.y);}float fresnel=.08+.5*pow(1.-max(dot(-ray,n),0.),5.);col=mix(col,reflected,(hit.y>.5?metallic:.25)*fresnel);col=mix(col,sky(ray),1.-exp(-.012*hit.x*hit.x));}
  fragColor=vec4(pow(max(col,0.),vec3(.8)),1.);
}`;
export default function SdfRaymarch({isDark,onReadyChange}:NewDemoProps){
  const zh=useLocale()==='zh',canvas=useRef<HTMLCanvasElement>(null),draw=useRef<()=>void>(()=>{}),params=useRef({shape:0,operation:1,angle:.4,light:1,metallic:.7,hue:.53,dark:isDark});
  const [shape,setShape]=useState(0),[operation,setOperation]=useState(1),[angle,setAngle]=useState(.4),[light,setLight]=useState(1),[metallic,setMetallic]=useState(.7),[hue,setHue]=useState(.53),[failed,setFailed]=useState(false);
  useEffect(()=>{params.current={shape,operation,angle,light,metallic,hue,dark:isDark};draw.current();},[shape,operation,angle,light,metallic,hue,isDark]);
  const readyCallback=useRef(onReadyChange);
  useEffect(()=>{readyCallback.current=onReadyChange;},[onReadyChange]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let gl:WebGL2RenderingContext|null=null;
    let disposed=false,cancelled=false,active=false,ready=false,frame=0;
    let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;
    const shaders:WebGLShader[]=[];
    let stopGate=()=>{},disconnectResize=()=>{};
    const release=()=>{
      if(disposed)return;disposed=true;active=false;
      cancelAnimationFrame(frame);frame=0;stopGate();disconnectResize();
      el.removeEventListener('webglcontextlost',lost);draw.current=()=>{};
      if(!gl)return;
      // React retains this canvas during StrictMode effect replay. Release GPU objects,
      // not the context: force-losing it would make the next effect mount unusable.
      gl.useProgram(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
      if(program){gl.deleteProgram(program);program=null;}
      if(buffer){gl.deleteBuffer(buffer);buffer=null;}
      for(const shader of shaders)gl.deleteShader(shader);
      shaders.length=0;
    };
    const fail=()=>{
      if(disposed)return;release();
      queueMicrotask(()=>{if(!cancelled){setFailed(true);readyCallback.current?.(false);}});
    };
    const lost=(event:Event)=>{event.preventDefault();fail();};
    const cleanup=()=>{cancelled=true;release();};
    try{
      gl=el.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'low-power'});
      if(!gl||gl.isContextLost())throw new Error('WebGL2 context unavailable');
      const context=gl;
      el.addEventListener('webglcontextlost',lost);
      const compile=(type:number,source:string)=>{
        const shader=context.createShader(type);if(!shader)throw new Error('Shader allocation failed');
        shaders.push(shader);context.shaderSource(shader,source);context.compileShader(shader);
        if(!context.getShaderParameter(shader,context.COMPILE_STATUS))throw new Error('Shader compilation failed');
        return shader;
      };
      const vertex=compile(context.VERTEX_SHADER,VERT),fragment=compile(context.FRAGMENT_SHADER,SDF_FRAGMENT);
      program=context.createProgram();if(!program)throw new Error('Program allocation failed');
      context.attachShader(program,vertex);context.attachShader(program,fragment);context.linkProgram(program);
      if(!context.getProgramParameter(program,context.LINK_STATUS))throw new Error('Program link failed');
      buffer=context.createBuffer();if(!buffer)throw new Error('Buffer allocation failed');
      context.bindBuffer(context.ARRAY_BUFFER,buffer);
      context.bufferData(context.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),context.STATIC_DRAW);
      context.useProgram(program);
      const position=context.getAttribLocation(program,'position');if(position<0)throw new Error('Missing position attribute');
      context.enableVertexAttribArray(position);context.vertexAttribPointer(position,2,context.FLOAT,false,0,0);
      const uniforms=Object.fromEntries(['resolution','shape','operation','angle','lightAngle','metallic','hue','dark'].map(name=>[name,context.getUniformLocation(program!,name)]));
      const paint=()=>{
        frame=0;if(!active||disposed||!program)return;
        try{
          if(context.isContextLost())throw new Error('WebGL context lost');
          const p=params.current;context.viewport(0,0,el.width,el.height);
          context.uniform2f(uniforms.resolution,el.width,el.height);context.uniform1i(uniforms.shape,p.shape);context.uniform1i(uniforms.operation,p.operation);
          context.uniform1f(uniforms.angle,p.angle);context.uniform1f(uniforms.lightAngle,p.light);context.uniform1f(uniforms.metallic,p.metallic);context.uniform1f(uniforms.hue,p.hue);context.uniform1f(uniforms.dark,p.dark?1:0);
          context.drawArrays(context.TRIANGLES,0,3);
          if(context.getError()!==context.NO_ERROR)throw new Error('WebGL drawing failed');
          if(!ready){ready=true;setFailed(false);readyCallback.current?.(true);}
        }catch{fail();}
      };
      const schedule=()=>{if(active&&!disposed&&!frame)frame=requestAnimationFrame(paint);};draw.current=schedule;
      const resize=()=>{
        if(disposed)return;
        const rect=el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.25);
        el.width=Math.max(1,Math.round(rect.width*dpr));el.height=Math.max(1,Math.round(rect.height*dpr));schedule();
      };
      const observer=new ResizeObserver(resize);disconnectResize=()=>observer.disconnect();observer.observe(el);
      stopGate=observeRenderGate(el,inView=>{if(disposed)return;active=inView;if(active)schedule();else{cancelAnimationFrame(frame);frame=0;}});
      resize();
    }catch{fail();}
    return cleanup;
  },[]);

  return <div className="flex h-full flex-col bg-[var(--bg-primary)]"><canvas ref={canvas} role="img" aria-label={zh?'距离场光线步进渲染':'Raymarched distance field'} className="min-h-0 w-full flex-1"/>{failed&&<p role="alert" className="p-3 text-sm text-[var(--text-primary)]">{zh?'WebGL2 渲染不可用':'WebGL2 rendering unavailable'}</p>}<fieldset disabled={failed}><LabToolbar>
    <label className="text-xs text-[var(--text-primary)]">{zh?'形体':'Shape'} <select className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2" value={shape} onChange={e=>setShape(Number(e.target.value))}>{(zh?['球','盒','环面']:['Sphere','Box','Torus']).map((s,i)=><option key={i} value={i}>{s}</option>)}</select></label>
    <label className="text-xs text-[var(--text-primary)]">{zh?'运算':'Operation'} <select className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2" value={operation} onChange={e=>setOperation(Number(e.target.value))}>{(zh?['单体','组合','切除']:['Single','Union','Subtract']).map((s,i)=><option key={i} value={i}>{s}</option>)}</select></label>
    <LabRange label={zh?'旋转':'Rotation'} value={angle} min={-3.14} max={3.14} step={.02} onChange={setAngle}/><LabRange label={zh?'光源':'Light'} value={light} min={-3.14} max={3.14} step={.02} onChange={setLight}/><LabRange label={zh?'金属':'Metal'} value={metallic} min={0} max={1} step={.02} onChange={setMetallic}/><LabRange label={zh?'色相':'Hue'} value={hue} min={0} max={1} step={.01} onChange={setHue}/><LabButton onClick={()=>{setShape(0);setOperation(1);setAngle(.4);setLight(1);setMetallic(.7);setHue(.53);}}>{zh?'重置':'Reset'}</LabButton>
    </LabToolbar></fieldset></div>;
}
