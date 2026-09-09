import type {ModelRate,ModelsPrice} from '@/lib/currents/models-types';
import {formatRate,rateIsCurrent} from '@/lib/currents/model-prices';

const MAX_VERIFIED_AGE_MS=7*86_400_000;
const knownAmount=(value:number|null):value is number=>value!==null&&Number.isFinite(value)&&value>=0;

export function ModelPriceTable({price,locale,now}:{price:ModelsPrice;locale:string;now:number}) {
  const zh=locale==='zh',rates=price.rates??[];
  const active=rates.filter(rate=>rateIsCurrent(rate,now));
  const legacy=rates.length===0&&price.kind==='payg'&&knownAmount(price.inputUsdPerMtok)&&knownAmount(price.outputUsdPerMtok);
  const hasPrice=active.length>0||legacy;
  const verifiedAt=price.verifiedAt?Date.parse(price.verifiedAt):NaN;
  const verification=price.verification?.status??'unknown';
  const stale=verification==='stale'||!!price.verification?.lastErrorCode
    ||(rates.length>0&&active.length===0)
    ||(hasPrice&&verification==='verified'&&(!Number.isFinite(verifiedAt)||now-verifiedAt>MAX_VERIFIED_AGE_MS));
  const state=hasPrice
    ?stale?zh?'沿用上次有效价格':'Retained last valid price':verification==='verified'?zh?'已核验':'Verified':zh?'待核验':'Unverified'
    :stale?zh?'待重新核验':'Reverification required':zh?'待核验':'Unverified';
  const number=(value:number)=>new Intl.NumberFormat('en-US').format(value);
  const date=(value:string|null)=>{
    if(!value||!Number.isFinite(Date.parse(value)))return '—';
    return <time dateTime={value}>{new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{
      timeZone:'Asia/Hong_Kong',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',timeZoneName:'short',hour12:false,
    }).format(new Date(value))}</time>;
  };
  const context=(rate:ModelRate)=>{
    if(rate.contextMax===null)return rate.contextMin===0?zh?'未设价格分档上限':'No upper pricing tier':`≥ ${number(rate.contextMin)} tokens`;
    return `${number(rate.contextMin)}–${number(rate.contextMax)} tokens`;
  };
  const benchmark=price.benchmark?.rateId;
  const benchmarkLabel=benchmark&&active.some(rate=>rate.id===benchmark)?benchmark
    :legacy&&price.benchmark?zh?'固定 USD 单价':'Fixed USD rate':'—';
  const source=(url:string|null)=>url
    ?<a className="text-[var(--accent)] underline" href={url} rel="noopener noreferrer" target="_blank">{zh?'官方价目':'Official rates'}</a>:'—';
  const headings=zh?['档位 / 地区','输入 / 输出 · 每百万 token','上下文计费档','计费条件','有效期','来源']
    :['Tier / region','Input / output · per MTok','Context pricing tier','Billing','Validity','Source'];
  return <section className="mt-8" aria-labelledby="model-pricing">
    <h2 id="model-pricing" className="mb-4 text-base font-semibold">{zh?'API 价格':'API pricing'}</h2>
    <dl className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
      <div><dt className="text-[var(--text-secondary)]">{zh?'核验状态':'Verification'}</dt><dd>{state}</dd></div>
      <div><dt className="text-[var(--text-secondary)]">{zh?'最近核验':'Verified at'}</dt><dd>{date(price.verifiedAt)}</dd></div>
      <div><dt className="text-[var(--text-secondary)]">{zh?'性价比基准档':'Value benchmark tier'}</dt><dd>{benchmarkLabel}</dd></div>
    </dl>
    {rates.length||legacy?<div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[820px] text-left text-sm">
        <caption className="sr-only">{zh?'每百万 token 输入 / 输出':'Input / output per million tokens'}</caption>
        <thead className="bg-[var(--bg-card)]"><tr>{headings.map(heading=><th key={heading} scope="col" className="p-3 font-medium">{heading}</th>)}</tr></thead>
        <tbody>{rates.map(rate=><tr key={rate.id} className="border-t border-[var(--border)]">
          <td className="p-3"><div>{rate.id}</div><div>{rate.region==='unspecified'?(zh?'地区未注明':'Region unspecified'):rate.region}</div>{rate.modelVariant&&<div className="break-all">{rate.modelVariant}</div>}</td>
          <td className="p-3 tabular-nums">{formatRate(rate.inputPerMtok,rate.currency)} / {formatRate(rate.outputPerMtok,rate.currency)}</td>
          <td className="p-3 tabular-nums">{context(rate)}</td>
          <td className="p-3">
            <div>{({standard:zh?'标准在线':'Standard online',priority:zh?'优先':'Priority',batch:zh?'批量':'Batch',beta:'Serverless Beta'})[rate.serviceTier]} · {zh?'非缓存':'Cache miss'}</div>
            <div>{({all:zh?'全天':'All day',peak:zh?'峰时':'Peak',off_peak:zh?'谷时':'Off-peak'})[rate.timeBand]}</div>
            {rate.schedule&&<div>{rate.schedule}</div>}
          </td>
          <td className="p-3">
            <div>{rateIsCurrent(rate,now)?zh?'生效中':'Current':rate.effectiveFrom&&Date.parse(rate.effectiveFrom)>now?zh?'尚未生效':'Upcoming':zh?'已过期':'Expired'}</div>
            {(rate.effectiveFrom||rate.effectiveUntil)&&<div>{date(rate.effectiveFrom)} – {date(rate.effectiveUntil)}</div>}
          </td>
          <td className="p-3">{source(rate.sourceUrl)}<div>{date(rate.verifiedAt)}</div></td>
        </tr>)}
        {legacy&&<tr className="border-t border-[var(--border)]">
          <td className="p-3">{zh?'固定 USD 单价':'Fixed USD rate'}</td>
          <td className="p-3 tabular-nums">{formatRate(price.inputUsdPerMtok!,'USD')} / {formatRate(price.outputUsdPerMtok!,'USD')}</td>
          <td className="p-3">—</td><td className="p-3">PAYG</td><td className="p-3">—</td>
          <td className="p-3">{source(price.sourceUrl)}</td>
        </tr>}
        </tbody>
      </table>
    </div>:<div className="rounded-xl border border-[var(--border)] p-4">—</div>}
  </section>;
}
