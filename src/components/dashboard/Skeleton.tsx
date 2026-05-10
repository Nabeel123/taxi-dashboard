import React from "react";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      role="presentation"
      className={`animate-pulse rounded-lg bg-gray-200/70 dark:bg-white/[0.06] ${className ?? ""}`}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] ${
        className ?? ""
      }`}
    >
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="mt-4 h-7 w-1/3" />
      <Skeleton className="mt-2 h-3 w-2/3" />
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800"
      style={{ height }}
    >
      <div className="flex h-full items-end gap-2 p-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className={`flex-1 rounded-md`} />
        ))}
      </div>
    </div>
  );
}
