export interface GridMap { cols: number; rows: number; walls: number[]; start: number; end: number }
export interface SearchResult { visited: number[]; path: number[] }

/** 四邻接、单位代价；Manhattan 启发式在此网格上可采纳且一致。 */
export function findPath(map: GridMap, algorithm: 'astar' | 'dijkstra'): SearchResult {
  const { cols, rows, start, end } = map;
  const size = cols * rows;
  if (!Number.isInteger(size) || cols < 1 || rows < 1 || size > 10000 || start < 0 || end < 0 || start >= size || end >= size) return { visited: [], path: [] };
  const walls = new Set(map.walls);
  if (walls.has(start) || walls.has(end)) return { visited: [], path: [] };
  const distance = new Float64Array(size).fill(Infinity);
  const parent = new Int32Array(size).fill(-1);
  const closed = new Set<number>();
  const open = new Set([start]);
  const visited: number[] = [];
  distance[start] = 0;
  const heuristic = (n: number) => algorithm === 'dijkstra' ? 0 : Math.abs(n % cols - end % cols) + Math.abs(Math.floor(n / cols) - Math.floor(end / cols));
  // 演示限制在小网格，线性 frontier 比自建通用堆更易审计；更大地图可替换为二叉堆。
  while (open.size) {
    let current = -1, best = Infinity;
    for (const n of open) {
      const f = distance[n] + heuristic(n);
      if (f < best || (f === best && heuristic(n) < heuristic(current))) { best = f; current = n; }
    }
    open.delete(current); closed.add(current); visited.push(current);
    if (current === end) {
      const path: number[] = [];
      for (let n = end; n !== -1; n = parent[n]) path.push(n);
      return { visited, path: path.reverse() };
    }
    const x = current % cols, y = Math.floor(current / cols);
    const neighbors = [x > 0 ? current - 1 : -1, x + 1 < cols ? current + 1 : -1, y > 0 ? current - cols : -1, y + 1 < rows ? current + cols : -1];
    for (const n of neighbors) {
      if (n < 0 || walls.has(n) || closed.has(n)) continue;
      const d = distance[current] + 1;
      if (d >= distance[n]) continue;
      distance[n] = d; parent[n] = current; open.add(n);
    }
  }
  return { visited, path: [] };
}

export function initialGrid(): GridMap {
  return { cols: 26, rows: 14, start: 5 * 26 + 3, end: 8 * 26 + 22, walls: Array.from({ length: 10 }, (_, i) => i * 26 + 12).filter(n => n !== 7 * 26 + 12) };
}
