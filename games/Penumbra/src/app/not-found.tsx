import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <h1 className="font-display text-5xl text-fg-primary">404</h1>
      <p className="mt-4 font-body text-fg-secondary">This path leads nowhere.</p>
      <Link
        href="/"
        className="mt-8 rounded-md border border-accent px-6 py-3 font-body text-sm text-accent transition-colors hover:bg-accent hover:text-bg-primary"
      >
        Return home
      </Link>
    </main>
  );
}
