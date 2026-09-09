'use client';
import {useEffect,useMemo,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {useLocale} from 'next-intl';
import {delaunay,voronoiCells,type Point} from './algorithms/geometry';
import {LabButton,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';
const initial=():Point[]=>Array.from({length:16},(_,i)=>({x:65+(i%4)*150+Math.sin(i*3)*35,y:50+Math.floor(i/4)*75+Math.cos(i*2)*25}));
export default function VoronoiDelaunay({isDark,onReadyChange}:NewDemoProps) {
  const zh=useLocale()==='zh';
  const [points,setPoints]=useState(initial),[regions,setRegions]=useState(true),[mesh,setMesh]=useState(true),[erase,setErase]=useState(false),[selected,setSelected]=useState(0);
  const drag=useRef<number|null>(null);
  const geometry=useMemo(()=>delaunay(points),[points]);
  const cells=useMemo(()=>voronoiCells(geometry.points,600,350),[geometry.points]);
  useEffect(()=>{onReadyChange?.(true);return()=>onReadyChange?.(false);},[onReadyChange]);
  const at=(e:PointerEvent<SVGSVGElement>):Point=>{const r=e.currentTarget.getBoundingClientRect();return{x:Math.min(596,Math.max(4,(e.clientX-r.left)/r.width*600)),y:Math.min(346,Math.max(4,(e.clientY-r.top)/r.height*350))};};
  const remove=(id:number)=>{setPoints(p=>p.filter((_,i)=>i!==id));setSelected(s=>Math.max(0,Math.min(s,points.length-2)));};
  const move=(id:number,p:Point)=>setPoints(old=>old.some((q,i)=>i!==id&&Math.hypot(p.x-q.x,p.y-q.y)<2)?old:old.map((q,i)=>i===id?p:q));
  const key=(e:KeyboardEvent<SVGSVGElement>)=>{
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove(selected);return;}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();setSelected(i=>(i+1)%Math.max(points.length,1));return;}
    const deltas:Record<string,Point>={ArrowLeft:{x:-5,y:0},ArrowRight:{x:5,y:0},ArrowUp:{x:0,y:-5},ArrowDown:{x:0,y:5}};
    const d=deltas[e.key],p=points[selected];if(d&&p){e.preventDefault();move(selected,{x:Math.max(4,Math.min(596,p.x+d.x)),y:Math.max(4,Math.min(346,p.y+d.y))});}
  };
  const addPoint=()=>{
    if(points.length>=48)return;
    // 48 个候选位置彼此间隔大于碰撞半径；不足 48 个点时必有空位。
    for(let offset=0;offset<48;offset++){
      const index=(points.length+offset)%48,p={x:50+(index%8)*70,y:35+Math.floor(index/8)*56};
      if(points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<2))continue;
      setSelected(points.length);setPoints(old=>[...old,p]);return;
    }
  };
  return <div className="flex h-full flex-col bg-[var(--bg-primary)]"><svg viewBox="0 0 600 350" preserveAspectRatio="none" className="min-h-0 w-full flex-1 touch-none focus-visible:outline-2 focus-visible:outline-[var(--accent)]" role="application" tabIndex={0} aria-label={zh?'几何画布：空格选择点，方向键移动，Delete 删除':'Geometry canvas: space selects a point, arrows move, Delete removes'} onKeyDown={key}
    onPointerDown={e=>{const p=at(e),id=points.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<16);if(erase){if(id>=0)remove(id);return;}if(id>=0){drag.current=id;setSelected(id);}else if(points.length<48){drag.current=points.length;setSelected(points.length);setPoints(old=>[...old,p]);}e.currentTarget.setPointerCapture(e.pointerId);}}
    onPointerMove={e=>{if(drag.current!==null)move(drag.current,at(e));}} onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
    {regions&&cells.map((cell,i)=><polygon key={i} points={cell.map(p=>`${p.x},${p.y}`).join(' ')} fill={`hsl(${(i*47+180)%360} ${isDark?35:42}% ${isDark?22:82}%)`} stroke="var(--bg-primary)" strokeWidth={2}/>)}
    {mesh&&geometry.triangles.map((t,i)=><polygon key={i} points={t.map(n=>`${geometry.points[n].x},${geometry.points[n].y}`).join(' ')} stroke="var(--text-secondary)" strokeWidth={1.2} fill="none"/>)}
    {points.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={i===selected?6:4} fill={i===selected?'var(--accent)':'var(--text-primary)'} stroke="var(--bg-primary)" strokeWidth={2}/>)}
  </svg><LabToolbar><LabButton aria-pressed={regions} onClick={()=>setRegions(p=>!p)}>Voronoi</LabButton><LabButton aria-pressed={mesh} onClick={()=>setMesh(p=>!p)}>Delaunay</LabButton><LabButton aria-pressed={erase} onClick={()=>setErase(p=>!p)}>{erase?(zh?'删除模式':'Delete mode'):(zh?'移动 / 添加':'Move / add')}</LabButton><LabButton onClick={addPoint} disabled={points.length>=48}>{zh?'添加点':'Add point'}</LabButton><LabButton onClick={()=>remove(selected)} disabled={!points.length}>{zh?'删除所选':'Delete selected'}</LabButton><LabButton onClick={()=>{drag.current=null;setPoints(initial());setSelected(0);setRegions(true);setMesh(true);setErase(false);}}>{zh?'重置':'Reset'}</LabButton><output className="text-xs text-[var(--text-primary)]">{points.length} {zh?'点':'points'} · {geometry.triangles.length} {zh?'三角形':'triangles'}</output></LabToolbar></div>;
}
