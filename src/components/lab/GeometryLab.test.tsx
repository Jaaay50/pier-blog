// @vitest-environment jsdom

import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import GeometryLab from './GeometryLab';

vi.mock('next-intl',()=>({useLocale:()=> 'en'}));
afterEach(()=>{cleanup();vi.restoreAllMocks();});

const points=()=>[...screen.getByRole('application').querySelectorAll('circle')].map(point=>({x:Number(point.getAttribute('cx')),y:Number(point.getAttribute('cy'))}));
function expectSeparatePoints(count:number){
  const positions=points();
  expect(positions).toHaveLength(count);
  positions.forEach((point,i)=>positions.slice(i+1).forEach(other=>{
    expect(Math.hypot(point.x-other.x,point.y-other.y)).toBeGreaterThanOrEqual(2);
  }));
}

describe('Geometry point insertion',()=>{
  it('inserts a new distinct point after adding two and deleting the first addition',()=>{
    render(<GeometryLab isDark={false}/>);
    fireEvent.click(screen.getByRole('button',{name:'Add point'}));
    fireEvent.click(screen.getByRole('button',{name:'Add point'}));
    expectSeparatePoints(18);
    // The most recent point is selected; cycle back to the preceding addition.
    for(let i=0;i<17;i++)fireEvent.keyDown(screen.getByRole('application'),{key:' '});
    fireEvent.click(screen.getByRole('button',{name:'Delete selected'}));
    expectSeparatePoints(17);
    fireEvent.click(screen.getByRole('button',{name:'Add point'}));
    expectSeparatePoints(18);
  });

  it('always finds an available slot below the cap, including holes left by deleted points',()=>{
    render(<GeometryLab isDark={true}/>);
    for(let count=16;count<48;count++){
      fireEvent.click(screen.getByRole('button',{name:'Add point'}));
      expect(points()).toHaveLength(count+1);
    }
    expectSeparatePoints(48);
    expect((screen.getByRole('button',{name:'Add point'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole('application'),{key:' '});
    for(let count=48;count>32;count--)fireEvent.click(screen.getByRole('button',{name:'Delete selected'}));
    expectSeparatePoints(32);
    for(let count=32;count<48;count++){
      fireEvent.click(screen.getByRole('button',{name:'Add point'}));
      expect(points()).toHaveLength(count+1);
    }
    expectSeparatePoints(48);
  });

  it('recovers from no points and keeps reset usable',()=>{
    render(<GeometryLab isDark={false}/>);
    for(let i=0;i<16;i++)fireEvent.click(screen.getByRole('button',{name:'Delete selected'}));
    expectSeparatePoints(0);
    expect((screen.getByRole('button',{name:'Delete selected'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'Add point'}));
    expectSeparatePoints(1);
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expectSeparatePoints(16);
  });

  it('restores initial points, selection and all drawing modes on reset',()=>{
    render(<GeometryLab isDark={false}/>);
    const canvas=screen.getByRole('application'),initialPoints=points(),initialPolygons=canvas.querySelectorAll('polygon').length;
    fireEvent.click(screen.getByRole('button',{name:'Add point'}));
    fireEvent.keyDown(canvas,{key:'ArrowRight'});
    fireEvent.click(screen.getByRole('button',{name:'Voronoi'}));
    fireEvent.click(screen.getByRole('button',{name:'Delaunay'}));
    fireEvent.click(screen.getByRole('button',{name:'Move / add'}));
    expect(canvas.querySelectorAll('polygon')).toHaveLength(0);
    expect(screen.getByRole('button',{name:'Delete mode'}).getAttribute('aria-pressed')).toBe('true');
    expect(points()).not.toEqual(initialPoints);

    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    expect(points()).toEqual(initialPoints);
    expect([...canvas.querySelectorAll('circle')].map(point=>point.getAttribute('r'))).toEqual(['6',...Array(15).fill('4')]);
    expect(canvas.querySelectorAll('polygon')).toHaveLength(initialPolygons);
    expect(screen.getByRole('button',{name:'Voronoi'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button',{name:'Delaunay'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button',{name:'Move / add'}).getAttribute('aria-pressed')).toBe('false');
    fireEvent.keyDown(canvas,{key:'ArrowRight'});
    expect(points()[0]).toEqual({...initialPoints[0],x:initialPoints[0].x+5});
  });

  it('cancels the old drag when reset creates the new geometry',()=>{
    render(<GeometryLab isDark/>);
    const canvas=screen.getByRole('application'),initialPoints=points();
    vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:600,bottom:350,width:600,height:350,toJSON:()=>({})});
    Object.assign(canvas,{setPointerCapture:vi.fn()});
    const pointer=(type:string,x:number,y:number)=>{
      const event=new MouseEvent(type,{bubbles:true,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:9});fireEvent(canvas,event);
    };
    pointer('pointerdown',initialPoints[2].x,initialPoints[2].y);
    pointer('pointermove',initialPoints[2].x+20,initialPoints[2].y+10);
    expect(points()).not.toEqual(initialPoints);
    fireEvent.click(screen.getByRole('button',{name:'Reset'}));
    pointer('pointermove',550,320);
    expect(points()).toEqual(initialPoints);
  });
});
