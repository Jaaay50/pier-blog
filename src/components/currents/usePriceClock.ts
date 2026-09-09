'use client';

import {useEffect,useMemo,useState} from 'react';
import type {ModelRate} from '@/lib/currents/models-types';

const EMPTY_RATES:readonly ModelRate[]=[];
const CLOCK_INTERVAL_MS=60_000;
const MAX_VERIFIED_AGE_MS=7*86_400_000;

/** 初始值与 SSR 保持一致；挂载后按生效/到期边界更新，隐藏页不持续计时。 */
export function usePriceClock(initialNow:number,rates:readonly ModelRate[]=EMPTY_RATES,verifiedAt?:string|null,validUntil?:string|null):number {
  const [now,setNow]=useState(initialNow);
  const boundaries=useMemo(()=>{
    const values=rates.flatMap(rate=>[rate.effectiveFrom,rate.effectiveUntil])
      .filter((value):value is string=>!!value).map(value=>Date.parse(value));
    if(verifiedAt)values.push(Date.parse(verifiedAt)+MAX_VERIFIED_AGE_MS+1);
    if(validUntil)values.push(Date.parse(validUntil));
    return values.filter(Number.isFinite).sort((a,b)=>a-b);
  },[rates,verifiedAt,validUntil]);

  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
    const tick=()=>{
      if(disposed)return;
      clearTimeout(timer);timer=undefined;
      const current=Date.now();setNow(current);
      if(document.hidden)return;
      const next=boundaries.find(value=>value>current);
      timer=setTimeout(tick,next===undefined?CLOCK_INTERVAL_MS:Math.min(CLOCK_INTERVAL_MS,Math.max(1,next-current)));
    };
    const visibility=()=>{clearTimeout(timer);timer=undefined;if(!document.hidden)tick();};
    queueMicrotask(tick);
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('focus',tick);
    window.addEventListener('pageshow',tick);
    return()=>{
      disposed=true;clearTimeout(timer);
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('focus',tick);
      window.removeEventListener('pageshow',tick);
    };
  },[initialNow,boundaries]);
  return now;
}
