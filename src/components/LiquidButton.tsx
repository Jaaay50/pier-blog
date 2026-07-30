'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface LiquidButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function LiquidButton({
  children,
  className = '',
  onClick,
  href,
  type = 'button',
}: LiquidButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const liquidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const button = buttonRef.current as HTMLElement | null;
    const liquid = liquidRef.current;
    if (!button || !liquid) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      gsap.set(liquid, {
        left: x,
        top: y,
      });

      gsap.to(liquid, {
        width: rect.width * 2.5,
        height: rect.width * 2.5,
        duration: 0.6,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      gsap.to(liquid, {
        width: 0,
        height: 0,
        duration: 0.4,
        ease: 'power2.in',
      });
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const baseClasses = `relative overflow-hidden isolate ${className}`;

  const content = (
    <>
      <div
        ref={liquidRef}
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 0,
          height: 0,
          background: 'var(--accent-hover)',
          transform: 'translate(-50%, -50%)',
          zIndex: -1,
        }}
      />
      <span className="relative z-10">{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        ref={buttonRef as any}
        href={href}
        className={baseClasses}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={buttonRef as any}
      type={type}
      className={baseClasses}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
