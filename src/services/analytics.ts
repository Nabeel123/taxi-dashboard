import "server-only";

import { dateKey } from "@/utils/format";
import {
  type Booking,
  type BookingKpis,
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from "@/types/booking";

/**
 * Pure aggregations over an in-memory booking list. Centralized here so each dashboard
 * page can request only the slice it needs while sharing a single fetch + parse pass.
 */

function isToday(iso: string, now: Date = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(iso: string, now: Date = new Date()): boolean {
  return new Date(iso).getTime() > now.getTime();
}

export function computeKpis(bookings: readonly Booking[]): BookingKpis {
  const now = new Date();
  const currency = bookings.find((b) => b.currency)?.currency ?? "SEK";

  let totalRevenue = 0;
  let todaysRevenue = 0;
  let upcomingTrips = 0;
  let airportPickups = 0;
  let completedTrips = 0;
  let distanceSum = 0;
  let distanceCount = 0;

  const customerCounts = new Map<string, number>();

  for (const b of bookings) {
    if (b.amount && b.paymentStatus === "paid") {
      totalRevenue += b.amount;
      if (isToday(b.createdAt, now)) todaysRevenue += b.amount;
    }
    if (isFuture(b.pickupAt, now) && b.status !== "cancelled") upcomingTrips += 1;
    if (b.serviceType === "airport-pickup") airportPickups += 1;
    if (b.status === "completed") completedTrips += 1;
    if (typeof b.distanceKm === "number") {
      distanceSum += b.distanceKm;
      distanceCount += 1;
    }

    const key = (b.customer.email || b.customer.phone).trim().toLowerCase();
    if (key) customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1);
  }

  let returningCustomers = 0;
  for (const count of customerCounts.values()) if (count > 1) returningCustomers += 1;

  return {
    totalRevenue,
    todaysRevenue,
    totalTrips: bookings.length,
    upcomingTrips,
    airportPickups,
    completedTrips,
    averageDistanceKm: distanceCount > 0 ? distanceSum / distanceCount : null,
    returningCustomers,
    currency,
  };
}

export interface DailySeriesPoint {
  date: string;
  revenue: number;
  trips: number;
  /** True for buckets that fall on/after today — useful for chart annotations. */
  isFuture: boolean;
}

export interface DailySeriesOptions {
  /** Number of historical days before today to include. */
  pastDays?: number;
  /** Number of upcoming days after today to include (lets the chart show upcoming trips). */
  futureDays?: number;
}

/**
 * Daily revenue + trip volume bucketed by the trip date (`pickupAt`), not when the
 * booking was placed. This keeps upcoming/scheduled rides visible in the chart so
 * dispatch can see committed revenue and demand for the days ahead.
 *
 * Cancelled bookings are excluded — they don't represent operational activity.
 */
export function dailySeries(
  bookings: readonly Booking[],
  options: number | DailySeriesOptions = {},
): DailySeriesPoint[] {
  /* Backward-compat: a bare number was previously interpreted as `days` (past-only). */
  const opts: DailySeriesOptions =
    typeof options === "number" ? { pastDays: options - 1, futureDays: 0 } : options;
  const pastDays = opts.pastDays ?? 14;
  const futureDays = opts.futureDays ?? 15;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dateKey(today);

  const start = new Date(today);
  start.setDate(today.getDate() - pastDays);

  const map = new Map<string, DailySeriesPoint>();
  const total = pastDays + 1 + futureDays;
  for (let i = 0; i < total; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    map.set(key, { date: key, revenue: 0, trips: 0, isFuture: key >= todayKey });
  }

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const key = dateKey(b.pickupAt);
    const slot = map.get(key);
    if (!slot) continue;
    slot.trips += 1;
    if (b.amount && b.paymentStatus === "paid") slot.revenue += b.amount;
  }

  return Array.from(map.values());
}

export interface ServiceBreakdown {
  serviceType: ServiceType;
  label: string;
  count: number;
  revenue: number;
}

export function serviceBreakdown(bookings: readonly Booking[]): ServiceBreakdown[] {
  const totals = new Map<ServiceType, ServiceBreakdown>();
  for (const b of bookings) {
    const slot = totals.get(b.serviceType) ?? {
      serviceType: b.serviceType,
      label: SERVICE_TYPE_LABELS[b.serviceType],
      count: 0,
      revenue: 0,
    };
    slot.count += 1;
    if (b.amount && b.paymentStatus === "paid") slot.revenue += b.amount;
    totals.set(b.serviceType, slot);
  }
  return Array.from(totals.values()).sort((a, b) => b.count - a.count);
}

/** 24-hour pickup distribution (operations finds peak demand windows). */
export function peakHours(bookings: readonly Booking[]): { hour: number; trips: number }[] {
  const buckets = new Array(24).fill(0).map((_, hour) => ({ hour, trips: 0 }));
  for (const b of bookings) {
    const d = new Date(b.pickupAt);
    if (Number.isNaN(d.getTime())) continue;
    const hour = d.getHours();
    if (hour >= 0 && hour < 24) buckets[hour].trips += 1;
  }
  return buckets;
}

/** Distance histogram in 5km bins, capped at 100km+. */
export function distanceHistogram(bookings: readonly Booking[]): { bin: string; trips: number }[] {
  const bins: { bin: string; trips: number }[] = [
    { bin: "0–5", trips: 0 },
    { bin: "5–10", trips: 0 },
    { bin: "10–20", trips: 0 },
    { bin: "20–30", trips: 0 },
    { bin: "30–50", trips: 0 },
    { bin: "50–80", trips: 0 },
    { bin: "80+", trips: 0 },
  ];
  for (const b of bookings) {
    const km = b.distanceKm;
    if (km == null) continue;
    if (km < 5) bins[0].trips += 1;
    else if (km < 10) bins[1].trips += 1;
    else if (km < 20) bins[2].trips += 1;
    else if (km < 30) bins[3].trips += 1;
    else if (km < 50) bins[4].trips += 1;
    else if (km < 80) bins[5].trips += 1;
    else bins[6].trips += 1;
  }
  return bins;
}

export interface CustomerSummary {
  key: string;
  name: string;
  email: string;
  phone: string;
  trips: number;
  totalSpend: number;
  lastPickupAt: string;
}

export function topCustomers(bookings: readonly Booking[], limit = 8): CustomerSummary[] {
  const by = new Map<string, CustomerSummary>();
  for (const b of bookings) {
    const key = (b.customer.email || b.customer.phone).trim().toLowerCase();
    if (!key) continue;
    const slot = by.get(key) ?? {
      key,
      name: b.customer.name,
      email: b.customer.email,
      phone: b.customer.phone,
      trips: 0,
      totalSpend: 0,
      lastPickupAt: b.pickupAt,
    };
    slot.trips += 1;
    if (b.amount && b.paymentStatus === "paid") slot.totalSpend += b.amount;
    if (new Date(b.pickupAt).getTime() > new Date(slot.lastPickupAt).getTime()) {
      slot.lastPickupAt = b.pickupAt;
    }
    by.set(key, slot);
  }
  return Array.from(by.values())
    .sort((a, b) => b.totalSpend - a.totalSpend || b.trips - a.trips)
    .slice(0, limit);
}

export interface RouteSummary {
  pickup: string;
  dropoff: string;
  trips: number;
  averageDistanceKm: number | null;
}

export function topRoutes(bookings: readonly Booking[], limit = 8): RouteSummary[] {
  const by = new Map<string, RouteSummary & { distanceSum: number; distanceCount: number }>();
  for (const b of bookings) {
    if (!b.pickupLocation || !b.dropoffLocation) continue;
    const pickup = simplifyAddress(b.pickupLocation);
    const dropoff = simplifyAddress(b.dropoffLocation);
    const key = `${pickup}→${dropoff}`;
    const slot = by.get(key) ?? {
      pickup,
      dropoff,
      trips: 0,
      averageDistanceKm: null,
      distanceSum: 0,
      distanceCount: 0,
    };
    slot.trips += 1;
    if (typeof b.distanceKm === "number") {
      slot.distanceSum += b.distanceKm;
      slot.distanceCount += 1;
    }
    by.set(key, slot);
  }
  return Array.from(by.values())
    .map((r) => ({
      pickup: r.pickup,
      dropoff: r.dropoff,
      trips: r.trips,
      averageDistanceKm: r.distanceCount > 0 ? r.distanceSum / r.distanceCount : null,
    }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, limit);
}

function simplifyAddress(addr: string): string {
  /* Drop the country suffix and any trailing zip when present so similar routes group together. */
  const noCountry = addr.replace(/,\s*Sweden$/i, "").replace(/,\s*\d{3}\s*\d{2}.*/i, "");
  const parts = noCountry.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(", ");
  return `${parts[0]}, ${parts[parts.length - 1]}`;
}

export function topDestinations(bookings: readonly Booking[], limit = 6): { destination: string; trips: number }[] {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    if (!b.dropoffLocation) continue;
    const key = simplifyAddress(b.dropoffLocation);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([destination, trips]) => ({ destination, trips }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, limit);
}

export function upcomingBookings(bookings: readonly Booking[], limit = 6): Booking[] {
  const now = Date.now();
  return bookings
    .filter((b) => new Date(b.pickupAt).getTime() >= now && b.status !== "cancelled")
    .sort((a, b) => new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime())
    .slice(0, limit);
}
