'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {appendRaft,createRaft,tickRaft,toggleRaftNode} from './algorithms/raft';
import {LabButton,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';
const positions=Array.from({length:5},(_,i)=>({x:300+155*Math.cos(i*Math.PI*2/5-Math.PI/2),y:150+110*Math.sin(i*Math.PI*2/5-Math.PI/2)}));
export default function RaftConsensus({onReadyChange}:NewDemoProps) {
  const zh=useLocale()==='zh',root=useRef<HTMLDivElement>(null);
  const [state,setState]=useState(createRaft),[selected,setSelected]=useState(0),[value,setValue]=useState('x=1'),[playing,setPlaying]=useState(true),[visible,setVisible]=useState(false);
  useEffect(()=>{onReadyChange?.(true);return()=>onReadyChange?.(false);},[onReadyChange]);
  useEffect(()=>root.current?observeRenderGate(root.current,setVisible):undefined,[]);
  useEffect(()=>{if(!playing||!visible)return;const id=setInterval(()=>setState(tickRaft),450);return()=>clearInterval(id);},[playing,visible]);
  const target=state.nodes[selected],split=state.groups.some(g=>g!==0);
  const roles=zh?{leader:'主节点',follower:'跟随者',candidate:'候选者'}:{leader:'Leader',follower:'Follower',candidate:'Candidate'};
  return <div ref={root} className="flex h-full flex-col bg-[var(--bg-primary)]"><div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto sm:grid-cols-2">
    <svg viewBox="0 0 600 300" className="h-full min-h-36 w-full" role="img" aria-label={zh?'五节点连接状态':'Five-node network'}>
      {state.nodes.flatMap((a)=>state.nodes.filter(b=>a.id<b.id).map(b=><line key={`${a.id}-${b.id}`} x1={positions[a.id].x} y1={positions[a.id].y} x2={positions[b.id].x} y2={positions[b.id].y} stroke={a.alive&&b.alive&&state.groups[a.id]===state.groups[b.id]?'var(--accent)':'var(--border)'} strokeDasharray={state.groups[a.id]===state.groups[b.id]?undefined:'5 6'} opacity={.45}/>))}
      {state.nodes.map((n)=><g key={n.id}><circle cx={positions[n.id].x} cy={positions[n.id].y} r={28} fill={n.alive?n.role==='leader'?'var(--accent)':'var(--bg-card)':'var(--border)'} stroke={selected===n.id?'var(--text-primary)':'var(--border)'} strokeWidth={selected===n.id?3:1}/><text x={positions[n.id].x} y={positions[n.id].y+5} textAnchor="middle" fill={n.role==='leader'&&n.alive?'var(--bg-primary)':'var(--text-primary)'} fontSize="17">N{n.id+1}</text><text x={positions[n.id].x} y={positions[n.id].y+47} textAnchor="middle" fill="var(--text-secondary)" fontSize="12">{n.alive?roles[n.role]:zh?'已停止':'Stopped'} · T{n.term}</text></g>)}
    </svg>
    <div className="overflow-auto p-3 text-xs"><table className="w-full text-left text-[var(--text-primary)]"><thead><tr><th className="py-2">{zh?'节点':'Node'}</th><th>{zh?'已提交':'Committed'}</th><th>{zh?'日志':'Log'}</th></tr></thead><tbody>{state.nodes.map(n=><tr key={n.id} className="border-t border-[var(--border)]"><td className="py-3">N{n.id+1}</td><td>{n.commit}/{n.log.length}</td><td><div className="flex max-w-52 flex-wrap gap-1">{n.log.slice(-10).map((entry,i)=>{const committed=n.log.length-Math.min(n.log.length,10)+i<n.commit;return <span key={i} aria-label={`${entry.value}, ${committed?zh?'已提交':'committed':zh?'未提交':'pending'}`} className={`rounded border px-1 py-0.5 ${committed?'border-[var(--accent)] text-[var(--accent)]':'border-dashed border-[var(--border)]'}`}>{entry.value}</span>;})}</div></td></tr>)}</tbody></table></div>
    </div><LabToolbar>
      <label className="text-xs text-[var(--text-primary)]">{zh?'节点':'Node'} <select className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{state.nodes.map(n=><option key={n.id} value={n.id}>N{n.id+1} · {n.alive?roles[n.role]:zh?'已停止':'Stopped'}</option>)}</select></label>
      <LabButton onClick={()=>setState(s=>toggleRaftNode(s,selected))}>{target.alive?(zh?'停止节点':'Stop node'):(zh?'启动节点':'Start node')}</LabButton>
      <LabButton onClick={()=>setState(s=>({...s,groups:split?[0,0,0,0,0]:s.nodes.map(n=>n.id===selected||n.id===(selected+1)%5?1:0)}))}>{split?(zh?'恢复连接':'Reconnect'):(zh?'分区 2 / 3':'Partition 2 / 3')}</LabButton>
      <LabButton onClick={()=>setPlaying(p=>!p)}>{playing?(zh?'暂停':'Pause'):(zh?'播放':'Play')}</LabButton>
      <LabButton onClick={()=>{setPlaying(false);setState(tickRaft);}}>{zh?'单步':'Step'}</LabButton>
      <LabButton onClick={()=>{setState(createRaft());setSelected(0);setValue('x=1');setPlaying(true);}}>{zh?'重置':'Reset'}</LabButton>
    </LabToolbar><form className="flex gap-2 bg-[var(--bg-card)] px-3 pb-3" onSubmit={e=>{e.preventDefault();setState(s=>appendRaft(s,selected,value));}}><input aria-label={zh?'日志内容':'Log entry'} value={value} onChange={e=>setValue(e.target.value)} maxLength={24} className="min-w-0 flex-1 rounded border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]"/><LabButton type="submit" disabled={!target.alive||target.role!=='leader'||!value.trim()||target.log.length>=48}>{zh?'追加日志':'Append log'}</LabButton></form></div>;
}
