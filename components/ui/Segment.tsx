import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Segment({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('inline-flex gap-0.5 rounded-lg bg-bg3 p-[3px]', className)}>{children}</div>
  );
}

export function SegmentButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-md px-3.5 py-1.5 text-[13px] transition',
        active ? 'bg-surface font-medium text-text shadow-sm' : 'text-text3 hover:text-text',
        className,
      )}
    >
      {children}
    </button>
  );
}
