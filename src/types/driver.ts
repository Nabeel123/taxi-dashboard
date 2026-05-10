/**
 * Driver domain types. The current Supabase schema does not yet model drivers,
 * so the Drivers page is sourced from a typed mock dataset (see `src/services/drivers.ts`).
 * Swap the mock provider for a real query without touching UI code.
 */

export type DriverStatus = "online" | "offline" | "on_trip" | "break";

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  online: "Online",
  offline: "Offline",
  on_trip: "On trip",
  break: "On break",
};

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl: string | null;
  status: DriverStatus;
  vehicle: string;
  licensePlate: string;
  rating: number;
  tripsToday: number;
  earningsToday: number;
  earningsWeek: number;
  /** 0..1 progress toward today's earnings target. */
  dailyTargetProgress: number;
  shift: { startsAt: string; endsAt: string };
  assignedBookingId?: string | null;
}
