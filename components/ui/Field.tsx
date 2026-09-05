import { cn } from '@/lib/cn';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2.5 last:mb-0">
      <label className="mb-1.5 block text-[11.5px] font-medium text-text3">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'min-h-[72px] resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={cn(inputClass, 'appearance-none bg-no-repeat pr-8', className)} {...props} />
  );
}
