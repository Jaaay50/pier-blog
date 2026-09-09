// @vitest-environment jsdom

import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import AudioSpectrum,{AUDIO_START_TIMEOUT_MS} from './AudioSpectrum';

const mocks=vi.hoisted(()=>({gate:undefined as undefined|((visible:boolean)=>void),dispose:vi.fn()}));
vi.mock('next-intl',()=>({useLocale:()=> 'en'}));
vi.mock('@/lib/webgl',()=>({
  observeRenderGate:(_element:Element,callback:(visible:boolean)=>void)=>{
    mocks.gate=callback;callback(true);return mocks.dispose;
  },
}));

function deferred(){
  let resolve!:()=>void;
  let reject!:(error:Error)=>void;
  const promise=new Promise<void>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
const parameter=()=>({value:0,setTargetAtTime:vi.fn()});
let mode:'pending'|'success'|'reject'|'node-error'='pending';
let instances:FakeAudioContext[]=[];
class FakeAudioContext {
  state:AudioContextState='suspended';
  currentTime=0;
  destination={};
  resumeResult=deferred();
  oscillator={type:'sine',frequency:parameter(),connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn()};
  volume={gain:parameter(),connect:vi.fn(),disconnect:vi.fn()};
  filter={type:'lowpass',frequency:parameter(),connect:vi.fn(),disconnect:vi.fn()};
  analyser={fftSize:0,smoothingTimeConstant:0,connect:vi.fn(),disconnect:vi.fn(),getByteTimeDomainData:vi.fn(),getByteFrequencyData:vi.fn()};
  close=vi.fn(()=>{this.state='closed';return Promise.resolve();});
  constructor(){instances.push(this);}
  createOscillator(){if(mode==='node-error')throw new Error('node unavailable');return this.oscillator;}
  createGain(){return this.volume;}
  createBiquadFilter(){return this.filter;}
  createAnalyser(){return this.analyser;}
  resume(){
    if(mode==='reject')return Promise.reject(new Error('Audio denied'));
    if(mode==='success'){this.state='running';return Promise.resolve();}
    return this.resumeResult.promise;
  }
}

beforeEach(()=>{
  vi.useFakeTimers();vi.clearAllMocks();mode='pending';instances=[];
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({
    fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},
  } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){}});
  vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));
  vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.stubGlobal('AudioContext',FakeAudioContext);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

function expectClosed(context:FakeAudioContext){
  expect(context.close).toHaveBeenCalledOnce();
  expect(context.oscillator.stop).toHaveBeenCalledOnce();
  for(const node of [context.oscillator,context.volume,context.filter,context.analyser])expect(node.disconnect).toHaveBeenCalledOnce();
}

describe('Audio startup recovery',()=>{
  it('times out a hung startup, releases its graph and allows a successful retry',async()=>{
    render(<AudioSpectrum isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    expect((screen.getByRole('button',{name:'Play'}) as HTMLButtonElement).disabled).toBe(true);
    act(()=>vi.advanceTimersByTime(AUDIO_START_TIMEOUT_MS-1));
    expect(screen.queryByRole('alert')).toBeNull();
    act(()=>vi.advanceTimersByTime(1));
    expect(screen.getByRole('alert').textContent).toContain('Audio could not start');
    expect((screen.getByRole('button',{name:'Play'}) as HTMLButtonElement).disabled).toBe(false);
    expectClosed(instances[0]);
    expect(vi.getTimerCount()).toBe(0);

    mode='success';
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Play'})));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button',{name:'Mute'})).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'Mute'}));
    expectClosed(instances[1]);
  });

  it('ignores a late completion from the timed-out graph after a new startup begins',async()=>{
    render(<AudioSpectrum isDark={true}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>vi.advanceTimersByTime(AUDIO_START_TIMEOUT_MS));
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    const [old,current]=instances;
    old.state='running';
    await act(async()=>old.resumeResult.resolve());
    expect(screen.queryByRole('button',{name:'Mute'})).toBeNull();
    expect((screen.getByRole('button',{name:'Play'}) as HTMLButtonElement).disabled).toBe(true);
    expect(current.close).not.toHaveBeenCalled();
    current.state='running';
    await act(async()=>current.resumeResult.resolve());
    expect(screen.getByRole('button',{name:'Mute'})).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels pending startup on reset and ignores its late rejection',async()=>{
    render(<AudioSpectrum isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expectClosed(instances[0]);
    expect(vi.getTimerCount()).toBe(0);
    await act(async()=>instances[0].resumeResult.reject(new Error('late rejection')));
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('button',{name:'Play'}) as HTMLButtonElement).disabled).toBe(false);
  });

  it('closes pending audio and clears timeout on visibility loss and unmount',()=>{
    const {unmount}=render(<AudioSpectrum isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    act(()=>mocks.gate?.(false));
    expectClosed(instances[0]);
    expect(vi.getTimerCount()).toBe(0);
    expect((screen.getByRole('button',{name:'Play'}) as HTMLButtonElement).disabled).toBe(false);
    act(()=>mocks.gate?.(true));
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    unmount();
    expectClosed(instances[1]);
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.dispose).toHaveBeenCalledOnce();
  });

  it('reports an immediate resume rejection and clears the error on reset',async()=>{
    mode='reject';
    render(<AudioSpectrum isDark={false}/>);
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Play'})));
    expect(screen.getByRole('alert')).toBeTruthy();
    expectClosed(instances[0]);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('also closes a context when node construction fails before graph registration',()=>{
    mode='node-error';
    render(<AudioSpectrum isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Play'}));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(instances[0].close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
