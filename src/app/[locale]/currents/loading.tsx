import { CurrentsSkeleton } from "@/components/currents/CurrentsSkeleton";

export default function CurrentsLoading() {
  return (
    <div className="py-14" aria-busy="true">
      <div aria-hidden className="mb-8 h-12 w-40 animate-pulse rounded-lg bg-[var(--bg-card)] motion-reduce:animate-none" />
      <CurrentsSkeleton />
    </div>
  );
}
