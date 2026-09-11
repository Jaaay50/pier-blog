// @vitest-environment jsdom
import {StrictMode} from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import SdfRaymarch,{SDF_FRAGMENT} from './SdfRaymarch';

const mocks=vi.hoisted(()=>({gate:vi.fn()}));
vi.mock('@/lib/webgl',()=>({observeRenderGate:mocks.gate}));
vi.mock('next-intl',()=>({useLocale:()=> 'zh'}));
let gates:Array<(visible:boolean)=>void>,stops:Array<ReturnType<typeof vi.fn>>,resizeStops:Array<ReturnType<typeof vi.fn>>,frames:Map<number,FrameRequestCallback>;
let gl:Record<string,unknown>,getContext:ReturnType<typeof vi.spyOn>,lose:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.clearAllMocks();gates=[];stops=[];resizeStops=[];frames=new Map();let next=1;
  vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{const id=next++;frames.set(id,cb);return id;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
  vi.stubGlobal('ResizeObserver',class{disconnect=vi.fn();constructor(){resizeStops.push(this.disconnect);}observe=vi.fn();});
  mocks.gate.mockImplementation((_element,callback)=>{gates.push(callback);const stop=vi.fn();stops.push(stop);return stop;});
  lose=vi.fn();
  gl={
    ...Object.fromEntries(['shaderSource','compileShader','attachShader','linkProgram','bindBuffer','bufferData','useProgram','enableVertexAttribArray','vertexAttribPointer','viewport','uniform2f','uniform1i','uniform1f','drawArrays','deleteShader','deleteProgram','deleteBuffer'].map(name=>[name,vi.fn()])),
    createShader:vi.fn(()=>({})),createProgram:vi.fn(()=>({})),createBuffer:vi.fn(()=>({})),
    getShaderParameter:vi.fn(()=>true),getProgramParameter:vi.fn(()=>true),getAttribLocation:vi.fn(()=>0),getUniformLocation:vi.fn((_program,name)=>name),
    isContextLost:vi.fn(()=>false),getError:vi.fn(()=>0),NO_ERROR:0,getExtension:vi.fn(()=>({loseContext:lose})),
  };
  getContext=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>gl as unknown as WebGL2RenderingContext);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function microtasks(){await act(async()=>{});}
function frame(){const first=[...frames.entries()][0];expect(first).toBeDefined();const[id,callback]=first;frames.delete(id);act(()=>callback(100));}
function visible(value=true,index=gates.length-1){act(()=>gates[index](value));}

describe('SDF look',()=>{
  it('uses a studio cyc and smooth union instead of a checkerboard tutorial look',()=>{
    expect(SDF_FRAGMENT).not.toMatch(/mod\(floor\(p\.x\)\+floor\(p\.z\)/);
    expect(SDF_FRAGMENT).toContain('smin');
    expect(SDF_FRAGMENT).toContain('D_GGX');
    expect(SDF_FRAGMENT).toContain('studio');
    expect(SDF_FRAGMENT).toContain('film');
  });
});

describe('SDF runtime lifecycle',()=>{
  it('survives StrictMode replay without losing the retained canvas context',()=>{
    const ready=vi.fn();const {unmount}=render(<StrictMode><SdfRaymarch isDark={false} onReadyChange={ready}/></StrictMode>);
    expect(getContext).toHaveBeenCalledTimes(2);expect(gl.createProgram).toHaveBeenCalledTimes(2);expect(lose).not.toHaveBeenCalled();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(1);expect(gl.deleteBuffer).toHaveBeenCalledTimes(1);expect(gl.deleteShader).toHaveBeenCalledTimes(2);
    expect(stops[0]).toHaveBeenCalledOnce();expect(resizeStops[0]).toHaveBeenCalledOnce();
    visible(true,0);expect(frames.size).toBe(0);visible();frame();expect(ready).toHaveBeenCalledExactlyOnceWith(true);
    unmount();expect(gl.deleteProgram).toHaveBeenCalledTimes(2);expect(gl.deleteBuffer).toHaveBeenCalledTimes(2);expect(gl.deleteShader).toHaveBeenCalledTimes(4);expect(lose).not.toHaveBeenCalled();expect(frames.size).toBe(0);
    expect(stops[1]).toHaveBeenCalledOnce();expect(resizeStops[1]).toHaveBeenCalledOnce();
  });
  it('only paints visible demand frames and updates params without recreating resources',()=>{
    const ready=vi.fn();const {rerender}=render(<SdfRaymarch isDark={false} onReadyChange={ready}/>);
    expect(frames.size).toBe(0);expect(ready).not.toHaveBeenCalled();visible();frame();expect(frames.size).toBe(0);
    fireEvent.change(screen.getByRole('slider',{name:/旋转/}),{target:{value:'1.2'}});frame();expect(gl.uniform1f).toHaveBeenCalledWith('angle',1.2);
    visible(false);fireEvent.change(screen.getByRole('slider',{name:/旋转/}),{target:{value:'1.4'}});expect(frames.size).toBe(0);
    const changed=vi.fn();rerender(<SdfRaymarch isDark onReadyChange={changed}/>);expect(gl.createProgram).toHaveBeenCalledOnce();
    visible();frame();expect(gl.uniform1f).toHaveBeenCalledWith('dark',1);expect(gl.uniform1f).toHaveBeenCalledWith('angle',1.4);
  });
  it('stops observers and GPU work once on context loss and never restarts disposed state',async()=>{
    const ready=vi.fn();const {container,unmount}=render(<SdfRaymarch isDark onReadyChange={ready}/>);visible();frame();
    const event=new Event('webglcontextlost',{cancelable:true});act(()=>container.querySelector('canvas')!.dispatchEvent(event));await microtasks();
    expect(event.defaultPrevented).toBe(true);expect(ready).toHaveBeenLastCalledWith(false);expect(stops[0]).toHaveBeenCalledOnce();expect(resizeStops[0]).toHaveBeenCalledOnce();
    visible();expect(frames.size).toBe(0);expect(screen.getByRole('alert')).toBeTruthy();expect(container.querySelector('fieldset')!.disabled).toBe(true);
    unmount();expect(gl.deleteProgram).toHaveBeenCalledOnce();expect(gl.deleteBuffer).toHaveBeenCalledOnce();expect(gl.deleteShader).toHaveBeenCalledTimes(2);
  });
  it.each(['context','compile','link','draw','lost_without_event'] as const)('reports %s failure without a false-ready frame',async failure=>{
    if(failure==='context')getContext.mockImplementation(()=>{throw new Error('context creation failed');});
    if(failure==='compile')(gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    if(failure==='link')(gl.getProgramParameter as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const ready=vi.fn();render(<SdfRaymarch isDark onReadyChange={ready}/>);
    if(failure==='draw'||failure==='lost_without_event'){
      if(failure==='draw')(gl.drawArrays as ReturnType<typeof vi.fn>).mockImplementation(()=>{throw new Error('driver failure');});
      else (gl.isContextLost as ReturnType<typeof vi.fn>).mockReturnValue(true);
      visible();frame();
    }
    await microtasks();expect(ready).toHaveBeenCalledExactlyOnceWith(false);expect(frames.size).toBe(0);
  });
  it('ignores a failed setup callback from the first StrictMode effect',async()=>{
    (gl.getShaderParameter as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    const ready=vi.fn();render(<StrictMode><SdfRaymarch isDark onReadyChange={ready}/></StrictMode>);await microtasks();
    expect(ready).not.toHaveBeenCalledWith(false);visible();frame();expect(ready).toHaveBeenLastCalledWith(true);expect(screen.queryByRole('alert')).toBeNull();
  });
});
