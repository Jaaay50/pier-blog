// @vitest-environment jsdom

import {StrictMode} from 'react';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import RaftLab from './RaftLab';

const mocks=vi.hoisted(()=>({gate:undefined as undefined|((visible:boolean)=>void),dispose:vi.fn()}));
vi.mock('next-intl',()=>({useLocale:()=> 'en'}));
vi.mock('@/lib/webgl',()=>({
  observeRenderGate:(_element:Element,callback:(visible:boolean)=>void)=>{
    mocks.gate=callback;callback(true);return mocks.dispose;
  },
}));

beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();mocks.gate=undefined;});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});
const nodeSelect=()=>screen.getByRole('combobox',{name:'Node'}) as HTMLSelectElement;
const visible=(value:boolean)=>act(()=>mocks.gate?.(value));

describe('Raft reset and playback lifecycle',()=>{
  it('reset restores node selection, log input, network partition, stopped nodes and running state',()=>{
    render(<RaftLab isDark={false}/>);
    act(()=>vi.advanceTimersByTime(1800));
    expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Leader');
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));
    fireEvent.change(screen.getByRole('textbox',{name:'Log entry'}),{target:{value:'x=9'}});
    fireEvent.click(screen.getByRole('button',{name:'Append log'}));
    fireEvent.click(screen.getByRole('button',{name:'Step'}));
    expect(screen.getAllByLabelText('x=9, committed')).toHaveLength(5);
    fireEvent.change(nodeSelect(),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'Stop node'}));
    fireEvent.click(screen.getByRole('button',{name:'Partition 2 / 3'}));
    expect(screen.getByRole('button',{name:'Start node'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'Reconnect'})).toBeTruthy();
    const network=screen.getByRole('img',{name:'Five-node network'});
    expect(network.querySelectorAll('line[stroke-dasharray]')).toHaveLength(6);
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect(nodeSelect().value).toBe('0');
    expect((screen.getByRole('textbox',{name:'Log entry'}) as HTMLInputElement).value).toBe('x=1');
    expect([...nodeSelect().options].map(option=>option.textContent)).toEqual(Array.from({length:5},(_,i)=>`N${i+1} · Follower`));
    expect(screen.getByRole('button',{name:'Stop node'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'Partition 2 / 3'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'Pause'})).toBeTruthy();
    expect(network.querySelectorAll('line[stroke-dasharray]')).toHaveLength(0);
    expect(within(network).getAllByText('Follower · T0')).toHaveLength(5);
    expect(within(screen.getByRole('table')).getAllByText('0/0')).toHaveLength(5);
    expect(screen.queryAllByLabelText('x=9, committed')).toHaveLength(0);
    expect(screen.queryAllByText('∅')).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(1);
    act(()=>vi.advanceTimersByTime(1800));
    expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Leader');
  });

  it('releases the offscreen timer and resumes one interval without catching up hidden time',()=>{
    render(<RaftLab isDark/>);act(()=>vi.advanceTimersByTime(1350));
    const network=screen.getByRole('img',{name:'Five-node network'}),before=network.innerHTML;
    visible(false);visible(false);expect(vi.getTimerCount()).toBe(0);
    act(()=>vi.advanceTimersByTime(100_000));expect(network.innerHTML).toBe(before);
    visible(true);visible(true);expect(vi.getTimerCount()).toBe(1);
    act(()=>vi.advanceTimersByTime(449));expect(network.innerHTML).toBe(before);
    act(()=>vi.advanceTimersByTime(1));
    expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Leader');
    expect(vi.getTimerCount()).toBe(1);
  });

  it('reset remains stopped offscreen and only starts playback on visibility restoration',()=>{
    render(<RaftLab isDark={false}/>);visible(false);
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));
    fireEvent.click(screen.getByRole('button',{name:'Stop node'}));
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect(screen.getByRole('button',{name:'Pause'})).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
    act(()=>vi.advanceTimersByTime(5000));
    expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Follower');
    visible(true);expect(vi.getTimerCount()).toBe(1);
    act(()=>vi.advanceTimersByTime(1800));expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Leader');
  });

  it('releases its live interval and visibility observer on unmount',()=>{
    const ready=vi.fn(),clear=vi.spyOn(globalThis,'clearInterval');
    const {unmount}=render(<RaftLab isDark onReadyChange={ready}/>);
    expect(vi.getTimerCount()).toBe(1);expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    unmount();expect(clear).toHaveBeenCalledOnce();expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);expect(ready.mock.calls).toEqual([[true],[false]]);
    act(()=>vi.advanceTimersByTime(100_000));expect(vi.getTimerCount()).toBe(0);
    expect(ready.mock.calls).toEqual([[true],[false]]);
  });

  it('keeps only one interval through StrictMode replay and releases every observer',()=>{
    const {unmount}=render(<StrictMode><RaftLab isDark={false}/></StrictMode>);
    expect(mocks.dispose).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(1);
    act(()=>vi.advanceTimersByTime(1350));expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Follower');
    act(()=>vi.advanceTimersByTime(450));expect(nodeSelect().selectedOptions[0].textContent).toBe('N1 · Leader');
    unmount();expect(mocks.dispose).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
  });
});
