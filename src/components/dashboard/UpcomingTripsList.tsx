"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookingStatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatDateTime, formatDistance, truncate } from "@/utils/format";
import { SERVICE_TYPE_LABELS, type Booking } from "@/types/booking";

/** Granularity for the live countdown — 30s keeps the UI smooth without burning paint cycles. */
const TICK_MS = 30_000;

function formatCountdown(targetMs: number, nowMs: number): { label: string; tone: "soon" | "near" | "far" | "now" } {
  const diff = targetMs - nowMs;
  if (diff <= 0) return { label: "Now", tone: "now" };
  const minutes = Math.floor(diff / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const remMinutes = minutes % 60;

  let label: string;
  if (days >= 1) label = `${days}d ${hours}h`;
  else if (hours >= 1) label = `${hours}h ${remMinutes}m`;
  else label = `${remMinutes}m`;

  const tone = diff < 60 * 60_000 ? "soon" : diff < 4 * 60 * 60_000 ? "near" : "far";
  return { label, tone };
}

const TONE_STYLES: Record<"soon" | "near" | "far" | "now", string> = {
  now: "bg-error-500/15 text-error-500",
  soon: "bg-warning-500/15 text-warning-500",
  near: "bg-blue-light-500/15 text-blue-light-500",
  far: "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-gray-300",
};

export function UpcomingTripsList({ bookings }: { bookings: readonly Booking[] }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const enriched = useMemo(
    () =>
      bookings.map((b) => ({
        booking: b,
        targetMs: new Date(b.pickupAt).getTime(),
      })),
    [bookings],
  );

  if (enriched.length === 0) {
    return <EmptyState title="No upcoming trips" description="New scheduled bookings will appear here." />;
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {enriched.map(({ booking, targetMs }) => {
        const { label, tone } = formatCountdown(targetMs, now);
        return (
          <li key={booking.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-5">
            <div
              className={`flex h-12 w-fit min-w-[64px] items-center justify-center rounded-xl px-3 text-xs font-semibold tabular-nums ${TONE_STYLES[tone]}`}
              aria-label={`Pickup in ${label}`}
            >
              {label}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
                  {booking.customer.name}
                </p>
                <BookingStatusBadge status={booking.status} />
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/[0.06] dark:text-gray-300">
                  {SERVICE_TYPE_LABELS[booking.serviceType]}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400" title={`${booking.pickupLocation} → ${booking.dropoffLocation ?? ""}`}>
                <span aria-hidden>↗</span> {truncate(booking.pickupLocation, 40)}
                {booking.dropoffLocation ? <> → {truncate(booking.dropoffLocation, 40)}</> : null}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDateTime(booking.pickupAt)}</span>
                <span aria-hidden className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span>{formatDistance(booking.distanceKm)}</span>
                {booking.flightNumber && (
                  <>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span>Flight {booking.flightNumber}</span>
                  </>
                )}
                {booking.customer.phone && (
                  <>
                    <span aria-hidden className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <a className="hover:text-brand-500" href={`tel:${booking.customer.phone}`}>
                      {booking.customer.phone}
                    </a>
                  </>
                )}
              </div>
              {booking.message && (
                <p className="mt-2 truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">
                  Note: {truncate(booking.message, 120)}
                </p>
              )}
            </div>

            <Link
              href={`/bookings/${booking.id}`}
              className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04] sm:self-center"
            >
              View
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
