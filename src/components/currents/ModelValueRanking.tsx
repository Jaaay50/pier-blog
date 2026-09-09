'use client';

import type {ReactNode} from 'react';
import type {ModelsPrice} from '@/lib/currents/models-types';
import {rateIsCurrent} from '@/lib/currents/model-prices';
import {usePriceClock} from './usePriceClock';

interface ModelValueRankingProps {
  price:ModelsPrice;
  initialNow:number;
  valueValidUntil?:string|null;
  rank:number|null;
  valueScore:number|null;
  title:string;
  observingLabel:string|null;
  confidence:ReactNode;
  history:ReactNode;
}

const knownAmount=(amount:number|null):amount is number=>amount!==null&&Number.isFinite(amount)&&amount>=0;

function hasCurrentBenchmark(price:ModelsPrice,now:number):boolean {
  const benchmark=price.benchmark;
  if(price.kind!=='payg'||!benchmark||benchmark.policy!=='standard-uncached-ordinary-context-peak'
    ||!knownAmount(benchmark.inputUsdPerMtok)||!knownAmount(benchmark.outputUsdPerMtok)
    ||benchmark.inputUsdPerMtok+benchmark.outputUsdPerMtok===0)return false;
  const rates=price.rates??[];
  // Keep explicit legacy fixed-USD benchmarks, but never flatten a nonempty tariff list.
  if(!rates.length)return benchmark.rateId===null&&price.inputUsdPerMtok===benchmark.inputUsdPerMtok
    &&price.outputUsdPerMtok===benchmark.outputUsdPerMtok;
  return rates.some(rate=>rate.id===benchmark.rateId&&rateIsCurrent(rate,now)
    &&!rate.modelVariant&&rate.currency==='USD'&&rate.serviceTier==='standard'&&rate.contextMin===0&&rate.timeBand!=='off_peak'
    &&['global','international'].includes(rate.region)
    &&rate.inputPerMtok===benchmark.inputUsdPerMtok&&rate.outputPerMtok===benchmark.outputUsdPerMtok);
}

/** 只隐藏失效的当前性价比；历史与能力分仍由服务端展示，不在浏览器重算。 */
export function ModelValueRanking({price,initialNow,valueValidUntil,rank,valueScore,title,observingLabel,confidence,history}:ModelValueRankingProps) {
  const now=usePriceClock(initialNow,price.rates,undefined,valueValidUntil);
  const globalValid=!valueValidUntil||now<Date.parse(valueValidUntil);
  // A replacement tariff cannot validate an old relative score. Wait for a fresh
  // response after any supplied tariff boundary rather than computing a local rank.
  const crossedBoundary=(price.rates??[]).some(rate=>[rate.effectiveFrom,rate.effectiveUntil].some(value=>{
    if(!value)return false;
    const boundary=Date.parse(value);
    return boundary>initialNow&&boundary<=now;
  }));
  const current=Number.isFinite(initialNow)&&Number.isFinite(now)&&!crossedBoundary&&globalValid
    &&hasCurrentBenchmark(price,now)&&valueScore!==null&&Number.isFinite(valueScore);

  return <div className="rounded-xl border border-[var(--border)] p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[11px] tabular-nums text-[var(--text-secondary)]">
          {current&&rank!==null?`#${rank}`:'—'}
          {current&&observingLabel&&` · ${observingLabel}`}
        </span>
        {confidence}
      </div>
      <div className="flex items-center gap-3">
        {history}
        <span className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
          {current?valueScore!.toFixed(1):'—'}
        </span>
      </div>
    </div>
  </div>;
}
