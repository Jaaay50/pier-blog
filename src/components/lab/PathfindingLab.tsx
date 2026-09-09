'use client';
import {useEffect,useMemo,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {findPath,initialGrid,type SearchResult} from './algorithms/pathfinding';
import {LabButton,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';

type Mode='wall'|'erase'|'start'|'end';
export default function Pathfinding({isDark,onReadyChange}:NewDemoProps) {
  const zh=useLocale()==='zh',root=useRef<HTMLDivElement>(null);
  const [map,setMap]=useState(initialGrid),[mode,setMode]=useState<Mode>('wall'),[step,setStep]=useState(0),[playing,setPlaying]=useState(false),[visible,setVisible]=useState(false),[cursor,setCursor]=useState(0);
  const drag=useRef<Mode|null>(null);
  const results=useMemo(()=>({astar:findPath(map,'astar'),dijkstra:findPath(map,'dijkstra')}),[map]);
  const total=Math.max(results.astar.visited.length,results.dijkstra.visited.length);
  useEffect(()=>{onReadyChange?.(true);return()=>onReadyChange?.(false);},[onReadyChange]);
  useEffect(()=>root.current?observeRenderGate(root.current,setVisible):undefined,[]);
  useEffect(()=>{if(!playing||!visible||step>=total)return;const timer=setInterval(()=>setStep(s=>Math.min(s+4,total)),40);return()=>clearInterval(timer);},[playing,visible,total,step]);
  const change=(id:number,action:Mode)=>{
    setStep(0);setPlaying(false);
    setMap(previous=>{
      if(id<0||id>=previous.rows*previous.cols)return previous;
      if(action==='start'||action==='end') {
        if(id===previous[action==='start'?'end':'start'])return previous;
        return {...previous,[action]:id,walls:previous.walls.filter(n=>n!==id)};
      }
      if(id===previous.start||id===previous.end)return previous;
      const walls=new Set(previous.walls);if(action==='erase')walls.delete(id);else walls.add(id);
      return {...previous,walls:[...walls]};
    });
  };
  const cellAt=(e:PointerEvent<SVGSVGElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const x=Math.floor((e.clientX-rect.left)/rect.width*map.cols),y=Math.floor((e.clientY-rect.top)/rect.height*map.rows);
    return x<0||x>=map.cols||y<0||y>=map.rows?-1:y*map.cols+x;
  };
  const key=(e:KeyboardEvent<SVGSVGElement>)=>{
    const moves:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-map.cols,ArrowDown:map.cols};
    if(e.key in moves){e.preventDefault();setCursor(c=>Math.max(0,Math.min(map.cols*map.rows-1,c+moves[e.key])));}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();change(cursor,mode);}
  };
  const grid=(name:string,result:SearchResult)=>{
    const visited=new Set(result.visited.slice(0,step)),path=new Set(step>=result.visited.length?result.path:[]),walls=new Set(map.walls);
    const done=step>=result.visited.length;
    return <div className="flex min-h-0 flex-1 flex-col gap-2"><div className="flex flex-wrap justify-between gap-2 px-1 text-xs text-[var(--text-primary)]"><strong>{name}</strong><span>{zh?'访问':'Visited'} {Math.min(step,result.visited.length)} · {zh?'路径':'Path'} {done?(result.path.length?result.path.length-1:zh?'无解':'None'):'—'}</span></div>
      <svg viewBox={`0 0 ${map.cols*20} ${map.rows*20}`} preserveAspectRatio="none" role="application" aria-label={`${name} ${zh?'地图：方向键移动，空格应用当前工具':'map: arrow keys move, space applies the selected tool'}`} tabIndex={0} className="min-h-0 w-full flex-1 touch-none rounded-md focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        onKeyDown={key} onPointerDown={e=>{const id=cellAt(e);drag.current=id===map.start?'start':id===map.end?'end':mode;e.currentTarget.setPointerCapture(e.pointerId);setCursor(Math.max(0,id));change(id,drag.current);}}
        onPointerMove={e=>{if(drag.current)change(cellAt(e),drag.current);}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
        {Array.from({length:map.rows*map.cols},(_,id)=>{
          const special=id===map.start||id===map.end;
          return <g key={id}><rect x={id%map.cols*20} y={Math.floor(id/map.cols)*20} width={19} height={19} fill={special?id===map.start?'#159c91':'#db734e':walls.has(id)?isDark?'#667889':'#4c535e':path.has(id)?'#e9b65b':visited.has(id)?isDark?'#244a60':'#a6d5d4':isDark?'#162230':'#ece8e1'} stroke={id===cursor?'var(--accent)':'none'} strokeWidth={2}/>{special&&<text x={id%map.cols*20+10} y={Math.floor(id/map.cols)*20+14} textAnchor="middle" fill="white" fontSize="12">{id===map.start?'S':'E'}</text>}</g>;
        })}
      </svg></div>;
  };
  return <div ref={root} className="flex h-full flex-col bg-[var(--bg-primary)]"><div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-3 sm:grid-cols-2">{grid('A*',results.astar)}{grid('Dijkstra',results.dijkstra)}</div><LabToolbar>
    <label className="text-xs text-[var(--text-primary)]">{zh?'工具':'Tool'} <select value={mode} onChange={e=>setMode(e.target.value as Mode)} className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2">{(['wall','erase','start','end'] as const).map((m,i)=><option key={m} value={m}>{(zh?['障碍','擦除','起点','终点']:['Wall','Erase','Start','End'])[i]}</option>)}</select></label>
    <LabButton onClick={()=>{if(step>=total){setStep(0);setPlaying(true);}else setPlaying(p=>!p);}}>{playing&&step<total?(zh?'暂停':'Pause'):(zh?'播放':'Play')}</LabButton>
    <LabButton onClick={()=>{setPlaying(false);setStep(s=>Math.min(s+1,total));}} disabled={step>=total}>{zh?'单步':'Step'}</LabButton>
    <LabButton onClick={()=>{drag.current=null;setMap(initialGrid());setStep(0);setPlaying(false);setMode('wall');setCursor(0);}}>{zh?'重置':'Reset'}</LabButton>
    <LabButton onClick={()=>{setMap(p=>({...p,walls:[]}));setStep(0);setPlaying(false);}}>{zh?'清空障碍':'Clear walls'}</LabButton>
  </LabToolbar></div>;
}
