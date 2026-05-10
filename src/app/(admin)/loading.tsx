import { CardSkeleton, ChartSkeleton, Skeleton } from "@/components/dashboard/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] xl:col-span-2">
          <Skeleton className="h-5 w-1/3" />
          <div className="mt-4">
            <ChartSkeleton />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <Skeleton className="h-5 w-1/3" />
          <div className="mt-4">
            <ChartSkeleton height={240} />
          </div>
        </div>
      </div>
    </div>
  );
}
