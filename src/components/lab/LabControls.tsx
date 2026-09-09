import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function LabButton({ children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`rounded-md border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>{children}</button>;
}
export function LabToolbar({children}: {children: ReactNode}) {
  return <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--bg-card)] p-3">{children}</div>;
}
export function LabRange({label, value, min, max, step = 1, onChange, disabled = false}: {label:string; value:number; min:number; max:number; step?:number; onChange:(value:number)=>void; disabled?:boolean}) {
  return <label className="flex min-w-32 flex-1 items-center gap-2 text-xs text-[var(--text-primary)]"><span>{label}</span><input className="lab-slider min-w-12 flex-1" type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={e=>onChange(Number(e.target.value))} /><output className="w-10 tabular-nums">{Number(value.toFixed(2))}</output></label>;
}
