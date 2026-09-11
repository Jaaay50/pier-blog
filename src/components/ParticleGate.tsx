/**
 * 首帧设备档位及标题门控；无 JS 或能力不足时保留静态标题。
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
    if (tier === 'low' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    var lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
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
