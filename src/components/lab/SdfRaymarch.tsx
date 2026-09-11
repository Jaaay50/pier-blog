'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {LabButton,LabRange,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';

const VERT=`#version 300 es
in vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;

const DEFAULTS={shape:0,operation:1,angle:2.35,light:1.2,metallic:.55,hue:.74};

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

float smin(float a,float b,float k){
  float h=clamp(.5+.5*(b-a)/k,0.,1.);
  return mix(b,a,h)-k*h*(1.-h);
}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float sphere(vec3 p,float r){return length(p)-r;}
float roundBox(vec3 p,vec3 b,float r){
  vec3 q=abs(p)-b;
  return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;
}
float torus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}

float object(vec3 p){
  float c=cos(angle),s=sin(angle);
  p.xz=mat2(c,-s,s,c)*p.xz;
  float sph=sphere(p-vec3(0.,.7,0.),.7);
  float box=roundBox(p-vec3(0.,.62,0.),vec3(.54),.08);
  float tor=torus(p-vec3(0.,.22,0.),vec2(.62,.22));
  float a=shape==0?sph:shape==1?box:tor;
  if(operation==1){
    float extra=shape==1
      ?sphere(p-vec3(.52,.7,.08),.7)
      :roundBox(p-vec3(.56,.62,.06),vec3(.54),.08);
    a=smin(a,extra,.18);
  }
  if(operation==2){
    a=smax(a,-sphere(p-vec3(.46,.78,.3),.48),.1);
  }
  return a;
}
float studio(vec3 p){return smin(p.y,p.z+3.15,1.65);}
vec2 scene(vec3 p){
  float d=object(p),g=studio(p);
  return d<g?vec2(d,1.):vec2(g,0.);
}
vec3 normalAt(vec3 p){
  const vec2 e=vec2(.0012,0.);
  return normalize(vec3(
    scene(p+e.xyy).x-scene(p-e.xyy).x,
    scene(p+e.yxy).x-scene(p-e.yxy).x,
    scene(p+e.yyx).x-scene(p-e.yyx).x
  ));
}
vec2 march(vec3 ro,vec3 rd){
  float t=0.,id=-1.;
  for(int i=0;i<104;i++){
    vec2 h=scene(ro+rd*t);
    if(h.x<.0008*max(t,1.)){id=h.y;break;}
    t+=h.x;
    if(t>22.)break;
  }
  return vec2(t,id);
}
float softShadow(vec3 ro,vec3 rd,float limit){
  float shade=1.,t=.03;
  for(int i=0;i<32;i++){
    float h=scene(ro+rd*t).x;
    shade=min(shade,16.*h/t);
    t+=clamp(h,.03,.22);
    if(h<.001||t>limit)break;
  }
  return clamp(shade,0.,1.);
}
float ao(vec3 p,vec3 n){
  float occ=0.,sca=1.;
  for(int i=1;i<=5;i++){
    float h=.02+.11*float(i);
    occ+=(h-scene(p+n*h).x)*sca;
    sca*=.82;
  }
  return clamp(1.-1.15*occ,0.,1.);
}
vec3 palette(float h){
  vec3 clay=vec3(.851,.467,.341);
  vec3 sand=vec3(.831,.635,.498);
  vec3 steel=vec3(.55,.62,.7);
  vec3 blue=vec3(.416,.608,.8);
  float t=clamp(h,0.,1.)*3.;
  vec3 col=t<1.?mix(clay,sand,t):t<2.?mix(sand,steel,t-1.):mix(steel,blue,t-2.);
  return mix(col,col*vec3(.9,.94,1.06),dark);
}
vec3 env(vec3 rd){
  vec3 zenith=mix(vec3(.9,.86,.78),vec3(.16,.24,.36),dark);
  vec3 horizon=mix(vec3(.84,.79,.7),vec3(.05,.055,.065),dark);
  vec3 ground=mix(vec3(.58,.53,.46),vec3(.025,.027,.032),dark);
  vec3 col=mix(horizon,zenith,smoothstep(0.,1.,rd.y));
  col=mix(ground,col,smoothstep(-.2,.05,rd.y));
  vec3 sunDir=normalize(vec3(sin(lightAngle),.72,cos(lightAngle)));
  float sun=pow(max(dot(rd,sunDir),0.),mix(24.,48.,dark));
  vec3 sunCol=mix(vec3(1.,.82,.62),vec3(.7,.82,1.),dark);
  vec2 window=rd.xy-vec2(.18,.42);
  float softbox=pow(clamp(1.-length(window*vec2(1.6,2.8)),0.,1.),1.6);
  return col+sunCol*(sun*mix(.35,.55,dark)+softbox*mix(.22,.4,dark));
}
float D_GGX(float NoH,float a){
  float a2=a*a;
  float d=NoH*NoH*(a2-1.)+1.;
  return a2/(3.14159265*d*d);
}
float G_Smith(float NoV,float NoL,float a){
  float k=(a+1.);
  k=k*k*.125;
  return (NoV/(NoV*(1.-k)+k))*(NoL/(NoL*(1.-k)+k));
}
vec3 studioAlbedo(vec3 p){
  float pool=exp(-dot(p.xz,p.xz)*.07);
  vec3 base=mix(vec3(.76,.72,.66),vec3(.068,.072,.082),dark);
  vec3 lift=mix(vec3(.1,.07,.04),vec3(.035,.05,.08),dark);
  return base+lift*pool;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float id){
  vec3 V=-rd;
  float isObj=id>.5?1.:0.;
  vec3 albedo=mix(studioAlbedo(p),palette(hue),isObj);
  float metal=mix(0.,metallic,isObj);
  float rough=mix(.38,mix(.4,.12,metallic),isObj);
  vec3 F0=mix(vec3(.04),albedo,metal);
  vec3 lPos=vec3(sin(lightAngle)*3.4,3.5,cos(lightAngle)*3.4);
  vec3 L=normalize(lPos-p);
  vec3 H=normalize(L+V);
  float NoL=max(dot(n,L),0.);
  float NoV=max(dot(n,V),0.);
  float NoH=max(dot(n,H),0.);
  float occ=ao(p,n);
  float sh=mix(1.,softShadow(p+n*.02,L,length(lPos-p)),.35+.65*isObj);
  vec3 F=F0+(1.-F0)*pow(1.-NoV,5.);
  float a=max(rough,.04);
  vec3 spec=D_GGX(NoH,a)*G_Smith(max(NoV,1e-4),max(NoL,1e-4),a)*F/max(4.*NoV*NoL,1e-4);
  vec3 diff=(1.-F)*(1.-metal)*albedo/3.14159265;
  vec3 keyCol=mix(vec3(1.,.9,.78)*2.1,vec3(.72,.84,1.05)*2.35,dark);
  vec3 R=reflect(rd,n);
  vec3 amb=albedo*env(n)*occ*mix(.32,.16,dark)*(1.-metal);
  vec3 specAmb=env(R)*F*occ*mix(.22,.58,metal);
  vec3 rim=mix(vec3(.92,.72,.52),vec3(.38,.58,.92),dark)*pow(1.-NoV,3.)*occ*mix(.12,.38,isObj);
  vec3 bounce=albedo*studioAlbedo(vec3(p.x,0.,p.z))*occ*max(-n.y,0.)*.22;
  vec3 L2=normalize(vec3(-.35,.55,.85));
  vec3 fill=(diff*mix(vec3(.55,.48,.4),vec3(.2,.28,.42),dark)+spec*.25)*max(dot(n,L2),0.)*occ;
  return (diff+spec)*keyCol*NoL*sh+fill+amb+specAmb+rim+bounce;
}
vec3 film(vec3 x){
  x*=1.08;
  float a=2.51,b=.03,c=2.43,d=.59,e=.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.,1.);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
  vec3 ta=vec3(.12,.28,0.),ro=vec3(2.85,1.78,3.75);
  vec3 fw=normalize(ta-ro);
  vec3 rt=normalize(cross(fw,vec3(0.,1.,0.)));
  vec3 up=cross(rt,fw);
  vec3 rd=normalize(rt*uv.x+up*uv.y+fw*1.62);
  vec2 hit=march(ro,rd);
  vec3 col=env(rd);
  if(hit.y>=0.){
    vec3 p=ro+rd*hit.x,n=normalAt(p);
    col=shade(p,n,rd,hit.y);
    vec3 rr=reflect(rd,n);
    vec2 bounce=march(p+n*.02,rr);
    vec3 reflected=env(rr);
    if(bounce.y>=0.){
      vec3 p2=p+n*.02+rr*bounce.x;
      reflected=shade(p2,normalAt(p2),rr,bounce.y);
    }
    float fres=.04+.72*pow(1.-max(dot(-rd,n),0.),5.);
    float k=hit.y>.5?mix(.18,.72,metallic)*fres:mix(.18,.34,dark);
    col=mix(col,reflected,k);
    col=mix(col,env(rd),1.-exp(-.006*hit.x*hit.x));
  }
  col*=1.-.22*dot(uv,uv);
  fragColor=vec4(pow(film(max(col,0.)),vec3(.4545)),1.);
}`;

export default function SdfRaymarch({isDark,onReadyChange}:NewDemoProps){
  const zh=useLocale()==='zh',canvas=useRef<HTMLCanvasElement>(null),draw=useRef<()=>void>(()=>{}),params=useRef({...DEFAULTS,dark:isDark});
  const [shape,setShape]=useState(DEFAULTS.shape),[operation,setOperation]=useState(DEFAULTS.operation),[angle,setAngle]=useState(DEFAULTS.angle),[light,setLight]=useState(DEFAULTS.light),[metallic,setMetallic]=useState(DEFAULTS.metallic),[hue,setHue]=useState(DEFAULTS.hue),[failed,setFailed]=useState(false);
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
        const rect=el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);
        el.width=Math.max(1,Math.round(rect.width*dpr));el.height=Math.max(1,Math.round(rect.height*dpr));schedule();
      };
      const observer=new ResizeObserver(resize);disconnectResize=()=>observer.disconnect();observer.observe(el);
      stopGate=observeRenderGate(el,inView=>{if(disposed)return;active=inView;if(active)schedule();else{cancelAnimationFrame(frame);frame=0;}});
      resize();
    }catch{fail();}
    return cleanup;
  },[]);

  const reset=()=>{setShape(DEFAULTS.shape);setOperation(DEFAULTS.operation);setAngle(DEFAULTS.angle);setLight(DEFAULTS.light);setMetallic(DEFAULTS.metallic);setHue(DEFAULTS.hue);};

  return <div className="flex h-full flex-col bg-[var(--bg-primary)]"><canvas ref={canvas} role="img" aria-label={zh?'距离场光线步进渲染':'Raymarched distance field'} className="min-h-0 w-full flex-1"/>{failed&&<p role="alert" className="p-3 text-sm text-[var(--text-primary)]">{zh?'WebGL2 渲染不可用':'WebGL2 rendering unavailable'}</p>}<fieldset disabled={failed}><LabToolbar>
    <label className="text-xs text-[var(--text-primary)]">{zh?'形体':'Shape'} <select className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2" value={shape} onChange={e=>setShape(Number(e.target.value))}>{(zh?['球','盒','环面']:['Sphere','Box','Torus']).map((s,i)=><option key={i} value={i}>{s}</option>)}</select></label>
    <label className="text-xs text-[var(--text-primary)]">{zh?'运算':'Operation'} <select className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2" value={operation} onChange={e=>setOperation(Number(e.target.value))}>{(zh?['单体','组合','切除']:['Single','Union','Subtract']).map((s,i)=><option key={i} value={i}>{s}</option>)}</select></label>
    <LabRange label={zh?'旋转':'Rotation'} value={angle} min={-3.14} max={3.14} step={.02} onChange={setAngle}/><LabRange label={zh?'光源':'Light'} value={light} min={-3.14} max={3.14} step={.02} onChange={setLight}/><LabRange label={zh?'金属':'Metal'} value={metallic} min={0} max={1} step={.02} onChange={setMetallic}/><LabRange label={zh?'色相':'Hue'} value={hue} min={0} max={1} step={.01} onChange={setHue}/><LabButton onClick={reset}>{zh?'重置':'Reset'}</LabButton>
    </LabToolbar></fieldset></div>;
}
