import "server-only";

import { unstable_cache } from "next/cache";
import { getServiceClient } from "@/lib/supabase";
import {
  type Booking,
  type BookingStatus,
  type CompletionKind,
  type PaymentStatus,
  type ServiceType,
  SERVICE_TYPES,
} from "@/types/booking";

/**
 * Read-side service for booking analytics.
 *
 * Reads from `public.booking_form_snapshots` (a view over `form_submissions` filtered to
 * `form_type = 'booking'`) and normalizes the JSONB payload into typed `Booking` rows.
 *
 * The dashboard never writes through this service; the customer-facing app remains the
 * sole writer. That keeps RLS / service-role concerns contained to a single seam.
 */

interface BookingSnapshotRow {
  id: string;
  created_at: string;
  locale: string | null;
  page_path: string | null;
  completion_kind: string | null;
  payment_intent_id: string | null;
  distance_km: number | null;
  package_label: string | null;
  booking_json: Record<string, unknown> | null;
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function asServiceType(v: unknown): ServiceType {
  return (SERVICE_TYPES as readonly string[]).includes(v as string)
    ? (v as ServiceType)
    : "custom-route";
}

/** Parse the price expressed in `package_label` (e.g. "650 SEK", "$120", "120"). */
function parseAmountFromPackage(label: string | null): { amount: number | null; currency: string | null } {
  if (!label) return { amount: null, currency: null };
  const match = label.match(/(-?\d+(?:[.,]\d+)?)\s*([A-Z]{2,4}|\$|€|£)?/i);
  if (!match) return { amount: null, currency: null };
  const numeric = Number(match[1].replace(",", "."));
  if (Number.isNaN(numeric)) return { amount: null, currency: null };
  const symbol = (match[2] ?? "").toUpperCase();
  const currency =
    symbol === "$" ? "USD" : symbol === "€" ? "EUR" : symbol === "£" ? "GBP" : symbol || null;
  return { amount: numeric, currency };
}

function deriveStatus(kind: CompletionKind | null): BookingStatus {
  switch (kind) {
    case "stripe_paid":
      return "confirmed";
    case "manual_confirm":
      return "pending";
    case "quote_request":
      return "pending";
    default:
      return "pending";
  }
}

/**
 * Promote bookings whose scheduled pickup has already passed to `completed`.
 *
 * Until a real dispatch state machine writes back live status (driver_assigned,
 * picked_up, completed…), the most informative view is: anything past its pickup
 * time is no longer "upcoming" — it's done. Cancellations are preserved.
 */
function applyTimeBasedStatus(
  raw: BookingStatus,
  pickupAt: string,
  nowMs: number,
): BookingStatus {
  if (raw === "cancelled") return raw;
  const pickupMs = new Date(pickupAt).getTime();
  if (!Number.isFinite(pickupMs)) return raw;
  return pickupMs < nowMs ? "completed" : raw;
}

function derivePaymentStatus(kind: CompletionKind | null): PaymentStatus {
  switch (kind) {
    case "stripe_paid":
      return "paid";
    case "manual_confirm":
      return "unpaid";
    case "quote_request":
      return "quote";
    default:
      return "unpaid";
  }
}

function combinePickupAt(dateRaw: unknown, timeRaw: unknown, fallbackIso: string): string {
  const dateStr = asString(dateRaw);
  const timeStr = asString(timeRaw) ?? "00:00";
  if (!dateStr) return fallbackIso;
  const base = new Date(dateStr);
  if (Number.isNaN(base.getTime())) return fallbackIso;
  const [h = 0, m = 0] = timeStr.split(":").map((p) => Number.parseInt(p, 10));
  base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return base.toISOString();
}

function normalize(row: BookingSnapshotRow, nowMs: number): Booking {
  const b = (row.booking_json ?? {}) as Record<string, unknown>;
  const completionKind = (asString(row.completion_kind) ?? null) as CompletionKind | null;
  const { amount, currency } = parseAmountFromPackage(row.package_label);

  const pickupDate = asString(b.pickupDate);
  const pickupTime = asString(b.pickupTime);
  const pickupAt = combinePickupAt(b.pickupDate, b.pickupTime, row.created_at);

  return {
    id: row.id,
    createdAt: row.created_at,
    customer: {
      name: asString(b.fullName) ?? "—",
      email: asString(b.email) ?? "",
      phone: asString(b.phone) ?? "",
    },
    pickupLocation: asString(b.pickupLocation) ?? "—",
    dropoffLocation: asString(b.dropoffLocation),
    pickupAt,
    pickupDate: pickupDate ?? row.created_at.slice(0, 10),
    pickupTime: pickupTime ?? "—",
    serviceType: asServiceType(b.serviceType),
    passengers: asString(b.passengers),
    flightNumber: asString(b.flightNumber),
    message: asString(b.message),
    distanceKm: typeof row.distance_km === "number" ? row.distance_km : null,
    amount,
    currency: currency ?? "SEK",
    packageLabel: row.package_label,
    status: applyTimeBasedStatus(deriveStatus(completionKind), pickupAt, nowMs),
    paymentStatus: derivePaymentStatus(completionKind),
    completionKind,
    paymentIntentId: row.payment_intent_id,
    locale: row.locale,
    driverId: null,
  };
}

const CACHE_TAG = "bookings";
const CACHE_TTL_SECONDS = 60;

/**
 * Fetch bookings ordered by pickup-time desc with a configurable cap.
 * `revalidate: 60s` keeps the dashboard snappy while still surfacing new bookings within a minute.
 */
async function fetchBookingsRaw(limit: number): Promise<Booking[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("booking_form_snapshots")
    .select(
      "id, created_at, locale, page_path, completion_kind, payment_intent_id, distance_km, package_label, booking_json",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[bookings] fetch failed", error.code, error.message);
    return [];
  }

  /* Stamp `now` once per fetch so all rows share a consistent comparison clock and
   * stay coherent with the cache window (60s). */
  const nowMs = Date.now();
  return (data ?? []).map((row) => normalize(row as BookingSnapshotRow, nowMs));
}

export const getBookings = unstable_cache(
  (limit = 500) => fetchBookingsRaw(limit),
  ["dashboard:bookings"],
  { revalidate: CACHE_TTL_SECONDS, tags: [CACHE_TAG] },
);

export async function getBookingById(id: string): Promise<Booking | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("booking_form_snapshots")
    .select(
      "id, created_at, locale, page_path, completion_kind, payment_intent_id, distance_km, package_label, booking_json",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data as BookingSnapshotRow, Date.now());
}
