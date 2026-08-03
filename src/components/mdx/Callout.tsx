import type { ReactNode } from 'react';

export type CalloutType = 'info' | 'tip' | 'warning' | 'danger';

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
}

// Inline SVG icons — no external deps
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function IconTip() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
      <line x1="9" y1="21" x2="15" y2="21" />
      <line x1="10" y1="21" x2="14" y2="21" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconDanger() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

const VARIANTS: Record<CalloutType, {
  icon: ReactNode;
  defaultTitle: string;
  borderColor: string;
  bg: string;
  iconColor: string;
  titleColor: string;
}> = {
  info: {
    icon: <IconInfo />,
    defaultTitle: 'Note',
    borderColor: 'var(--accent)',
    bg: 'var(--accent-soft-block)',
    iconColor: 'var(--accent)',
    titleColor: 'var(--accent)',
  },
  tip: {
    icon: <IconTip />,
    defaultTitle: 'Tip',
    borderColor: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.08)',
    iconColor: '#22c55e',
    titleColor: '#22c55e',
  },
  warning: {
    icon: <IconWarning />,
    defaultTitle: 'Warning',
    borderColor: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    iconColor: '#f59e0b',
    titleColor: '#f59e0b',
  },
  danger: {
    icon: <IconDanger />,
    defaultTitle: 'Danger',
    borderColor: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.08)',
    iconColor: '#ef4444',
    titleColor: '#ef4444',
  },
};

export function Callout({ type = 'info', title, children }: CalloutProps) {
  const v = VARIANTS[type];
  const label = title ?? v.defaultTitle;

  return (
    <aside
      className="not-prose my-6 rounded-r-lg rounded-bl-lg overflow-hidden"
      style={{
        borderLeft: `3px solid ${v.borderColor}`,
        background: v.bg,
      }}
      aria-label={label}
    >
      <div className="flex gap-3 px-4 py-3.5">
        {/* Icon */}
        <span
          className="mt-[1px] shrink-0"
          style={{ color: v.iconColor }}
        >
          {v.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <p
            className="mb-1 text-[13px] font-semibold uppercase tracking-wide leading-none"
            style={{ color: v.titleColor }}
          >
            {label}
          </p>

          {/* Body — inherits prose-like text styles */}
          <div className="text-sm leading-relaxed text-[var(--text-secondary)] [&>p]:m-0 [&>p+p]:mt-2 [&>ul]:mt-1 [&>ul]:pl-4 [&>ul>li]:list-disc">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}
