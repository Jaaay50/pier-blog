"use client";

/** 初次加载 skeleton：与卡片结构对齐的占位 */
export function CurrentsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="currents-surface-list rounded-xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="skeleton-block h-3 w-24 rounded-full" />
            <div className="skeleton-block h-5 w-10 rounded-full" />
          </div>
          <div className="skeleton-block mb-2 h-4 w-3/4 rounded" />
          <div className="skeleton-block mb-1 h-3 w-full rounded" />
          <div className="skeleton-block h-3 w-2/3 rounded" />
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <div className="skeleton-block h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 加载更多（追加态）的小 skeleton */
export function CurrentsLoadMoreSkeleton() {
  return <CurrentsSkeleton count={2} />;
}
