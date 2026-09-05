import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-border bg-surface transition-colors hover:bg-surface-hov',
        className,
      )}
      {...props}
    />
  );
}

export function CardPadded({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-4.5 pt-3.5 text-[11px] font-semibold uppercase tracking-wide text-text3', className)}
      {...props}
    />
  );
}
