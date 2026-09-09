// @vitest-environment jsdom

import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import PathfindingLab from './PathfindingLab';

const mocks=vi.hoisted(()=>({gate:undefined as undefined|((visible:boolean)=>void),dispose:vi.fn()}));
vi.mock('next-intl',()=>({useLocale:()=> 'en'}));
vi.mock('@/lib/webgl',()=>({
  observeRenderGate:(_element:Element,callback:(visible:boolean)=>void)=>{
    mocks.gate=callback;callback(true);return mocks.dispose;
  },
}));

beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();});

const visited=()=>screen.getAllByText(/^Visited /).map(node=>Number(node.textContent?.match(/Visited (\d+)/)?.[1]));

describe('Pathfinding playback',()=>{
  it('starts a fresh run with one click after natural completion',()=>{
    render(<PathfindingLab isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>vi.advanceTimersByTime(10000));
    expect(screen.getAllByText(/Visited [1-9][0-9]* · Path 22/)).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    expect(screen.getByRole('button',{name:'Pause'})).toBeTruthy();
    expect(visited()).toEqual([0,0]);
    act(()=>vi.advanceTimersByTime(40));
    expect(visited()).toEqual([4,4]);
  });

  it('pauses and resumes without discarding the current search',()=>{
    render(<PathfindingLab isDark={true}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>vi.advanceTimersByTime(40));
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));
    act(()=>vi.advanceTimersByTime(400));
    expect(visited()).toEqual([4,4]);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>vi.advanceTimersByTime(40));
    expect(visited()).toEqual([8,8]);
  });

  it('keeps single-step paused and tears down playback when hidden or unmounted',()=>{
    const {unmount}=render(<PathfindingLab isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Step'}));
    expect(visited()).toEqual([1,1]);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>mocks.gate?.(false));
    act(()=>vi.advanceTimersByTime(400));
    expect(visited()).toEqual([1,1]);
    expect(vi.getTimerCount()).toBe(0);
    act(()=>mocks.gate?.(true));
    act(()=>vi.advanceTimersByTime(40));
    expect(visited()).toEqual([5,5]);
    unmount();
    expect(mocks.dispose).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reset restores both maps, the wall tool and cursor, and clears running search progress',()=>{
    render(<PathfindingLab isDark={false}/>);
    const maps=screen.getAllByRole('application'),initialMarkup=maps.map(map=>map.innerHTML);
    const tool=screen.getByRole('combobox',{name:'Tool'});
    fireEvent.change(tool,{target:{value:'end'}});
    fireEvent.keyDown(maps[0],{key:'ArrowRight'});fireEvent.keyDown(maps[0],{key:'ArrowDown'});
    fireEvent.keyDown(maps[0],{key:' '});
    fireEvent.click(screen.getByRole('button',{name:'Clear walls'}));
    fireEvent.click(screen.getByRole('button',{name:'Play'}));act(()=>vi.advanceTimersByTime(40));
    expect(visited().every(count=>count>0)).toBe(true);
    expect(maps.map(map=>map.innerHTML)).not.toEqual(initialMarkup);

    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect((tool as HTMLSelectElement).value).toBe('wall');
    expect(maps.map(map=>map.innerHTML)).toEqual(initialMarkup);
    expect(visited()).toEqual([0,0]);expect(screen.getByRole('button',{name:'Play'})).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);act(()=>vi.advanceTimersByTime(400));expect(visited()).toEqual([0,0]);
    fireEvent.keyDown(maps[0],{key:' '});
    for(const map of maps)expect(map.querySelector('rect')?.getAttribute('fill')).toBe('#4c535e');
  });

  it('reset cancels an active tool drag before subsequent pointermove events',()=>{
    render(<PathfindingLab isDark/>);
    const maps=screen.getAllByRole('application'),map=maps[0],initialMarkup=maps.map(node=>node.innerHTML);
    vi.spyOn(map,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:520,bottom:280,width:520,height:280,toJSON:()=>({})});
    Object.assign(map,{setPointerCapture:vi.fn()});
    const pointer=(type:string,x:number,y:number)=>{
      const event=new MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:5});fireEvent(map,event);
    };
    fireEvent.change(screen.getByRole('combobox',{name:'Tool'}),{target:{value:'end'}});
    pointer('pointerdown',30,10);pointer('pointermove',50,10);
    expect(maps.map(node=>node.innerHTML)).not.toEqual(initialMarkup);
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));pointer('pointermove',70,10);
    expect(maps.map(node=>node.innerHTML)).toEqual(initialMarkup);
    expect(vi.getTimerCount()).toBe(0);
  });
});
