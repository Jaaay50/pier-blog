import type {ModelRate, ModelsPrice} from './models-types';
export function rateIsCurrent(rate:ModelRate,now=Date.now()):boolean {
  return (!rate.effectiveFrom||Date.parse(rate.effectiveFrom)<=now)&&(!rate.effectiveUntil||now<Date.parse(rate.effectiveUntil));
}
export function currentStandardRates(price:ModelsPrice,now=Date.now()):ModelRate[] {
  return (price.rates??[]).filter(r=>r.serviceTier==='standard'&&rateIsCurrent(r,now));
}
export function formatRate(value:number,currency:string):string {
  const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(value);
  return currency==='USD'?`$${number}`:currency==='CNY'?`CN¥${number}`:`${currency} ${number}`;
}
export function priceSummary(price:ModelsPrice,now=Date.now()):string[] {
  const standard=currentStandardRates(price,now);
  const beta=(price.rates??[]).filter(r=>r.serviceTier==='beta'&&rateIsCurrent(r,now));
  const rates=standard.length?standard:beta;
  if(!rates.length) {
    // Empty rates are also returned for retained legacy fixed prices. A nonempty
    // expired/unsupported tariff list must never fall back to stale flat values.
    if((!price.rates?.length)&&price.kind==='payg'&&price.inputUsdPerMtok!==null&&price.outputUsdPerMtok!==null) return [`${formatRate(price.inputUsdPerMtok,'USD')} / ${formatRate(price.outputUsdPerMtok,'USD')}`];
    return ['—'];
  }
  const currencies=[...new Set(rates.map(r=>r.currency))].sort((a,b)=>a==='USD'?-1:b==='USD'?1:a.localeCompare(b));
  return currencies.map(currency=>{
    const matching=rates.filter(r=>r.currency===currency);
    const range=(field:'inputPerMtok'|'outputPerMtok')=>{const values=matching.map(r=>r[field]),min=Math.min(...values),max=Math.max(...values);return min===max?formatRate(min,currency):`${formatRate(min,currency)}–${formatRate(max,currency)}`;};
    return `${range('inputPerMtok')} / ${range('outputPerMtok')}${!standard.length&&beta.length?' · Beta':''}`;
  });
}
