import {describe,it,expect} from 'vitest';
import {priceSummary,rateIsCurrent} from './model-prices';
import {isModelsPrice,type ModelsPrice,type ModelRate} from './models-types';
const rate:ModelRate={id:'standard',currency:'USD',inputPerMtok:1.32,outputPerMtok:3.96,region:'global',contextMin:0,contextMax:null,serviceTier:'standard',timeBand:'peak',schedule:null,effectiveFrom:null,effectiveUntil:null,sourceUrl:'https://api-docs.deepseek.com/quick_start/pricing/',verifiedAt:'2026-09-08T00:00:00Z'};
const price:ModelsPrice={kind:'payg',inputUsdPerMtok:1.32,outputUsdPerMtok:3.96,sourceUrl:rate.sourceUrl,verifiedAt:rate.verifiedAt,notes:null};
describe('model prices',()=>{
  it('accepts old contract and formats fixed price',()=>{expect(isModelsPrice(price)).toBe(true);expect(priceSummary(price)).toEqual(['$1.32 / $3.96']);});
  it('shows peak/offpeak range, not a fabricated average',()=>{expect(priceSummary({...price,rates:[rate,{...rate,id:'offpeak',timeBand:'off_peak',inputPerMtok:.66,outputPerMtok:1.98}]})).toEqual(['$0.66–$1.32 / $1.98–$3.96']);});
  it('keeps currencies distinct and excludes priority tiers',()=>{expect(priceSummary({...price,rates:[rate,{...rate,id:'cn',currency:'CNY',inputPerMtok:2,outputPerMtok:6},{...rate,id:'priority',serviceTier:'priority',inputPerMtok:0}]})).toEqual(['$1.32 / $3.96','CN¥2 / CN¥6']);});
  it('expires promotion at exact boundary without falling back to legacy price',()=>{const rates=[{...rate,effectiveUntil:'2026-09-09T00:00:00Z'}];expect(rateIsCurrent(rates[0],Date.parse('2026-09-08T00:00:00Z'))).toBe(true);expect(priceSummary({...price,rates},Date.parse('2026-09-09T00:00:00Z'))).toEqual(['—']);});
  it('displays non-USD-only prices without benchmark and retains stale snapshot',()=>{expect(priceSummary({...price,kind:'unavailable',inputUsdPerMtok:null,outputUsdPerMtok:null,rates:[{...rate,currency:'CNY'}],benchmark:null,verification:{status:'stale',checkedAt:rate.verifiedAt,lastErrorCode:'fetch failed'}})).toEqual(['CN¥1.32 / CN¥3.96']);});
  it('rejects malformed rates at API boundary',()=>{expect(isModelsPrice({...price,rates:[rate]})).toBe(true);for(const invalid of [{inputPerMtok:-1},{sourceUrl:'javascript:alert(1)'},{currency:'BAD-CURRENCY'},{effectiveUntil:'not-a-date'},{contextMin:100,contextMax:20},{contextMin:null},{region:''}])expect(isModelsPrice({...price,rates:[{...rate,...invalid}]})).toBe(false);expect(isModelsPrice({...price,rates:[rate,rate]})).toBe(false);expect(isModelsPrice({...price,benchmark:{rateId:null,inputUsdPerMtok:1,outputUsdPerMtok:2,policy:'cheapest'}})).toBe(false);});
});

it('shows official Beta prices explicitly, without substituting a standard tariff',()=>{
  const beta:ModelsPrice={...price,kind:'unavailable',inputUsdPerMtok:null,outputUsdPerMtok:null,benchmark:null,rates:[{...rate,serviceTier:'beta',region:'unspecified',modelVariant:'thinkingmachines/Inkling:peft:262144:sampling-nvfp4',inputPerMtok:1,outputPerMtok:4.05}]};
  expect(isModelsPrice(beta)).toBe(true);
  expect(priceSummary(beta)).toEqual(['$1 / $4.05 · Beta']);
  expect(priceSummary({...beta,rates:[...beta.rates!,{...rate,id:'standard'}]})).toEqual(['$1.32 / $3.96']);
  expect(isModelsPrice({...beta,rates:[{...beta.rates![0],modelVariant:''}]})).toBe(false);
});
