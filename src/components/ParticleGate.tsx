/**
 * 首帧粒子门控脚本
 *
 * 在浏览器解析 body 之前同步执行，判断 WebGL 粒子是否可用。
 * 可用时在 <html> 打标记，CSS 直接让 SSR 标题在第一帧就不可见，
 * 避免「白色文字停留 → 消失 → 粒子聚合」的闪现。
 *
 * 判断逻辑必须与 src/lib/webgl/capabilities.ts 的 getWebGLQuality() 完全一致。
 */
export function ParticleGateScript() {
  // 内联脚本必须阻塞式执行（不能 async/defer），确保在首帧绘制前完成
  const script = `
(function() {
  try {
    // 1. WebGL 检测
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return;

    // 2. prefers-reduced-motion 检测
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 3. 设备分级（与 capabilities.ts getDeviceTier() 逻辑一致）
    var nav = navigator;
    var memory = nav.deviceMemory || 8;
    var cores = nav.hardwareConcurrency || 8;
    var coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    var tier = 'high';
    if (memory <= 2 || cores <= 2) tier = 'low';
    else if (coarsePointer || memory <= 4 || cores <= 4) tier = 'medium';

    // 4. low tier 降级
    if (tier === 'low') return;

    // 全部通过：粒子可用
    document.documentElement.setAttribute('data-particles-ready', '');
  } catch (e) {
    // 任何异常都静默失败，保持 SSR 文字可见（安全降级）
  }
})();
`;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      // 不加任何 async/defer，保持阻塞执行
    />
  );
}
