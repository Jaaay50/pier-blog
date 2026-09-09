// @vitest-environment jsdom

import {act,cleanup,render,screen,within} from '@testing-library/react';
import {renderToString} from 'react-dom/server';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {ModelsDetailResponse} from '@/lib/currents/models-types';
import {serverFetchModelDetail} from '@/lib/currents/api';
import CurrentsModelDetailPage from './page';

vi.mock('@/lib/currents/api',()=>({serverFetchModelDetail:vi.fn()}));
vi.mock('next/navigation',()=>({notFound:vi.fn(()=>{throw new Error('not found');})}));
vi.mock('next-intl/server',()=>({getTranslations:vi.fn(async()=>(key:string,params?:{category?:string})=>key==='modelsDetailHistoryLabel'?`${params?.category} history`:key),setRequestLocale:vi.fn()}));
vi.mock('@/i18n/navigation',()=>({Link:({children,...props}:React.ComponentProps<'a'>)=><a {...props}>{children}</a>}));
vi.mock('@/components/currents/ModelTopicLink',()=>({ModelTopicLink:({vendorName}:{vendorName:string})=><span>{vendorName}</span>}));

const initialNow=Date.parse('2026-09-09T00:00:00Z');
const ranking={rank:2,prevRank:3,abilityScore:91.3,confidence:0.95,confidenceParts:{},valueScore:84.2,coverageCount:2,status:'main' as const,sources:[],computedAt:new Date(initialNow).toISOString()};
function detail():ModelsDetailResponse {
  return {
    schemaVersion:1,
    model:{slug:'example-model',name:'Example Model',vendor:'Example',vendorId:'example',status:'released',releaseDate:null,contextWindow:null,officialModelId:null,officialUrl:null,verifiedAt:null,notes:null},
    price:{kind:'payg',inputUsdPerMtok:1,outputUsdPerMtok:3,sourceUrl:'https://example.com/prices',verifiedAt:new Date(initialNow).toISOString(),notes:null,
      rates:[{id:'standard',currency:'USD',inputPerMtok:1,outputPerMtok:3,region:'global',contextMin:0,contextMax:null,serviceTier:'standard',timeBand:'all',schedule:null,effectiveFrom:null,effectiveUntil:new Date(initialNow+1000).toISOString(),sourceUrl:'https://example.com/prices',verifiedAt:new Date(initialNow).toISOString()}],
      benchmark:{rateId:'standard',policy:'standard-uncached-ordinary-context-peak',inputUsdPerMtok:1,outputUsdPerMtok:3}},
    rankings:[{...ranking,category:'overall'},{...ranking,category:'value'}],
    history:[{...ranking,category:'value',modelStatus:'released',scoringVersion:'v1'},{...ranking,category:'value',rank:3,modelStatus:'released',scoringVersion:'v1'}],
    aliases:[],meta:{scoringVersion:'v1',generatedAt:new Date(initialNow).toISOString()},
  };
}
const params=()=>Promise.resolve({locale:'en',slug:'example-model'});
const valueCard=()=>screen.getByRole('heading',{name:'modelsCatValue'}).closest('div.rounded-xl') as HTMLElement;
const abilityCard=()=>screen.getByRole('heading',{name:'modelsCatOverall'}).closest('div.rounded-xl') as HTMLElement;

beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(initialNow);vi.spyOn(document,'hidden','get').mockReturnValue(false);vi.mocked(serverFetchModelDetail).mockResolvedValue(detail());});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();});

describe('model detail current Value price validity',()=>{
  it('uses the API generatedAt for SSR rather than the rendering clock',async()=>{
    vi.setSystemTime(initialNow+5000);
    const html=renderToString(await CurrentsModelDetailPage({params:params()}));
    expect(html).toContain('84.2');expect(html).toContain('Current');
  });

  it('expires only current Value rank/score, preserving ability and genuine history',async()=>{
    render(await CurrentsModelDetailPage({params:params()}));
    const abilityHtml=abilityCard().innerHTML;
    const history=screen.getByRole('img',{name:'modelsCatValue history'}).outerHTML;
    expect(within(valueCard()).getByText('84.2')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(1000));
    expect(within(valueCard()).queryByText('84.2')).toBeNull();
    expect(within(valueCard()).queryByText('#2')).toBeNull();
    expect(within(valueCard()).queryByText('91.3')).toBeNull();
    expect(within(valueCard()).getAllByText('—')).toHaveLength(2);
    expect(abilityCard().innerHTML).toBe(abilityHtml);
    expect(screen.getByRole('img',{name:'modelsCatValue history'}).outerHTML).toBe(history);
  });

  it('passes the global value cutoff from API metadata to the current value card',async()=>{
    const response=detail();
    Object.assign(response.meta,{valueValidUntil:new Date(initialNow+250).toISOString()});
    vi.mocked(serverFetchModelDetail).mockResolvedValue(response);
    render(await CurrentsModelDetailPage({params:params()}));
    expect(within(valueCard()).getByText('84.2')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTimeAsync(250));
    expect(within(valueCard()).getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('Current')).toBeTruthy();
    expect(within(abilityCard()).getByText('91.3')).toBeTruthy();
  });

  it('does not fall back to abilityScore when the API returns null valueScore',async()=>{
    const response=detail();response.rankings[1].valueScore=null;
    vi.mocked(serverFetchModelDetail).mockResolvedValue(response);
    render(await CurrentsModelDetailPage({params:params()}));
    expect(within(valueCard()).queryByText('91.3')).toBeNull();
    expect(within(valueCard()).getAllByText('—')).toHaveLength(2);
    expect(within(abilityCard()).getByText('91.3')).toBeTruthy();
  });
});
