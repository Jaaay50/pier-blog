'use client';
import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {createCloth,type Cloth,type ClothOptions} from './algorithms/cloth';
import {LabButton,LabRange,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';
type Mode='drag'|'cut'|'pin';
type ClothMessage={type:'reset'}|{type:'step';options:ClothOptions;steps:number}|{type:'cut';x:number;y:number}|{type:'pin';id:number};
export const CLOTH_RESPONSE_TIMEOUT_MS=5000;

function validSnapshot(value:unknown):value is Cloth {
  if(!value||typeof value!=='object')return false;
  const cloth=value as Cloth;
  return Array.isArray(cloth.points)&&cloth.points.length>0&&Array.isArray(cloth.links)&&Number.isFinite(cloth.time)
    &&cloth.points.every(point=>point&&[point.x,point.y,point.px,point.py].every(Number.isFinite)&&typeof point.pinned==='boolean')
    &&cloth.links.every(link=>link&&Number.isInteger(link.a)&&link.a>=0&&link.a<cloth.points.length&&Number.isInteger(link.b)&&link.b>=0&&link.b<cloth.points.length&&Number.isFinite(link.rest)&&Number.isFinite(link.lambda)&&typeof link.active==='boolean');
}
export default function TearableCloth({isDark,onReadyChange}:NewDemoProps) {
  const zh=useLocale()==='zh',canvas=useRef<HTMLCanvasElement>(null),worker=useRef<Worker|null>(null),snapshot=useRef<Cloth>(createCloth()),options=useRef<ClothOptions>({wind:1,obstacle:true,grab:null}),drawRef=useRef<()=>void>(()=>{});
  const [mode,setMode]=useState<Mode>('drag'),[wind,setWind]=useState(1),[obstacle,setObstacle]=useState(true),[playing,setPlaying]=useState(true),[failed,setFailed]=useState(false),[selected,setSelected]=useState(0),[links,setLinks]=useState(0),[initialized,setInitialized]=useState(false);
  const play=useRef(true),pointer=useRef<number|null>(null);
  const theme=useRef(isDark),selection=useRef(selected);
  const send=useRef<(message:ClothMessage)=>void>(()=>{}),readyCallback=useRef(onReadyChange);
  useEffect(()=>{readyCallback.current=onReadyChange;},[onReadyChange]);
  useEffect(()=>{options.current.wind=wind;options.current.obstacle=obstacle;play.current=playing;},[wind,obstacle,playing]);
  useEffect(()=>{
    const el=canvas.current;if(!el)return;
    let disposed=false,cancelled=false,active=false,raf=0,last:number|null=null,accumulator=0,busy=false,ready=false,received=false;
    let simulation:Worker|null=null,timer:ReturnType<typeof setTimeout>|null=null;
    let stopGate=()=>{},disconnectResize=()=>{};
    const queue:ClothMessage[]=[];
    const clearTimer=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
    const stop=()=>{cancelAnimationFrame(raf);raf=0;last=null;accumulator=0;};
    const releasePointer=()=>{
      const id=pointer.current;pointer.current=null;options.current.grab=null;
      if(id!==null&&el.hasPointerCapture(id))el.releasePointerCapture(id);
    };
    const dispose=()=>{
      if(disposed)return;disposed=true;active=false;stop();clearTimer();stopGate();disconnectResize();releasePointer();
      queue.length=0;busy=false;
      if(simulation){simulation.onmessage=null;simulation.onerror=null;simulation.onmessageerror=null;simulation.terminate();}
      if(worker.current===simulation)worker.current=null;
      send.current=()=>{};drawRef.current=()=>{};
    };
    const fail=()=>{
      if(disposed)return;dispose();
      queueMicrotask(()=>{if(!cancelled){setFailed(true);setInitialized(false);readyCallback.current?.(false);}});
    };
    const cleanup=()=>{cancelled=true;dispose();};
    try{
      const ctx=el.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
      simulation=new Worker(new URL('./workers/cloth.worker.ts',import.meta.url),{type:'module'});worker.current=simulation;
      const flush=()=>{
        if(disposed||busy||!queue.length||!simulation)return;
        const message=queue.shift()!;busy=true;
        // A worker can load successfully and still never answer. The same watchdog
        // covers initialization and later requests; hidden canvases make no new steps.
        timer=setTimeout(fail,CLOTH_RESPONSE_TIMEOUT_MS);
        try{simulation.postMessage(message);}catch{fail();}
      };
      send.current=(message)=>{
        if(disposed)return;
        if(message.type==='reset')queue.length=0;
        const payload=message.type==='step'?{...message,options:{...message.options,grab:message.options.grab?{...message.options.grab}:null}}:message;
        if(payload.type==='step'&&queue.at(-1)?.type==='step')queue[queue.length-1]=payload;
        else queue.push(payload);
        flush();
      };
      const draw=()=>{
        if(disposed||!active||!received)return;
        try{
          ctx.setTransform(el.width/600,0,0,el.height/360,0,0);ctx.fillStyle=theme.current?'#111c28':'#efebe3';ctx.fillRect(0,0,600,360);
          if(options.current.obstacle){ctx.beginPath();ctx.arc(330,255,52,0,Math.PI*2);ctx.fillStyle=theme.current?'#33495d':'#d0c4b5';ctx.fill();}
          const cloth=snapshot.current;
          ctx.lineWidth=.9;ctx.strokeStyle=theme.current?'#7ac1d3':'#ad674e';ctx.beginPath();
          for(const link of cloth.links)if(link.active){const a=cloth.points[link.a],b=cloth.points[link.b];ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();
          cloth.points.forEach((point,index)=>{if(point.pinned||index===selection.current){ctx.beginPath();ctx.arc(point.x,point.y,index===selection.current?4:3,0,Math.PI*2);ctx.fillStyle=point.pinned?'#edb554':'#e66e65';ctx.fill();}});
          // Only the successful worker response may replace the server poster.
          if(!ready){ready=true;setFailed(false);setInitialized(true);readyCallback.current?.(true);}
        }catch{fail();}
      };drawRef.current=draw;
      const resize=()=>{
        if(disposed)return;
        const rect=el.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.5);
        el.width=Math.max(1,Math.round(rect.width*dpr));el.height=Math.max(1,Math.round(rect.height*dpr));draw();
      };
      simulation.onmessage=(event:MessageEvent<unknown>)=>{
        if(disposed||!busy)return;
        if(!validSnapshot(event.data)){fail();return;}
        clearTimer();busy=false;received=true;snapshot.current=event.data;
        setLinks(event.data.links.filter(link=>link.active).length);draw();flush();
      };
      simulation.onerror=fail;simulation.onmessageerror=fail;
      const frame=(now:number)=>{
        raf=0;if(!active||disposed)return;
        const dt=last===null?0:Math.min(Math.max(0,(now-last)/1000),.04);last=now;
        if(play.current&&received&&!busy&&!queue.length){
          accumulator=Math.min(accumulator+dt,.065);const steps=Math.floor(accumulator*120);
          if(steps){accumulator-=steps/120;send.current({type:'step',options:options.current,steps});}
        }
        if(!disposed)raf=requestAnimationFrame(frame);
      };
      stopGate=observeRenderGate(el,enabled=>{
        if(disposed)return;active=enabled;stop();
        if(enabled){draw();if(!disposed)raf=requestAnimationFrame(frame);}
        else{
          releasePointer();
          // A queued drag is obsolete when input capture ends outside the viewport.
          for(let index=queue.length-1;index>=0;index--)if(queue[index].type==='step')queue.splice(index,1);
        }
      });
      const observer=new ResizeObserver(resize);disconnectResize=()=>observer.disconnect();observer.observe(el);resize();
      send.current({type:'reset'});
    }catch{fail();}
    return cleanup;
  },[]);
  useEffect(()=>{theme.current=isDark;selection.current=selected;drawRef.current();},[isDark,selected,obstacle]);
  const at=(e:PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect();return{x:Math.max(5,Math.min(595,(e.clientX-r.left)/r.width*600)),y:Math.max(5,Math.min(355,(e.clientY-r.top)/r.height*360))};};
  const nearest=(x:number,y:number)=>{let id=0,d=Infinity;snapshot.current.points.forEach((p,i)=>{const dd=Math.hypot(x-p.x,y-p.y);if(dd<d){d=dd;id=i;}});return id;};
  const release=()=>{pointer.current=null;options.current.grab=null;};
  const key=(e:KeyboardEvent<HTMLCanvasElement>)=>{
    if(failed||!initialized)return;
    const p=snapshot.current.points[selected];if(!p)return;
    if(e.key===' '||e.key==='Enter'){e.preventDefault();if(mode==='pin')send.current({type:'pin',id:selected});else if(mode==='cut')send.current({type:'cut',x:p.x,y:p.y});else setSelected(i=>(i+1)%snapshot.current.points.length);return;}
    const delta:Record<string,[number,number]>={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]};const d=delta[e.key];if(d){e.preventDefault();if(mode==='drag'){options.current.grab={id:selected,x:Math.max(5,Math.min(595,p.x+d[0])),y:Math.max(5,Math.min(355,p.y+d[1]))};send.current({type:'step',options:options.current,steps:2});}else setSelected(i=>Math.max(0,Math.min(snapshot.current.points.length-1,i+(d[0]?Math.sign(d[0]):Math.sign(d[1])*29))));}
  };
  return <div className="flex h-full flex-col bg-[var(--bg-primary)]"><canvas ref={canvas} tabIndex={failed||!initialized?-1:0} role="application" aria-label={zh?'布料：方向键移动节点，空格应用工具':'Cloth: arrows move nodes, space applies tool'} className="min-h-0 w-full flex-1 touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]" onKeyDown={key} onKeyUp={release} onBlur={release}
    onPointerDown={e=>{if(failed||!initialized)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);const p=at(e),id=nearest(p.x,p.y);setSelected(id);if(mode==='cut')send.current({type:'cut',...p});else if(mode==='pin')send.current({type:'pin',id});else options.current.grab={id,...p};}}
    onPointerMove={e=>{if(pointer.current!==e.pointerId)return;const p=at(e);if(mode==='cut')send.current({type:'cut',...p});else if(mode==='drag'&&options.current.grab){options.current.grab={id:options.current.grab.id,...p};if(!play.current)send.current({type:'step',options:options.current,steps:1});}}} onPointerUp={e=>{release();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={release} onLostPointerCapture={release}/>
    {failed&&<p role="alert" className="p-2 text-sm">{zh?'无法启动布料模拟':'Unable to start cloth simulation'}</p>}<fieldset disabled={failed||!initialized}><LabToolbar>
    <label className="text-xs text-[var(--text-primary)]">{zh?'工具':'Tool'} <select value={mode} onChange={e=>{release();setMode(e.target.value as Mode);}} className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2">{(['drag','cut','pin'] as const).map((m,i)=><option key={m} value={m}>{(zh?['拖拽','剪断','固定节点']:['Drag','Cut','Pin node'])[i]}</option>)}</select></label><LabRange label={zh?'风力':'Wind'} value={wind} min={-3} max={3} step={.1} onChange={setWind}/><LabButton aria-pressed={obstacle} onClick={()=>setObstacle(p=>!p)}>{zh?'球形障碍':'Sphere'}</LabButton><LabButton onClick={()=>setPlaying(p=>!p)}>{playing?(zh?'暂停':'Pause'):(zh?'播放':'Play')}</LabButton><LabButton onClick={()=>{release();setMode('drag');setWind(1);setObstacle(true);setPlaying(true);setSelected(0);options.current={wind:1,obstacle:true,grab:null};send.current({type:'reset'});}}>{zh?'重置':'Reset'}</LabButton><output className="text-xs text-[var(--text-primary)]">{initialized?links:"—"} {zh?'约束':'constraints'}</output></LabToolbar></fieldset></div>;
}
