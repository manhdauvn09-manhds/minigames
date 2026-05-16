import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-body text-sm transition-colors duration-200 ease-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-bg-primary hover:bg-accent-glow px-5 py-2.5",
  secondary:
    "border border-accent text-accent hover:bg-accent hover:text-bg-primary px-5 py-2.5",
  ghost: "text-fg-secondary hover:text-fg-primary hover:bg-surface-soft px-3 py-2",
  icon: "p-2 text-fg-secondary hover:text-fg-primary hover:bg-surface-soft rounded-md",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", className, ...props },
  ref,
) {
  return (
    <button ref={ref} type={props.type ?? "button"} className={cn(base, variants[variant], className)} {...props} />
  );
});
