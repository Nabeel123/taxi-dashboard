/**
 * Domain types for the taxi dispatch dashboard.
 *
 * Source of truth is `public.form_submissions` (jsonb `fields`) — surfaced to the
 * dashboard via the `booking_form_snapshots` view. We normalize the JSON shape into
 * stable `Booking` objects at the service boundary so all UI code stays type-safe
 * and decoupled from how rows are persisted.
 */

export const SERVICE_TYPES = [
  "vasteras-route",
  "airport-pickup",
  "airport-dropoff",
  "city-tour",
  "custom-route",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  "vasteras-route": "Västerås Route",
  "airport-pickup": "Airport Pickup",
  "airport-dropoff": "Airport Drop-off",
  "city-tour": "City Tour",
  "custom-route": "Custom Route",
};

/** Operational booking lifecycle (extends raw payment state from Stripe / quote requests). */
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "driver_assigned",
  "on_the_way",
  "picked_up",
  "completed",
  "cancelled",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  driver_assigned: "Driver Assigned",
  on_the_way: "On the way",
  picked_up: "Picked up",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUSES = ["paid", "unpaid", "refunded", "quote"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  refunded: "Refunded",
  quote: "Quote",
};

/** Raw `completion_kind` values written by the booking API. */
export type CompletionKind = "stripe_paid" | "manual_confirm" | "quote_request";

export interface Booking {
  id: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  pickupLocation: string;
  dropoffLocation: string | null;
  /** Combined ISO timestamp (date + time). Falls back to createdAt when unparsable. */
  pickupAt: string;
  pickupDate: string;
  pickupTime: string;
  serviceType: ServiceType;
  passengers: string | null;
  flightNumber: string | null;
  message: string | null;
  distanceKm: number | null;
  amount: number | null;
  currency: string;
  packageLabel: string | null;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  completionKind: CompletionKind | null;
  paymentIntentId: string | null;
  locale: string | null;
  driverId: string | null;
}

/** Lightweight summary used by overview tiles to avoid serializing full bookings. */
export interface BookingKpis {
  totalRevenue: number;
  todaysRevenue: number;
  totalTrips: number;
  upcomingTrips: number;
  airportPickups: number;
  completedTrips: number;
  averageDistanceKm: number | null;
  returningCustomers: number;
  currency: string;
}
