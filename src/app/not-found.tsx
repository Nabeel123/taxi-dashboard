import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16 text-center dark:bg-gray-950">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(70,95,255,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,rgba(70,95,255,0.16),transparent_60%)]"
      />
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-500">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white/90 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-500 dark:text-gray-400">
        The page you are looking for has been moved or no longer exists. It may have been part of a
        booking that has since been completed.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
        >
          Back to dashboard
        </Link>
        <Link
          href="/bookings"
          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          View bookings
        </Link>
      </div>
    </div>
  );
}
