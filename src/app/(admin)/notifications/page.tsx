import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getBookings } from "@/services/bookings";
import { buildNotifications } from "@/services/notifications";
import { formatRelative } from "@/utils/format";
import {
  type DispatchNotification,
  NOTIFICATION_KIND_LABELS,
  type NotificationKind,
} from "@/types/notification";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Real-time operational alerts: new bookings, payments, upcoming trips, flight delays.",
};

const KIND_STYLES: Record<NotificationKind, { dot: string; bg: string; emoji: string }> = {
  new_booking: { dot: "bg-brand-500", bg: "bg-brand-50 dark:bg-brand-500/10", emoji: "🚖" },
  payment_success: { dot: "bg-success-500", bg: "bg-success-50 dark:bg-success-500/10", emoji: "💳" },
  upcoming_trip: { dot: "bg-warning-500", bg: "bg-warning-50 dark:bg-warning-500/10", emoji: "⏱" },
  trip_cancelled: { dot: "bg-error-500", bg: "bg-error-50 dark:bg-error-500/10", emoji: "✖" },
  flight_delay: { dot: "bg-blue-light-500", bg: "bg-blue-light-50 dark:bg-blue-light-500/10", emoji: "✈" },
};

export default async function NotificationsPage() {
  const bookings = await getBookings(1000);
  const notifications = buildNotifications(bookings);

  const grouped = groupByKind(notifications);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Operational alerts derived from live booking activity."
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(NOTIFICATION_KIND_LABELS) as NotificationKind[]).map((k) => (
          <div
            key={k}
            className={`rounded-2xl border border-gray-200 p-4 dark:border-gray-800 ${KIND_STYLES[k].bg}`}
          >
            <p className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
              <span aria-hidden>{KIND_STYLES[k].emoji}</span>
              {NOTIFICATION_KIND_LABELS[k]}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white/90">
              {grouped.get(k)?.length ?? 0}
            </p>
          </div>
        ))}
      </section>

      <SectionCard
        title="Activity feed"
        description="Most recent operational events across the fleet."
        contentClassName="!p-0"
      >
        {notifications.length === 0 ? (
          <div className="px-5 py-8 sm:px-6">
            <EmptyState
              title="All caught up"
              description="When new bookings arrive or trips approach, alerts will appear here."
            />
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function groupByKind(notifications: readonly DispatchNotification[]) {
  const m = new Map<NotificationKind, DispatchNotification[]>();
  for (const n of notifications) {
    const arr = m.get(n.kind) ?? [];
    arr.push(n);
    m.set(n.kind, arr);
  }
  return m;
}

function NotificationRow({ notification }: { notification: DispatchNotification }) {
  const styles = KIND_STYLES[notification.kind];
  return (
    <li className="flex items-start gap-3 border-b border-gray-100 px-5 py-4 last:border-b-0 dark:border-gray-800 sm:px-6">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{notification.title}</p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelative(new Date(notification.createdAt))}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">{notification.description}</p>
      </div>
      {notification.bookingId && (
        <Link
          href={`/bookings/${notification.bookingId}`}
          className="self-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          Open
        </Link>
      )}
    </li>
  );
}
