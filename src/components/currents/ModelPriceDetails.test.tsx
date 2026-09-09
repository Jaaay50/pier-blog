// @vitest-environment jsdom

import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {hydrateRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ModelRate,ModelsPrice} from '@/lib/currents/models-types';
import {ModelPriceDetails} from './ModelPriceDetails';

const initialNow=Date.parse('2026-09-09T00:00:00Z');
const rate:ModelRate={id:'standard-global',currency:'USD',inputPerMtok:1,outputPerMtok:3,region:'global',contextMin:0,contextMax:null,serviceTier:'standard',timeBand:'all',schedule:null,effectiveFrom:null,effectiveUntil:null,sourceUrl:'https://example.com/prices',verifiedAt:'2026-09-09T00:00:00Z'};
const base:ModelsPrice={kind:'payg',inputUsdPerMtok:1,outputUsdPerMtok:3,sourceUrl:rate.sourceUrl,verifiedAt:rate.verifiedAt,notes:null,rates:[rate],verification:{status:'verified',checkedAt:rate.verifiedAt,lastErrorCode:null},benchmark:{rateId:rate.id,policy:'standard-uncached-ordinary-context-peak',inputUsdPerMtok:1,outputUsdPerMtok:3}};
let hidden=false;

beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(initialNow);hidden=false;
  vi.spyOn(document,'hidden','get').mockImplementation(()=>hidden);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});

describe('ModelPriceDetails local validity clock',()=>{
  it('expires a price on its exact boundary without a fetch or score/history rewrite',async()=>{
    const price={...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]};
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    try{
      render(<ModelPriceDetails price={price} locale="en" initialNow={initialNow}/>);
      await act(async()=>vi.advanceTimersByTimeAsync(999));
      expect(screen.getByText('Current')).toBeTruthy();
      await act(async()=>vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText('Expired')).toBeTruthy();
      expect(screen.getByText('Value benchmark tier').nextElementSibling?.textContent).toBe('—');
      expect(fetch).not.toHaveBeenCalled();
    }finally{vi.unstubAllGlobals();}
  });

  it('activates a future tariff at its effectiveFrom boundary',async()=>{
    render(<ModelPriceDetails price={{...base,rates:[{...rate,effectiveFrom:new Date(initialNow+500).toISOString()}]}} locale="en" initialNow={initialNow}/>);
    expect(screen.getByText('Upcoming')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(500));
    expect(screen.getByText('Current')).toBeTruthy();
    expect(screen.queryByText('Upcoming')).toBeNull();
  });

  it('hydrates the SSR snapshot without mismatch then reconciles the browser clock',async()=>{
    const price={...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]};
    const element=<ModelPriceDetails price={price} locale="en" initialNow={initialNow}/>;
    const container=document.createElement('div');container.innerHTML=renderToString(element);document.body.appendChild(container);
    expect(container.textContent).toContain('Current');
    vi.setSystemTime(initialNow+5000);
    const onRecoverableError=vi.fn();let root:ReturnType<typeof hydrateRoot>|undefined;
    try{
      await act(async()=>{root=hydrateRoot(container,element,{onRecoverableError});await vi.advanceTimersByTimeAsync(0);});
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.textContent).toContain('Expired');
    }finally{await act(async()=>root?.unmount());container.remove();}
  });

  it('suspends timers while hidden, refreshes on return, and cleans up on unmount',async()=>{
    const {unmount}=render(<ModelPriceDetails price={{...base,rates:[{...rate,effectiveUntil:new Date(initialNow+1000).toISOString()}]}} locale="en" initialNow={initialNow}/>);
    await act(async()=>vi.advanceTimersByTimeAsync(0));
    hidden=true;fireEvent(document,new Event('visibilitychange'));
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(initialNow+5000);
    hidden=false;fireEvent(document,new Event('visibilitychange'));
    expect(screen.getByText('Expired')).toBeTruthy();
    unmount();expect(vi.getTimerCount()).toBe(0);
    fireEvent.focus(window);expect(vi.getTimerCount()).toBe(0);
  });

  it('uses newly supplied price boundaries and marks verification old after seven days',async()=>{
    const rendered=render(<ModelPriceDetails price={base} locale="en" initialNow={initialNow}/>);
    await act(async()=>vi.advanceTimersByTimeAsync(0));
    rendered.rerender(<ModelPriceDetails price={{...base,rates:[{...rate,effectiveUntil:new Date(initialNow+100).toISOString()}]}} locale="en" initialNow={initialNow}/>);
    await act(async()=>vi.advanceTimersByTimeAsync(100));
    expect(screen.getByText('Expired')).toBeTruthy();
    rendered.rerender(<ModelPriceDetails price={base} locale="en" initialNow={initialNow}/>);
    vi.setSystemTime(initialNow+7*86_400_000+1);fireEvent.focus(window);
    expect(screen.getByText('Retained last valid price')).toBeTruthy();
  });
});
