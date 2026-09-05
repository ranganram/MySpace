import { cn } from '@/lib/cn';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'sm';

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center gap-1.5 rounded-lg border font-medium transition active:scale-[0.97] disabled:opacity-50',
        size === 'md' ? 'px-3.5 py-1.5 text-[13px]' : 'px-2.5 py-1 text-xs',
        variant === 'primary'
          ? 'border-transparent bg-accent text-white hover:brightness-[1.08]'
          : 'border-border bg-bg3 text-text2 hover:bg-border',
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  danger = true,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      className={cn(
        'inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-text3 transition',
        danger ? 'hover:bg-red-bg hover:text-red' : 'hover:bg-accent-bg hover:text-accent',
        className,
      )}
      {...props}
    />
  );
}
