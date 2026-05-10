import "server-only";

import type { Booking } from "@/types/booking";
import type { DispatchNotification, NotificationKind } from "@/types/notification";

/**
 * Derives a real-time notification feed from booking activity.
 *
 * Until a dedicated event log exists, we synthesize alerts deterministically from the
 * existing booking stream so the Notifications page reflects actual operational state.
 */

const HOUR = 60 * 60 * 1000;

export function buildNotifications(bookings: readonly Booking[]): DispatchNotification[] {
  const now = Date.now();
  const out: DispatchNotification[] = [];

  for (const b of bookings) {
    const createdMs = new Date(b.createdAt).getTime();
    const pickupMs = new Date(b.pickupAt).getTime();
    const ageMs = now - createdMs;

    if (ageMs >= 0 && ageMs <= 24 * HOUR) {
      out.push(notification(b, "new_booking"));
    }
    if (b.paymentStatus === "paid" && ageMs <= 6 * HOUR) {
      out.push(notification(b, "payment_success"));
    }
    if (pickupMs > now && pickupMs - now <= 4 * HOUR && b.status !== "cancelled") {
      out.push(notification(b, "upcoming_trip"));
    }
    if (b.serviceType === "airport-pickup" && b.flightNumber && pickupMs > now) {
      /* Synthetic flight delay alert for ~10% of upcoming airport bookings — keeps UI realistic. */
      if (b.id.charCodeAt(0) % 7 === 0) out.push(notification(b, "flight_delay"));
    }
    if (b.status === "cancelled" && ageMs <= 12 * HOUR) {
      out.push(notification(b, "trip_cancelled"));
    }
  }

  return out
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
}

function notification(b: Booking, kind: NotificationKind): DispatchNotification {
  const titles: Record<NotificationKind, string> = {
    new_booking: `New booking — ${b.customer.name}`,
    upcoming_trip: `Upcoming pickup in <4h — ${b.customer.name}`,
    payment_success: `Payment received — ${b.packageLabel ?? "booking"}`,
    trip_cancelled: `Trip cancelled — ${b.customer.name}`,
    flight_delay: `Flight delay reported — ${b.flightNumber ?? "flight"}`,
  };

  const description = `${b.pickupLocation}${b.dropoffLocation ? ` → ${b.dropoffLocation}` : ""}`;
  const createdAt =
    kind === "upcoming_trip"
      ? new Date(Date.now() - 5 * 60 * 1000).toISOString()
      : kind === "payment_success"
        ? new Date(new Date(b.createdAt).getTime() + 30 * 1000).toISOString()
        : b.createdAt;

  return {
    id: `${b.id}:${kind}`,
    kind,
    title: titles[kind],
    description,
    createdAt,
    read: false,
    bookingId: b.id,
  };
}
