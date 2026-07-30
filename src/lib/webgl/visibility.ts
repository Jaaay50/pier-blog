/**
 * WebGL 渲染门控：视口可见性 + 页面可见性
 *
 * canvas 滚出视口或标签页隐藏时通知调用方暂停 RAF，
 * 回到可见状态时恢复。返回清理函数。
 */
export function observeRenderGate(
  el: Element,
  onChange: (active: boolean) => void
): () => void {
  let inView = true;
  let pageVisible = !document.hidden;
  let last: boolean | null = null;

  const emit = () => {
    const active = inView && pageVisible;
    if (active !== last) {
      last = active;
      onChange(active);
    }
  };

  const io = new IntersectionObserver(
    entries => {
      inView = entries[entries.length - 1].isIntersecting;
      emit();
    },
    { rootMargin: '100px' }
  );
  io.observe(el);

  const onVisibility = () => {
    pageVisible = !document.hidden;
    emit();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
