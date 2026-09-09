// @vitest-environment jsdom

import {cleanup,render,screen,within} from '@testing-library/react';
import {afterEach,describe,expect,it} from 'vitest';
import type {ModelRate,ModelsPrice} from '@/lib/currents/models-types';
import {ModelPriceTable} from './ModelPriceTable';

const at=Date.parse('2026-09-09T00:00:00Z');
const base:ModelsPrice={kind:'payg',inputUsdPerMtok:1.25,outputUsdPerMtok:4.5,sourceUrl:'https://example.com/prices',verifiedAt:'2026-09-08T00:00:00Z',notes:null};
const rate:ModelRate={id:'standard-global',currency:'USD',inputPerMtok:1.25,outputPerMtok:4.5,region:'global',contextMin:0,contextMax:null,serviceTier:'standard',timeBand:'all',schedule:null,effectiveFrom:null,effectiveUntil:null,sourceUrl:base.sourceUrl!,verifiedAt:base.verifiedAt!};
const verification={status:'verified' as const,checkedAt:base.verifiedAt,lastErrorCode:null};
afterEach(cleanup);

function view(price:ModelsPrice,locale='en',now=at){return render(<ModelPriceTable price={price} locale={locale} now={now}/>);}
function status(){return screen.getByText('Verification').nextElementSibling?.textContent;}

describe('ModelPriceTable contract boundaries',()=>{
  it.each(['zh','en'])('shows legacy fixed prices in %s without inventing context or validity',locale=>{
    view({...base,rates:[]},locale);
    expect(screen.getByText('$1.25 / $4.5')).toBeTruthy();
    const row=screen.getByText(locale==='zh'?'固定 USD 单价':'Fixed USD rate').closest('tr')!;
    const cells=within(row).getAllByRole('cell');
    expect(cells[2].textContent).toBe('—');
    expect(cells[4].textContent).toBe('—');
    expect(screen.getByRole('link').getAttribute('href')).toBe(base.sourceUrl);
    expect(screen.queryByText(/∞/)).toBeNull();
    expect(screen.queryByText(locale==='zh'?'已核验':'Verified')).toBeNull();
  });

  it.each([
    [0,null,'No upper pricing tier'],[128001,null,'≥ 128,001 tokens'],[0,128000,'0–128,000 tokens'],
  ] as const)('does not turn contextMin=%s contextMax=%s into an unlimited model window',(contextMin,contextMax,label)=>{
    view({...base,rates:[{...rate,contextMin,contextMax}],verification});
    const row=screen.getByText(rate.id).closest('tr')!;
    expect(within(row).getAllByRole('cell')[2].textContent).toBe(label);
    expect(row.textContent).not.toContain('∞');
  });

  it('distinguishes retained active quotes from stale records with no usable price',()=>{
    const stale={...verification,status:'stale' as const,lastErrorCode:'fetch_failed'};
    const rendered=view({...base,rates:[rate],verification:stale});
    expect(status()).toBe('Retained last valid price');
    rendered.rerender(<ModelPriceTable price={{...base,kind:'unavailable',rates:[],inputUsdPerMtok:null,outputUsdPerMtok:null,verification:stale}} locale="en" now={at}/>);
    expect(status()).toBe('Reverification required');
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('never revives flat prices or a benchmark when the only tariff expires',()=>{
    view({...base,rates:[{...rate,effectiveUntil:'2026-09-09T00:00:00Z'}],verification,benchmark:{rateId:rate.id,policy:'standard-uncached-ordinary-context-peak',inputUsdPerMtok:1.25,outputUsdPerMtok:4.5}});
    expect(status()).toBe('Reverification required');
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByText('Value benchmark tier').nextElementSibling?.textContent).toBe('—');
    expect(screen.queryByText('Fixed USD rate')).toBeNull();
  });

  it('keeps non-USD pricing visible without inventing a benchmark',()=>{
    view({...base,kind:'unavailable',inputUsdPerMtok:null,outputUsdPerMtok:null,rates:[{...rate,currency:'CNY',region:'china'}],verification,benchmark:null});
    expect(screen.getByText('CN¥1.25 / CN¥4.5')).toBeTruthy();
    expect(screen.getByText('Value benchmark tier').nextElementSibling?.textContent).toBe('—');
    expect(status()).toBe('Verified');
  });

  it('marks old verified prices as retained rather than freshly verified',()=>{
    view({...base,rates:[rate],verification},'en',Date.parse(base.verifiedAt!)+7*86_400_000+1);
    expect(status()).toBe('Retained last valid price');
  });

  it('preserves exact effective timestamps and upcoming state',()=>{
    const effectiveFrom='2026-09-09T08:12:34Z',effectiveUntil='2026-09-10T08:12:34Z';
    const {container}=view({...base,rates:[{...rate,effectiveFrom,effectiveUntil}],verification});
    expect(screen.getByText('Upcoming')).toBeTruthy();
    const time=container.querySelector(`time[datetime="${effectiveFrom}"]`);
    expect(time?.textContent).toContain('16:12:34');
    expect(container.querySelector(`time[datetime="${effectiveUntil}"]`)).not.toBeNull();
  });
});

it.each(['zh','en'])('shows a Beta serving variant without a comparable standard price in %s',locale=>{
  view({...base,kind:'unavailable',inputUsdPerMtok:null,outputUsdPerMtok:null,benchmark:null,verification,rates:[{...rate,id:'inkling-beta',serviceTier:'beta',region:'unspecified',modelVariant:'thinkingmachines/Inkling:peft:262144:sampling-nvfp4',inputPerMtok:1,outputPerMtok:4.05}]},locale);
  expect(screen.getByText('Serverless Beta · '+(locale==='zh'?'非缓存':'Cache miss'))).toBeTruthy();
  expect(screen.getByText('thinkingmachines/Inkling:peft:262144:sampling-nvfp4')).toBeTruthy();
  expect(screen.getByText(locale==='zh'?'地区未注明':'Region unspecified')).toBeTruthy();
  expect(screen.getByText(locale==='zh'?'性价比基准档':'Value benchmark tier').nextElementSibling?.textContent).toBe('—');
});
