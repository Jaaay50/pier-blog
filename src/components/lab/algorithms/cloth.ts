export interface ClothPoint { x:number; y:number; px:number; py:number; pinned:boolean }
export interface ClothLink { a:number; b:number; rest:number; active:boolean; lambda:number }
export interface Cloth { points:ClothPoint[]; links:ClothLink[]; time:number }
export interface ClothOptions { wind:number; obstacle:boolean; grab:{id:number;x:number;y:number}|null }
export function createCloth():Cloth {
  const points:ClothPoint[]=[], links:ClothLink[]=[];
  const cols=29, rows=17, gap=14;
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
    const i=points.length,px=104+x*gap,py=28+y*gap;
    points.push({x:px,y:py,px,py,pinned:y===0&&x%7===0});
    if(x) links.push({a:i-1,b:i,rest:gap,active:true,lambda:0});
    if(y) links.push({a:i-cols,b:i,rest:gap,active:true,lambda:0});
    if(x&&y) links.push({a:i-cols-1,b:i,rest:gap*Math.SQRT2,active:true,lambda:0});
  }
  return {points,links,time:0};
}
export function cutCloth(cloth:Cloth,x:number,y:number,radius=13):void {
  for(const link of cloth.links) {
    if(!link.active) continue;
    const a=cloth.points[link.a],b=cloth.points[link.b],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
    if(Math.hypot(x-a.x-dx*t,y-a.y-dy*t)<radius) link.active=false;
  }
}
/** 固定 1/120s 子步 + XPBD compliance，lambda 每个子步重置而非每次迭代。 */
export function stepCloth(cloth:Cloth,options:ClothOptions,steps=2):void {
  const dt=1/120,alpha=0.0000004/(dt*dt);
  for(let sub=0;sub<Math.max(1,Math.min(8,steps));sub++) {
    cloth.time+=dt;
    for(let i=0;i<cloth.points.length;i++) {
      const p=cloth.points[i];
      if(p.pinned||options.grab?.id===i) continue;
      const vx=(p.x-p.px)*0.995,vy=(p.y-p.py)*0.995;
      p.px=p.x;p.py=p.y;
      p.x+=vx+options.wind*250*Math.sin(cloth.time*2+p.y/110)*dt*dt;
      p.y+=vy+360*dt*dt;
    }
    for(const link of cloth.links) link.lambda=0;
    for(let iter=0;iter<8;iter++) {
      if(options.grab) { const p=cloth.points[options.grab.id]; if(p){p.x=options.grab.x;p.y=options.grab.y;p.px=p.x;p.py=p.y;} }
      for(const link of cloth.links) {
        if(!link.active) continue;
        const a=cloth.points[link.a],b=cloth.points[link.b];
        const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
        if(len<1e-9) continue;
        const wa=a.pinned||options.grab?.id===link.a?0:1,wb=b.pinned||options.grab?.id===link.b?0:1;
        if(!wa&&!wb) continue;
        const dl=(-(len-link.rest)-alpha*link.lambda)/(wa+wb+alpha); link.lambda+=dl;
        a.x-=wa*dl*dx/len;a.y-=wa*dl*dy/len;b.x+=wb*dl*dx/len;b.y+=wb*dl*dy/len;
      }
      for(let i=0;i<cloth.points.length;i++) {
        const p=cloth.points[i];if(p.pinned||options.grab?.id===i) continue;
        if(options.obstacle){const dx=p.x-330,dy=p.y-255,r=Math.hypot(dx,dy);if(r<52){p.x=330+(r>1e-8?dx/r:0)*52;p.y=255+(r>1e-8?dy/r:-1)*52;}}
        p.x=Math.min(595,Math.max(5,p.x));p.y=Math.min(355,Math.max(5,p.y));
      }
    }
  }
}
