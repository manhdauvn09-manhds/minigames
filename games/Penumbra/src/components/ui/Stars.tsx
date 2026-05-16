import { cn } from "@/lib/utils/cn";

interface Props {
  count: 0 | 1 | 2 | 3;
  size?: "sm" | "lg";
}

export function Stars({ count, size = "sm" }: Props) {
  const stars = [1, 2, 3] as const;
  return (
    <div className={cn("inline-flex gap-1", size === "lg" ? "text-3xl" : "text-base")}>
      {stars.map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className={cn(
            "transition-colors",
            n <= count ? "text-accent" : "text-fg-disabled",
          )}
        >
          ★
        </span>
      ))}
      <span className="sr-only">{count} of 3 stars</span>
    </div>
  );
}
