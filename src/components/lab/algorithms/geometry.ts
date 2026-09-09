export interface Point { x: number; y: number }
export type Triangle = [number, number, number];
const orient = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function uniquePoints(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) if (Number.isFinite(p.x) && Number.isFinite(p.y) && !out.some(q => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6)) out.push({ ...p });
  return out;
}
function inCircle(a: Point, b: Point, c: Point, p: Point) {
  const ax = a.x-p.x, ay = a.y-p.y, bx = b.x-p.x, by = b.y-p.y, cx = c.x-p.x, cy = c.y-p.y;
  const det = (ax*ax+ay*ay)*(bx*cy-by*cx) - (bx*bx+by*by)*(ax*cy-ay*cx) + (cx*cx+cy*cy)*(ax*by-ay*bx);
  return det * Math.sign(orient(a,b,c)) > 1e-10;
}
/** Bowyer–Watson，先去重；共线点保留 Voronoi 条带但不制造退化三角形。 */
export function delaunay(input: Point[]): { points: Point[]; triangles: Triangle[] } {
  const points = uniquePoints(input), n = points.length;
  if (n < 3) return { points, triangles: [] };
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const cx = (Math.min(...xs)+Math.max(...xs))/2, cy = (Math.min(...ys)+Math.max(...ys))/2;
  const d = Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys), 1) * 32;
  const all = [...points, {x:cx-d,y:cy-d}, {x:cx+d,y:cy-d}, {x:cx,y:cy+d}];
  let triangles: Triangle[] = [[n,n+1,n+2]];
  for (let i=0;i<n;i++) {
    const bad = triangles.filter(t => inCircle(all[t[0]],all[t[1]],all[t[2]],all[i]));
    const edges = new Map<string,{edge:[number,number];count:number}>();
    for (const t of bad) for (const [a,b] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]) {
      const key = [Math.min(a,b),Math.max(a,b)].join(':');
      const edge = edges.get(key); if (edge) edge.count++; else edges.set(key,{edge:[a,b],count:1});
    }
    const removed = new Set(bad);
    triangles = triangles.filter(t => !removed.has(t));
    for (const {edge:[a,b],count} of edges.values()) if (count===1 && Math.abs(orient(all[a],all[b],all[i])) > 1e-9) triangles.push([a,b,i]);
  }
  return {points,triangles:triangles.filter(t=>t.every(v=>v<n))};
}

/** 按两点等距半平面裁剪，包含单点、共线与边界区域。 */
export function voronoiCells(input: Point[], width: number, height: number): Point[][] {
  const points = uniquePoints(input);
  return points.map((p,i) => {
    let cell: Point[] = [{x:0,y:0},{x:width,y:0},{x:width,y:height},{x:0,y:height}];
    for (let j=0;j<points.length && cell.length;j++) {
      if (i===j) continue;
      const q=points[j], nx=q.x-p.x, ny=q.y-p.y, limit=(q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y)/2;
      const distance=(v:Point)=>nx*v.x+ny*v.y-limit;
      const next:Point[]=[];
      for(let k=0;k<cell.length;k++) {
        const a=cell[k], b=cell[(k+1)%cell.length], da=distance(a), db=distance(b);
        if(da<=1e-9) next.push(a);
        if((da<0 && db>0)||(da>0 && db<0)) { const t=da/(da-db); next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}); }
      }
      cell=next;
    }
    return cell;
  });
}
