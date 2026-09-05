import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

const colors = {
  blue: 'bg-accent-bg text-accent',
  green: 'bg-green-bg text-green',
  red: 'bg-red-bg text-red',
  orange: 'bg-orange-bg text-orange',
  purple: 'bg-purple-bg text-purple',
  muted: 'bg-bg3 text-text3',
} as const;

export function Badge({
  color = 'muted',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { color?: keyof typeof colors }) {
  return (
    <span
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium', colors[color], className)}
      {...props}
    />
  );
}
