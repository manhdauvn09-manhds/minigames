import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// `cn(...)` — concat Tailwind class names with conflict resolution.
// Standard idiom in shadcn/ui codebases. Phase 4 components rely on
// this helper everywhere they accept a `className` prop.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
