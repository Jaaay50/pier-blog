import { createHash } from "node:crypto";
import { PARTICLE_GATE_SCRIPT } from "@/components/ParticleGate";

/**
 * 与 layout 内联脚本字节级一致。SSG 站点不能按请求换 nonce
 * （headers() 会把整站打成动态渲染），hash 是可落地的准备步骤：
 * 先锁住我们自己的内联脚本，Next runtime 仍需要 'unsafe-inline'。
 */
export const DENSITY_SCRIPT =
  "try{var d=localStorage.getItem('pier-currents-density-v1');if(d==='compact'||d==='comfortable')document.documentElement.setAttribute('data-density',d)}catch(e){}";

export function cspHash(source: string): string {
  return `'sha256-${createHash("sha256").update(source).digest("base64")}'`;
}

export function inlineScriptHashes(): string[] {
  return [cspHash(PARTICLE_GATE_SCRIPT), cspHash(DENSITY_SCRIPT)];
}
