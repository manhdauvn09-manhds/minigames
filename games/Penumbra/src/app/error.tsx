"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <h1 className="font-display text-3xl text-fg-primary">Something slipped into shadow.</h1>
      <p className="mt-4 font-body text-fg-secondary">An unexpected error occurred.</p>
      <button
        onClick={reset}
        type="button"
        className="mt-8 rounded-md border border-accent px-6 py-3 font-body text-sm text-accent transition-colors hover:bg-accent hover:text-bg-primary"
      >
        Try again
      </button>
    </main>
  );
}
