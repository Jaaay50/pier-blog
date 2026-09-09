// @vitest-environment jsdom

import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ModelRate,ModelsPrice} from '@/lib/currents/models-types';
import {ModelValueRanking} from './ModelValueRanking';

const initialNow=Date.parse('2026-09-09T00:00:00Z');
const rate:ModelRate={id:'standard-global',currency:'USD',inputPerMtok:1,outputPerMtok:3,region:'global',contextMin:0,contextMax:null,serviceTier:'standard',timeBand:'all',schedule:null,effectiveFrom:null,effectiveUntil:null,sourceUrl:'https://example.com/prices',verifiedAt:'2026-09-09T00:00:00Z'};
const base:ModelsPrice={kind:'payg',inputUsdPerMtok:1,outputUsdPerMtok:3,sourceUrl:rate.sourceUrl,verifiedAt:rate.verifiedAt,notes:null,rates:[rate],verification:{status:'verified',checkedAt:rate.verifiedAt,lastErrorCode:null},benchmark:{rateId:rate.id,policy:'standard-uncached-ordinary-context-peak',inputUsdPerMtok:1,outputUsdPerMtok:3}};
const props={rank:2,valueScore:84.2,title:'Value',observingLabel:'Observing',confidence:<span>High 0.95</span>,history:<svg role="img" aria-label="Value rank history"><path d="M0 20L10 5"/></svg>};
const card=(price:ModelsPrice=base,now=initialNow)=> <ModelValueRanking {...props} price={price} initialNow={now}/>;

beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(initialNow);vi.spyOn(document,'hidden','get').mockReturnValue(false);});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

describe('ModelValueRanking',()=>{
  it('hides current rank and score at exact expiry while preserving history and confidence',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const {unmount}=render(card({...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]}));
    const history=screen.getByRole('img',{name:'Value rank history'}).outerHTML;
    await act(async()=>vi.advanceTimersByTimeAsync(999));
    expect(screen.getByText('#2 · Observing')).toBeTruthy();
    expect(screen.getByText('84.2')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText(/#2|84.2|Observing/)).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByRole('img',{name:'Value rank history'}).outerHTML).toBe(history);
    expect(screen.getByText('High 0.95')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    unmount();expect(vi.getTimerCount()).toBe(0);
  });

  it('does not revive an old score when a replacement becomes active; a fresh snapshot restores it',async()=>{
    const boundary=initialNow+500;
    const replacement={...rate,id:'replacement',effectiveFrom:new Date(boundary).toISOString()};
    const price={...base,rates:[{...rate,effectiveUntil:new Date(boundary).toISOString()},replacement]};
    const rendered=render(card(price));
    await act(async()=>vi.advanceTimersByTimeAsync(500));
    expect(screen.queryByText('84.2')).toBeNull();
    rendered.rerender(card({...price,benchmark:{...base.benchmark!,rateId:replacement.id}},initialNow));
    expect(screen.queryByText('84.2')).toBeNull();
    rendered.rerender(card({...price,benchmark:{...base.benchmark!,rateId:replacement.id}},boundary));
    expect(screen.getByText('84.2')).toBeTruthy();
    expect(screen.getByText('#2 · Observing')).toBeTruthy();
  });

  it('invalidates on another tariff activation even when the referenced benchmark remains current',async()=>{
    const price={...base,rates:[rate,{...rate,id:'new-peak',timeBand:'peak' as const,effectiveFrom:new Date(initialNow+500).toISOString()}]};
    render(card(price));
    await act(async()=>vi.advanceTimersByTimeAsync(500));
    expect(screen.queryByText('84.2')).toBeNull();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('reconciles an expired cached SSR snapshot without hydration mismatch',async()=>{
    const element=card({...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]});
    const container=document.createElement('div');container.innerHTML=renderToString(element);document.body.appendChild(container);
    expect(container.textContent).toContain('84.2');
    vi.setSystemTime(initialNow+5000);
    const onRecoverableError=vi.fn();let root:ReturnType<typeof hydrateRoot>|undefined;
    try{
      await act(async()=>{root=hydrateRoot(container,element,{onRecoverableError});await vi.advanceTimersByTimeAsync(0);});
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).not.toContain('84.2');
      expect(container.querySelector('svg')).not.toBeNull();
    }finally{await act(async()=>root?.unmount());container.remove();}
  });

  it('rechecks boundaries when returning to a hidden page',async()=>{
    const hidden=vi.spyOn(document,'hidden','get');hidden.mockReturnValue(false);
    render(card({...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]}));
    await act(async()=>vi.advanceTimersByTimeAsync(0));
    hidden.mockReturnValue(true);fireEvent(document,new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(initialNow+5000);
    hidden.mockReturnValue(false);fireEvent(document,new Event('visibilitychange'));
    expect(screen.queryByText('84.2')).toBeNull();
  });

  it('expires at the earlier global price boundary even when this model has no changing tariff',async()=>{
    const valueValidUntil=new Date(initialNow+250).toISOString();
    const rendered=render(<ModelValueRanking {...props} price={base} initialNow={initialNow} valueValidUntil={valueValidUntil}/>);
    await act(async()=>vi.advanceTimersByTimeAsync(249));
    expect(screen.getByText('84.2')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(1));
    expect(screen.getAllByText('—')).toHaveLength(2);
    rendered.rerender(<ModelValueRanking {...props} price={base} initialNow={initialNow+250} valueValidUntil={null}/>);
    expect(screen.getByText('84.2')).toBeTruthy();
  });

  it('already hides an expired global price snapshot on the initial render',()=>{
    const html=renderToString(<ModelValueRanking {...props} price={base} initialNow={initialNow} valueValidUntil={new Date(initialNow).toISOString()}/>);
    expect(html).not.toContain('84.2');expect(html).not.toContain('#2');
  });

  it('never uses an ability score or rank for null Value',()=>{
    render(<ModelValueRanking {...props} valueScore={null} price={base} initialNow={initialNow}/>);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText(/#2|84.2|Observing/)).toBeNull();
  });

  const invalidPrices:Array<[string,ModelsPrice]>=[
    ['missing benchmark',{...base,benchmark:null}],
    ['missing referenced rate',{...base,benchmark:{...base.benchmark!,rateId:'missing'}}],
    ['non-USD',{...base,rates:[{...rate,currency:'CNY'}]}],
    ['off-peak',{...base,rates:[{...rate,timeBand:'off_peak'}]}],
    ['long context',{...base,rates:[{...rate,contextMin:200_001}]}],
    ['batch',{...base,rates:[{...rate,serviceTier:'batch'}]}],
    ['domestic region',{...base,rates:[{...rate,region:'mainland'}]}],
    ['mismatched quote',{...base,benchmark:{...base.benchmark!,inputUsdPerMtok:0.5}}],
    ['expired rate with flat fallback',{...base,rates:[{...rate,effectiveUntil:new Date(initialNow).toISOString()}]}],
    ['zero-cost basket',{...base,inputUsdPerMtok:0,outputUsdPerMtok:0,rates:[{...rate,inputPerMtok:0,outputPerMtok:0}],benchmark:{...base.benchmark!,inputUsdPerMtok:0,outputUsdPerMtok:0}}],
  ];
  it.each(invalidPrices)('rejects an incompatible current value benchmark: %s',(_name,price)=>{
    render(card(price));expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('keeps an explicit fixed-USD legacy benchmark without inventing a tariff',()=>{
    render(card({...base,rates:[],benchmark:{...base.benchmark!,rateId:null}}));
    expect(screen.getByText('84.2')).toBeTruthy();
  });
});
