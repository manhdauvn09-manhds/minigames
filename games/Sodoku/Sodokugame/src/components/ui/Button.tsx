import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-hover active:bg-accent-press',
  secondary: 'bg-bg-elevated text-fg border border-border hover:bg-bg-sunken',
  ghost:     'text-fg hover:bg-bg-sunken',
  danger:    'bg-loss text-white hover:opacity-90',
};

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-5 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'secondary', size = 'md', className, children, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md',
        'font-medium transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT[variant], SIZE[size], className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
