import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { BookingsTable } from "@/components/dashboard/BookingsTable";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CalendarPlus, CarIcon, CheckCircle, MapDistance } from "@/components/dashboard/icons";

import { getBookings } from "@/services/bookings";
import { computeKpis } from "@/services/analytics";
import { formatDistance, formatNumber } from "@/utils/format";

export const metadata: Metadata = {
  title: "Bookings",
  description: "Search, filter, sort and export every booking in your fleet.",
};

export default async function BookingsPage() {
  const bookings = await getBookings(1000);
  const kpis = computeKpis(bookings);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description="Every booking in one place — filter, sort, search and export to CSV."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total bookings"
          value={formatNumber(kpis.totalTrips)}
          accent="brand"
          icon={<CarIcon />}
        />
        <KpiCard
          label="Upcoming"
          value={formatNumber(kpis.upcomingTrips)}
          accent="purple"
          icon={<CalendarPlus />}
        />
        <KpiCard
          label="Completed"
          value={formatNumber(kpis.completedTrips)}
          accent="success"
          icon={<CheckCircle />}
        />
        <KpiCard
          label="Avg distance"
          value={formatDistance(kpis.averageDistanceKm)}
          accent="warning"
          icon={<MapDistance />}
        />
      </section>

      <BookingsTable bookings={bookings} pageSize={25} />
    </div>
  );
}
