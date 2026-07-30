'use client';

import { useEffect, useRef } from 'react';
import { magneticEffect } from '@/lib/animations';

interface MagneticWrapperProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticWrapper({
  children,
  className = '',
  strength = 0.3,
}: MagneticWrapperProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const cleanup = magneticEffect(element, { strength });

    return cleanup;
  }, [strength]);

  return (
    <div ref={wrapperRef} className={`magnetic ${className}`}>
      {children}
    </div>
  );
}
