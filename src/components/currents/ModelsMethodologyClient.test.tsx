// @vitest-environment jsdom

import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {ModelsMethodologyClient} from './ModelsMethodologyClient';
import type {ModelsMetaResponse,ModelPriceUpdate} from '@/lib/currents/models-types';
import zh from '@/messages/zh.json';
import en from '@/messages/en.json';

const fetchMeta=vi.fn();
vi.mock('@/lib/currents/api',()=>({fetchModelsMeta:(...args:unknown[])=>fetchMeta(...args)}));
const assessmentAt='2026-09-06T01:00:00.000Z';
const checkedAt='2026-09-08T03:20:00.000Z';
const changedAt='2026-09-07T02:10:00.000Z';
const priceUpdate:ModelPriceUpdate={status:'partial',checkedAt,changedAt,models:{'qwen3-8-max':'updated','gpt-6-astra':'fetch_failed','tencent-hy3':'no_verified_source'}};
function response(overrides:Partial<ModelsMetaResponse>={}):ModelsMetaResponse {
  return {
    schemaVersion:1,scoringVersion:'mlv2',
    scoringParams:{confidenceWeights:{coverage:.45,freshness:.25,agreement:.2,identity:.1},agreementSigmaCap:30,singleSourceAgreement:.5,medianFoldIdentity:.8,minCoverage:{overall:3,coding:2,agent:2,reasoning:2},valueCost:{inputMtok:1,outputMtok:.25},valueMinConfidence:.5},
    sources:[{id:'epoch',name:'Epoch AI',operatorId:'epoch',operatorName:'Epoch AI',url:'https://epoch.ai',method:'Public evaluation',license:'CC BY',categories:['overall'],cadenceDays:1,stalenessDays:7,lastSuccessAt:assessmentAt,lastStatus:'ok',stale:false}],
    models:[{slug:'qwen3-8-max',name:'Qwen3.8 Max',vendor:'Alibaba',vendorId:'alibaba',status:'released',releaseDate:null},{slug:'gpt-6-astra',name:'GPT-6 Astra',vendor:'OpenAI',vendorId:'openai',status:'released',releaseDate:null},{slug:'tencent-hy3',name:'Hunyuan Hy3',vendor:'Tencent',vendorId:'tencent',status:'released',releaseDate:null}],
    modelCounts:{released:3,preview:0},pendingCount:0,computedAt:assessmentAt,generatedAt:'2026-09-09T12:00:00Z',
    update:{lastAttemptAt:assessmentAt,lastCompleteSuccessAt:assessmentAt,lastPublishedAt:assessmentAt,lastContentChangeAt:assessmentAt,nextScheduledCheckAt:null,status:'ok',sources:[]},
    priceUpdate,...overrides,
  };
}
function view(locale='en') {
  return render(<NextIntlClientProvider locale={locale} messages={locale==='zh'?zh:en}><ModelsMethodologyClient/></NextIntlClientProvider>);
}
beforeEach(()=>{fetchMeta.mockReset();});
afterEach(cleanup);

describe('methodology independent official price checks',()=>{
  it.each(['zh','en'])('separates ability and price clocks in %s with structured per-model outcomes',async locale=>{
    fetchMeta.mockResolvedValue(response());view(locale);
    const prices=await screen.findByRole('region',{name:locale==='zh'?'官方价格检查':'Official price checks'});
    const ability=screen.getByRole('region',{name:locale==='zh'?'能力评测更新':'Ability assessment updates'});
    expect(screen.getAllByRole('table')).toHaveLength(2);
    expect([...prices.querySelectorAll('time')].map(t=>t.dateTime)).toEqual([checkedAt,changedAt]);
    expect([...ability.querySelectorAll('time')].every(t=>t.dateTime===assessmentAt)).toBe(true);
    expect(prices.innerHTML).not.toContain('2026-09-09T12:00:00Z');
    expect(within(prices).getByText(locale==='zh'?'部分检查失败':'Some checks failed')).toBeTruthy();
    const table=within(prices).getByRole('table',{name:locale==='zh'?'逐模型价格检查结果':'Price check results by model'});
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    const row=within(table).getByRole('rowheader',{name:'Hunyuan Hy3'}).closest('tr')!;
    expect(row.textContent).toContain(locale==='zh'?'暂无已核验价格来源':'No verified price source');
    expect(row.textContent).not.toMatch(/没有价格|未挂牌|no price|unlisted/i);
    expect(row.textContent).toContain('no_verified_source');
  });

  it('renders missing legacy priceUpdate without inventing a price check',async()=>{
    fetchMeta.mockResolvedValue(response({priceUpdate:undefined}));view();
    await screen.findByRole('region',{name:'Ability assessment updates'});
    expect(screen.queryByRole('region',{name:'Official price checks'})).toBeNull();
  });

  it.each(['never','ok','partial','failed'] as const)('keeps %s status and null timestamps separate from ability dates',async status=>{
    fetchMeta.mockResolvedValue(response({priceUpdate:{status,checkedAt:null,changedAt:null,models:{}}}));view();
    const region=await screen.findByRole('region',{name:'Official price checks'});
    expect(within(region).getByText({never:'Not checked',ok:'Check completed',partial:'Some checks failed',failed:'Check failed'}[status])).toBeTruthy();
    expect(region.querySelectorAll('time')).toHaveLength(0);
    expect(within(region).getAllByText('—')).toHaveLength(2);
    expect(within(region).getByRole('cell',{name:'No price check records'})).toBeTruthy();
  });

  it('displays every current backend outcome and escapes unknown future codes and slugs',async()=>{
    const models=Object.fromEntries(['updated','unchanged','manual','model_not_found','invalid_price','fetch_failed','timeout','no_verified_source','adapter_unverified'].map(code=>[`model-${code}`,code]));
    models['<script>model()</script>']='<img src=x onerror=bad()>';
    fetchMeta.mockResolvedValue(response({priceUpdate:{...priceUpdate,models}}));const rendered=view();
    const table=await screen.findByRole('table',{name:'Price check results by model'});
    for(const code of Object.values(models))expect(within(table).getByText(code)).toBeTruthy();
    expect(within(table).getByText('Unknown check result')).toBeTruthy();
    expect(rendered.container.querySelector('img,script')).toBeNull();
    expect(within(table).getByRole('rowheader',{name:'<script>model()</script>'})).toBeTruthy();
  });

  it('retains load failure and retry without inventing last-check freshness',async()=>{
    fetchMeta.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response());view();
    const button=await screen.findByRole('button',{name:en.currents.retry});
    expect(screen.queryByRole('region',{name:'Official price checks'})).toBeNull();
    fireEvent.click(button);await screen.findByRole('region',{name:'Official price checks'});
    expect(fetchMeta).toHaveBeenCalledTimes(2);
  });

  it('aborts the same metadata request on unmount',async()=>{
    fetchMeta.mockImplementation(()=>new Promise(()=>{}));const rendered=view();
    await waitFor(()=>expect(fetchMeta).toHaveBeenCalledTimes(1));
    const signal=fetchMeta.mock.calls[0][0] as AbortSignal;expect(signal.aborted).toBe(false);
    rendered.unmount();expect(signal.aborted).toBe(true);
  });
});
