/**
 * 首帧粒子门控脚本 + 设备档位标记
 *
 * 在浏览器解析 body 之前同步执行：
 * 1. 计算设备分级，在 <html> 打 data-gpu-tier（供 card-glass 按档降 blur）
 * 2. 判断 WebGL 粒子是否可用，可用时打 data-particles-ready，
 *    CSS 直接让 SSR 标题在第一帧就不可见，避免白字闪现。
 *
 * 分级判断逻辑必须与 src/lib/webgl/capabilities.ts 的 getDeviceTier() 完全一致。
 */
export function ParticleGateScript() {
  // 内联脚本必须阻塞式执行（不能 async/defer），确保在首帧绘制前完成
  const script = `
(function() {
  try {
    var docEl = document.documentElement;

    // 1. 设备分级（与 capabilities.ts getDeviceTier() 逻辑一致）
    var nav = navigator;
    var memory = nav.deviceMemory || 8;
    var cores = nav.hardwareConcurrency || 8;
    var coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    var tier = 'high';
    if (memory <= 2 || cores <= 2) tier = 'low';
    else if (coarsePointer || memory <= 4 || cores <= 4) tier = 'medium';

    // 首帧同步打设备档位：card-glass 按档降 blur（medium/low → 10px），
    // SSR 默认无此属性→走 high 16px，无闪烁
    docEl.setAttribute('data-gpu-tier', tier);

    // 2. WebGL 检测
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return;

    // 3. prefers-reduced-motion 检测
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 4. low tier 不启用粒子
    if (tier === 'low') return;

    // 全部通过：粒子可用
    docEl.setAttribute('data-particles-ready', '');
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
