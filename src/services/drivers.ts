import "server-only";

import type { Driver } from "@/types/driver";

/**
 * Driver dataset — currently a deterministic mock so the Drivers page can render production-grade UI
 * before a real `drivers` table exists. Swap this provider for a Supabase query without changing the
 * page or its components.
 */

const FIXED_NOW = new Date();

function isoToday(hour: number, minute = 0): string {
  const d = new Date(FIXED_NOW);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const drivers: Driver[] = [
  {
    id: "drv_arvid",
    name: "Arvid Lindqvist",
    phone: "+46 70 123 45 01",
    email: "arvid@bookarlandataxi.se",
    avatarUrl: null,
    status: "on_trip",
    vehicle: "Volvo XC90 — Black",
    licensePlate: "ABC 123",
    rating: 4.92,
    tripsToday: 7,
    earningsToday: 4_280,
    earningsWeek: 21_540,
    dailyTargetProgress: 0.71,
    shift: { startsAt: isoToday(7), endsAt: isoToday(19) },
    assignedBookingId: null,
  },
  {
    id: "drv_elin",
    name: "Elin Bergström",
    phone: "+46 70 123 45 02",
    email: "elin@bookarlandataxi.se",
    avatarUrl: null,
    status: "online",
    vehicle: "Mercedes V-Class — Silver",
    licensePlate: "DEF 456",
    rating: 4.88,
    tripsToday: 5,
    earningsToday: 3_120,
    earningsWeek: 18_390,
    dailyTargetProgress: 0.52,
    shift: { startsAt: isoToday(9), endsAt: isoToday(21) },
  },
  {
    id: "drv_johan",
    name: "Johan Öberg",
    phone: "+46 70 123 45 03",
    email: "johan@bookarlandataxi.se",
    avatarUrl: null,
    status: "break",
    vehicle: "Tesla Model Y — White",
    licensePlate: "GHI 789",
    rating: 4.75,
    tripsToday: 3,
    earningsToday: 1_890,
    earningsWeek: 14_220,
    dailyTargetProgress: 0.32,
    shift: { startsAt: isoToday(6), endsAt: isoToday(18) },
  },
  {
    id: "drv_sofia",
    name: "Sofia Karlsson",
    phone: "+46 70 123 45 04",
    email: "sofia@bookarlandataxi.se",
    avatarUrl: null,
    status: "online",
    vehicle: "Volvo XC60 — Grey",
    licensePlate: "JKL 012",
    rating: 4.95,
    tripsToday: 6,
    earningsToday: 3_680,
    earningsWeek: 19_980,
    dailyTargetProgress: 0.61,
    shift: { startsAt: isoToday(8), endsAt: isoToday(20) },
  },
  {
    id: "drv_marcus",
    name: "Marcus Holm",
    phone: "+46 70 123 45 05",
    email: "marcus@bookarlandataxi.se",
    avatarUrl: null,
    status: "offline",
    vehicle: "Volvo S90 — Blue",
    licensePlate: "MNO 345",
    rating: 4.6,
    tripsToday: 0,
    earningsToday: 0,
    earningsWeek: 11_240,
    dailyTargetProgress: 0,
    shift: { startsAt: isoToday(14), endsAt: isoToday(23, 30) },
  },
  {
    id: "drv_isabella",
    name: "Isabella Hansson",
    phone: "+46 70 123 45 06",
    email: "isabella@bookarlandataxi.se",
    avatarUrl: null,
    status: "on_trip",
    vehicle: "Mercedes E-Class — Black",
    licensePlate: "PQR 678",
    rating: 4.83,
    tripsToday: 4,
    earningsToday: 2_540,
    earningsWeek: 16_780,
    dailyTargetProgress: 0.42,
    shift: { startsAt: isoToday(10), endsAt: isoToday(22) },
  },
];

export async function getDrivers(): Promise<Driver[]> {
  return drivers;
}
