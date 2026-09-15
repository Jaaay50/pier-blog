import {describe,it,expect} from 'vitest';
import {delaunay,voronoiCells} from './geometry';
import {createCloth,cutCloth,stepCloth} from './cloth';
describe('geometry',()=>{
  it('handles insufficient, duplicate and collinear points',()=>{expect(delaunay([]).triangles).toEqual([]);expect(delaunay([{x:0,y:0},{x:0,y:0},{x:1,y:1},{x:2,y:2}]).triangles).toEqual([]);expect(voronoiCells([{x:1,y:1}],10,10)[0]).toHaveLength(4);expect(voronoiCells([{x:2,y:2},{x:8,y:2}],10,10)).toHaveLength(2);});
  it('triangulates square and partitions its rectangle without area loss',()=>{const points=[{x:2,y:2},{x:8,y:2},{x:8,y:8},{x:2,y:8}];expect(delaunay(points).triangles).toHaveLength(2);const area=voronoiCells(points,10,10).reduce((sum,cell)=>sum+Math.abs(cell.reduce((s,p,i)=>{const q=cell[(i+1)%cell.length];return s+p.x*q.y-p.y*q.x;},0))/2,0);expect(area).toBeCloseTo(100,6);});
  it('every returned cell vertex is closest to its site',()=>{const points=Array.from({length:20},(_,i)=>({x:(i*37)%100,y:(i*63)%91}));const cells=voronoiCells(points,100,100);cells.forEach((cell,i)=>cell.forEach(p=>{const distance=Math.hypot(p.x-points[i].x,p.y-points[i].y);for(const q of points)expect(distance).toBeLessThanOrEqual(Math.hypot(p.x-q.x,p.y-q.y)+1e-5);}));});
});
describe('XPBD cloth',()=>{
  it('keeps pins and finite bounded positions while progressing time',()=>{const c=createCloth(),pins=c.points.filter(p=>p.pinned).map(p=>({...p}));for(let i=0;i<120;i++)stepCloth(c,{wind:2,obstacle:true,grab:null});expect(c.time).toBeCloseTo(2);expect(c.points.filter(p=>p.pinned)).toEqual(pins);for(const p of c.points){expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);expect(p.x).toBeGreaterThanOrEqual(5);expect(p.y).toBeLessThanOrEqual(355);}});
  it('cuts segment interiors and preserves tears across steps',()=>{const c=createCloth(),l=c.links[250],a=c.points[l.a],b=c.points[l.b];cutCloth(c,(a.x+b.x)/2,(a.y+b.y)/2,2);expect(l.active).toBe(false);stepCloth(c,{wind:0,obstacle:false,grab:null});expect(l.active).toBe(false);expect(createCloth().links.every(l=>l.active)).toBe(true);});
  it('grab has zero inverse mass during constraint iterations',()=>{const c=createCloth();stepCloth(c,{wind:3,obstacle:true,grab:{id:50,x:200,y:160}});expect(c.points[50].x).toBe(200);expect(c.points[50].y).toBe(160);});
});
