import { type ReactNode, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface Props {
  open: boolean;
  onClose?: () => void;
  /** When false, clicking the backdrop does NOT close — useful for the
   * "you won" / "you lost" celebrations where the user needs to choose
   * an explicit next action. */
  dismissable?: boolean;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Modal({
  open, onClose, dismissable = true, children, className, ariaLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape' && dismissable) onClose?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-sm"
        onClick={() => dismissable && onClose?.()}
      />
      <div className={cn(
        'relative bg-bg-elevated text-fg shadow-3 rounded-lg',
        'max-w-md w-[calc(100%-2rem)] mx-4 p-6',
        className,
      )}>
        {children}
      </div>
    </div>
  );
}
