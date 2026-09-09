'use client';
import {useEffect,useRef,useState} from 'react';
import {useLocale} from 'next-intl';
import {observeRenderGate} from '@/lib/webgl';
import {LabButton,LabRange,LabToolbar} from './LabControls';
import type {NewDemoProps} from './new-demo-types';
interface AudioGraph { context:AudioContext; oscillator:OscillatorNode; gain:GainNode; filter:BiquadFilterNode; analyser:AnalyserNode }
export const AUDIO_START_TIMEOUT_MS=5000;
export default function AudioSpectrum({isDark,onReadyChange}:NewDemoProps) {
  const zh=useLocale()==='zh',canvas=useRef<HTMLCanvasElement>(null),graph=useRef<AudioGraph|null>(null),mounted=useRef(false),theme=useRef(isDark),draw=useRef<()=>void>(()=>{}),request=useRef(0);
  const [wave,setWave]=useState<OscillatorType>('sine'),[frequency,setFrequency]=useState(220),[gain,setGain]=useState(.12),[cutoff,setCutoff]=useState(2400),[playing,setPlaying]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState(false);
  const params=useRef({wave,frequency,gain,cutoff});
  const startupTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{params.current={wave,frequency,gain,cutoff};const g=graph.current;if(!g)return;const now=g.context.currentTime;g.oscillator.type=wave;g.oscillator.frequency.setTargetAtTime(frequency,now,.02);g.gain.gain.setTargetAtTime(gain,now,.025);g.filter.frequency.setTargetAtTime(cutoff,now,.025);},[wave,frequency,gain,cutoff]);
  useEffect(()=>{theme.current=isDark;draw.current();},[isDark]);
  const close=()=>{
    if(startupTimeout.current!==null){clearTimeout(startupTimeout.current);startupTimeout.current=null;}
    const g=graph.current;graph.current=null;if(!g)return;
    try {g.oscillator.stop();}catch{}g.oscillator.disconnect();g.gain.disconnect();g.filter.disconnect();g.analyser.disconnect();void g.context.close().catch(()=>{});
  };
  useEffect(()=>{
    mounted.current=true;const el=canvas.current;if(!el)return;
    const ctx=el.getContext('2d');if(!ctx){onReadyChange?.(false);return;}
    let active=false,raf=0,ready=false;
    const samples=new Uint8Array(2048),spectrum=new Uint8Array(1024);
    const paint=()=>{
      const w=el.width,h=el.height,dark=theme.current;
      ctx.fillStyle=dark?'#111c28':'#efebe3';ctx.fillRect(0,0,w,h);
      const g=graph.current;samples.fill(128);spectrum.fill(0);
      if(g&&g.context.state==='running'){g.analyser.getByteTimeDomainData(samples);g.analyser.getByteFrequencyData(spectrum);}
      ctx.strokeStyle=dark?'#334151':'#c7bdb1';ctx.lineWidth=1;
      for(const y of [.25,.5,.92]){ctx.beginPath();ctx.moveTo(0,h*y);ctx.lineTo(w,h*y);ctx.stroke();}
      ctx.strokeStyle=dark?'#78c9d5':'#aa5c40';ctx.lineWidth=2;ctx.beginPath();
      for(let i=0;i<samples.length;i++){const x=i/(samples.length-1)*w,y=h*.25+(samples[i]/128-1)*h*.22;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();
      const bars=80;for(let i=0;i<bars;i++){const bin=Math.min(spectrum.length-1,Math.round(Math.pow(i/(bars-1),2)*(spectrum.length-1))),v=spectrum[bin]/255;ctx.fillStyle=dark?'#7397c7':'#c77c57';ctx.fillRect(i*w/bars,h*.92-v*h*.35,Math.max(1,w/bars-2),v*h*.35);}
      if(!ready){ready=true;onReadyChange?.(true);}
    };draw.current=paint;
    const frame=()=>{if(!active)return;paint();raf=requestAnimationFrame(frame);};
    const gate=observeRenderGate(el,inView=>{active=inView;if(inView){paint();raf=requestAnimationFrame(frame);}else{cancelAnimationFrame(raf);request.current++;close();setPending(false);setPlaying(false);}});
    const resize=()=>{const r=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5);el.width=Math.max(1,Math.round(r.width*dpr));el.height=Math.max(1,Math.round(r.height*dpr));paint();};
    const ro=new ResizeObserver(resize);ro.observe(el);resize();
    // This ref is a cancellation generation, not a DOM handle. Invalidate the latest request on cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return()=>{mounted.current=false;request.current++;gate();ro.disconnect();cancelAnimationFrame(raf);close();draw.current=()=>{};onReadyChange?.(false);};
  },[onReadyChange]);
  const toggle=()=>{
    if(playing){request.current++;close();setPlaying(false);draw.current();return;}
    const id=++request.current;setPending(true);setError(false);
    const fail=()=>{
      if(!mounted.current||id!==request.current)return;
      request.current++;close();setPending(false);setPlaying(false);setError(true);
    };
    let context:AudioContext|undefined;
    try {
      context=new AudioContext();const oscillator=context.createOscillator(),volume=context.createGain(),filter=context.createBiquadFilter(),analyser=context.createAnalyser();
      graph.current={context,oscillator,gain:volume,filter,analyser};analyser.fftSize=2048;analyser.smoothingTimeConstant=.65;filter.type='lowpass';
      oscillator.type=params.current.wave;oscillator.frequency.value=params.current.frequency;volume.gain.value=params.current.gain;filter.frequency.value=params.current.cutoff;
      oscillator.connect(filter);filter.connect(volume);volume.connect(analyser);analyser.connect(context.destination);oscillator.start();
      startupTimeout.current=setTimeout(fail,AUDIO_START_TIMEOUT_MS);
      void context.resume().then(()=>{
        if(!mounted.current||id!==request.current)return;
        if(context?.state!=='running'){fail();return;}
        if(startupTimeout.current!==null){clearTimeout(startupTimeout.current);startupTimeout.current=null;}
        setPending(false);setPlaying(true);
      },fail);
    } catch {
      if(context&&graph.current?.context!==context)void context.close().catch(()=>{});
      fail();
    }
  };
  return <div className="flex h-full flex-col bg-[var(--bg-primary)]"><div className="flex justify-between px-3 pt-3 text-xs text-[var(--text-secondary)]"><span>{zh?'时域 / 频域':'Time / frequency'}</span><output>{playing?(zh?'播放中':'Playing'):(zh?'静音':'Muted')}</output></div><canvas ref={canvas} role="img" aria-label={zh?'实时波形与频谱':'Live waveform and spectrum'} className="min-h-0 w-full flex-1"/>{error&&<p role="alert" className="px-3 text-sm text-[var(--text-primary)]">{zh?'音频启动失败，请重试':'Audio could not start. Try again.'}</p>}<LabToolbar>
    <LabButton onClick={()=>void toggle()} disabled={pending}>{playing?(zh?'静音':'Mute'):(zh?'播放':'Play')}</LabButton>
    <label className="text-xs text-[var(--text-primary)]">{zh?'波形':'Wave'} <select value={wave} onChange={e=>setWave(e.target.value as OscillatorType)} className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-2">{(['sine','triangle','square','sawtooth'] as const).map((w,i)=><option key={w} value={w}>{(zh?['正弦','三角','方波','锯齿']:['Sine','Triangle','Square','Sawtooth'])[i]}</option>)}</select></label>
    <LabRange label="Hz" min={40} max={1200} value={frequency} onChange={setFrequency}/><LabRange label={zh?'增益':'Gain'} min={0} max={.3} step={.01} value={gain} onChange={setGain}/><LabRange label={zh?'低通 Hz':'Low-pass Hz'} min={80} max={10000} step={20} value={cutoff} onChange={setCutoff}/><LabButton onClick={()=>{request.current++;close();setPending(false);setPlaying(false);setError(false);setWave('sine');setFrequency(220);setGain(.12);setCutoff(2400);}}>{zh?'重置':'Reset'}</LabButton>
  </LabToolbar></div>;
}
