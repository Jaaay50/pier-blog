// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import TearableCloth,{CLOTH_RESPONSE_TIMEOUT_MS} from './TearableCloth';
import {createCloth,type Cloth} from './algorithms/cloth';
const mocks=vi.hoisted(()=>({gate:vi.fn(),construct:vi.fn()}));
vi.mock('@/lib/webgl',()=>({observeRenderGate:mocks.gate}));
vi.mock('next-intl',()=>({useLocale:()=> 'zh'}));
interface FakeWorker {
  onmessage:((event:MessageEvent<unknown>)=>void)|null;
  onerror:((event:Event)=>void)|null;
  onmessageerror:((event:Event)=>void)|null;
  postMessage:ReturnType<typeof vi.fn>;
  terminate:ReturnType<typeof vi.fn>;
}
let workers:FakeWorker[],gates:Array<(visible:boolean)=>void>,stops:Array<ReturnType<typeof vi.fn>>,resizeStops:Array<ReturnType<typeof vi.fn>>,frames:Map<number,FrameRequestCallback>,ctx:Record<string,unknown>;
beforeEach(()=>{
  vi.clearAllMocks();vi.useFakeTimers();workers=[];gates=[];stops=[];resizeStops=[];frames=new Map();let next=1;
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{const id=next++;frames.set(id,callback);return id;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  vi.stubGlobal('ResizeObserver',class{disconnect=vi.fn();constructor(){resizeStops.push(this.disconnect);}observe=vi.fn();});
  mocks.gate.mockImplementation((_element,cb)=>{gates.push(cb);const stop=vi.fn();stops.push(stop);return stop;});
  vi.stubGlobal('Worker',class implements FakeWorker{
    onmessage:FakeWorker['onmessage']=null;onerror:FakeWorker['onerror']=null;onmessageerror:FakeWorker['onmessageerror']=null;
    postMessage=vi.fn();terminate=vi.fn();
    constructor(){mocks.construct();workers.push(this);}
  });
  ctx=Object.fromEntries(['setTransform','fillRect','beginPath','arc','fill','moveTo','lineTo','stroke'].map(name=>[name,vi.fn()]));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>ctx as unknown as CanvasRenderingContext2D);
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function microtasks(){await act(async()=>{vi.runAllTicks();});}
function visible(value=true,index=gates.length-1){act(()=>gates[index](value));}
function response(data:unknown=createCloth(),index=workers.length-1){act(()=>workers[index].onmessage?.({data} as MessageEvent<unknown>));}
function frame(time:number){const first=[...frames.entries()][0];expect(first).toBeDefined();const[id,callback]=first;frames.delete(id);act(()=>callback(time));}

describe('Cloth worker lifecycle',()=>{
  it('does not report ready or draw a local substitute before a successful worker response',()=>{
    const ready=vi.fn();const {container}=render(<TearableCloth isDark={false} onReadyChange={ready}/>);
    expect(workers[0].postMessage).toHaveBeenCalledExactlyOnceWith({type:'reset'});expect(ready).not.toHaveBeenCalled();expect(ctx.fillRect).not.toHaveBeenCalled();
    expect(container.querySelector('fieldset')!.disabled).toBe(true);
    visible();frame(100);frame(116);expect(workers[0].postMessage).toHaveBeenCalledOnce();expect(ready).not.toHaveBeenCalled();
    response();expect(ready).toHaveBeenCalledExactlyOnceWith(true);expect(ctx.fillRect).toHaveBeenCalledOnce();expect(container.querySelector('fieldset')!.disabled).toBe(false);
  });
  it('retains an offscreen response until visible and pauses without catch-up or duplicate loops',()=>{
    const ready=vi.fn();render(<TearableCloth isDark onReadyChange={ready}/>);
    response();expect(ready).not.toHaveBeenCalled();expect(frames.size).toBe(0);
    visible();expect(ready).toHaveBeenCalledWith(true);frame(100);frame(116);
    expect(workers[0].postMessage).toHaveBeenCalledTimes(2);expect(workers[0].postMessage.mock.calls[1][0].type).toBe('step');
    visible(false);expect(frames.size).toBe(0);const paints=(ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length;
    response();expect(ctx.fillRect).toHaveBeenCalledTimes(paints);
    visible();visible();expect(frames.size).toBe(1);frame(60000);expect(workers[0].postMessage).toHaveBeenCalledTimes(2);
    frame(60016);expect(workers[0].postMessage).toHaveBeenCalledTimes(3);
  });
  it('times out a worker that starts but never responds, including initialization',async()=>{
    const ready=vi.fn();render(<TearableCloth isDark onReadyChange={ready}/>);visible();
    await act(async()=>{vi.advanceTimersByTime(CLOTH_RESPONSE_TIMEOUT_MS);});
    expect(ready).toHaveBeenCalledExactlyOnceWith(false);expect(workers[0].terminate).toHaveBeenCalledOnce();expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0);expect(screen.getByRole('alert')).toBeTruthy();
    expect(stops[0]).toHaveBeenCalledOnce();expect(resizeStops[0]).toHaveBeenCalledOnce();visible();expect(frames.size).toBe(0);
  });
  it('watches later requests too, without keeping a timer while a paused worker is idle',async()=>{
    const ready=vi.fn();render(<TearableCloth isDark onReadyChange={ready}/>);response();visible();
    expect(vi.getTimerCount()).toBe(0);frame(100);frame(116);expect(vi.getTimerCount()).toBe(1);
    await act(async()=>{vi.advanceTimersByTime(CLOTH_RESPONSE_TIMEOUT_MS);});expect(ready).toHaveBeenLastCalledWith(false);expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
  it.each(['error','messageerror','invalid','postMessage','constructor'] as const)('contains %s failures and cannot restart a terminated worker',async failure=>{
    if(failure==='constructor')mocks.construct.mockImplementationOnce(()=>{throw new Error('Worker unavailable');});
    const ready=vi.fn();const {unmount}=render(<TearableCloth isDark onReadyChange={ready}/>);
    if(failure==='error')act(()=>workers[0].onerror?.(new Event('error')));
    if(failure==='messageerror')act(()=>workers[0].onmessageerror?.(new Event('messageerror')));
    if(failure==='invalid')response({points:[{x:NaN}],links:[],time:0});
    if(failure==='postMessage'){
      response();visible();workers[0].postMessage.mockImplementationOnce(()=>{throw new Error('Worker closed');});frame(100);frame(116);
    }
    await microtasks();expect(ready).toHaveBeenLastCalledWith(false);expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0);
    if(workers[0]){expect(workers[0].terminate).toHaveBeenCalledOnce();expect(workers[0].onmessage).toBeNull();}
    unmount();if(workers[0])expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
  it('serializes reset and simulation requests so a stale response cannot release the wrong pending request',()=>{
    render(<TearableCloth isDark/>);response();visible();frame(100);frame(116);
    expect(workers[0].postMessage).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button',{name:'重置'}));expect(workers[0].postMessage).toHaveBeenCalledTimes(2);
    response();expect(workers[0].postMessage).toHaveBeenCalledTimes(3);expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'reset'});
    frame(132);expect(workers[0].postMessage).toHaveBeenCalledTimes(3);
    response();frame(148);expect(workers[0].postMessage).toHaveBeenCalledTimes(4);
  });
  it('terminates once on unmount, cancels initialization timeout and ignores delayed handlers',async()=>{
    const ready=vi.fn();const {unmount}=render(<TearableCloth isDark onReadyChange={ready}/>);
    const late=workers[0].onmessage!;unmount();expect(workers[0].terminate).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
    act(()=>late({data:createCloth()} as MessageEvent<Cloth>));await microtasks();expect(ready).not.toHaveBeenCalled();expect(ctx.fillRect).not.toHaveBeenCalled();
  });
  it('survives StrictMode replay with only the second worker able to publish readiness',async()=>{
    const ready=vi.fn();const {unmount}=render(<StrictMode><TearableCloth isDark onReadyChange={ready}/></StrictMode>);
    expect(workers).toHaveLength(2);expect(workers[0].terminate).toHaveBeenCalledOnce();expect(workers[0].onmessage).toBeNull();expect(vi.getTimerCount()).toBe(1);expect(ready).not.toHaveBeenCalled();
    visible(true,0);expect(frames.size).toBe(0);visible();response();expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    unmount();await microtasks();expect(workers[0].terminate).toHaveBeenCalledOnce();expect(workers[1].terminate).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);expect(ready).not.toHaveBeenCalledWith(false);
  });
  it('uses latest callbacks and theme without restarting the worker',()=>{
    const first=vi.fn(),second=vi.fn();const {rerender}=render(<TearableCloth isDark={false} onReadyChange={first}/>);
    rerender(<TearableCloth isDark onReadyChange={second}/>);response();visible();
    expect(workers).toHaveLength(1);expect(first).not.toHaveBeenCalled();expect(second).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('reset restores the tool, wind, obstacle, playback and selected node in the actual worker request',()=>{
    const ready=vi.fn();render(<TearableCloth isDark={false} onReadyChange={ready}/>);response();visible();
    const canvas=screen.getByRole('application'),tool=screen.getByRole('combobox',{name:'工具'});
    fireEvent.change(tool,{target:{value:'pin'}});
    for(let i=0;i<3;i++)fireEvent.keyDown(canvas,{key:'ArrowRight'});
    fireEvent.keyDown(canvas,{key:' '});
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'pin',id:3});response();
    fireEvent.change(screen.getByRole('slider'),{target:{value:'-2.5'}});
    fireEvent.click(screen.getByRole('button',{name:'球形障碍'}));
    fireEvent.click(screen.getByRole('button',{name:'暂停'}));
    expect(screen.getByRole('button',{name:'球形障碍'}).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button',{name:'重置'}));
    expect((tool as HTMLSelectElement).value).toBe('drag');
    expect((screen.getByRole('slider') as HTMLInputElement).value).toBe('1');
    expect(screen.getByRole('button',{name:'球形障碍'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button',{name:'暂停'})).toBeTruthy();
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'reset'});response();
    const point=createCloth().points[0];
    fireEvent.keyDown(canvas,{key:'ArrowRight'});
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'step',steps:2,options:{wind:1,obstacle:true,grab:{id:0,x:point.x+8,y:point.y}}});
    response();fireEvent.keyUp(canvas,{key:'ArrowRight'});frame(100);frame(116);
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'step',steps:1,options:{wind:1,obstacle:true,grab:null}});
    expect(workers).toHaveLength(1);expect(ready).toHaveBeenCalledExactlyOnceWith(true);
  });
  it('reset clears an in-progress pointer grab so later pointer movement cannot move the new cloth',()=>{
    render(<TearableCloth isDark/>);response();visible();
    const canvas=screen.getByRole('application');
    vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:600,bottom:360,width:600,height:360,toJSON:()=>({})});
    Object.assign(canvas,{setPointerCapture:vi.fn(),hasPointerCapture:()=>false});
    const pointer=(type:string,x:number,y:number)=>{
      const event=new MouseEvent(type,{bubbles:true,clientX:x,clientY:y});
      Object.defineProperty(event,'pointerId',{value:7});fireEvent(canvas,event);
    };
    const point=createCloth().points[4];
    fireEvent.click(screen.getByRole('button',{name:'暂停'}));
    pointer('pointerdown',point.x,point.y);pointer('pointermove',point.x+10,point.y+10);
    expect(workers[0].postMessage).toHaveBeenLastCalledWith(expect.objectContaining({type:'step',options:expect.objectContaining({grab:{id:4,x:point.x+10,y:point.y+10}})}));
    response();fireEvent.click(screen.getByRole('button',{name:'重置'}));response();
    const messages=workers[0].postMessage.mock.calls.length;
    pointer('pointermove',500,320);expect(workers[0].postMessage).toHaveBeenCalledTimes(messages);
    frame(100);frame(116);
    expect(workers[0].postMessage).toHaveBeenLastCalledWith({type:'step',steps:1,options:{wind:1,obstacle:true,grab:null}});
  });
});
