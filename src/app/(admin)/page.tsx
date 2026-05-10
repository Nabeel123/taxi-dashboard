import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { UpcomingTripsList } from "@/components/dashboard/UpcomingTripsList";
import { BookingsTable } from "@/components/dashboard/BookingsTable";
import { RevenueAreaChart } from "@/components/dashboard/charts/RevenueAreaChart";
import { ServiceTypeChart } from "@/components/dashboard/charts/ServiceTypeChart";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  BadgeDollar,
  CalendarPlus,
  CarIcon,
  CashIcon,
  CheckCircle,
  MapDistance,
  PlaneIcon,
  UsersIcon,
} from "@/components/dashboard/icons";

import { getBookings } from "@/services/bookings";
import {
  computeKpis,
  dailySeries,
  serviceBreakdown,
  upcomingBookings,
} from "@/services/analytics";
import { formatCurrency, formatDistance, formatNumber } from "@/utils/format";

export const metadata: Metadata = {
  title: "Overview",
  description: "Live operations summary across bookings, revenue and fleet activity.",
};

/* Server Components fetch once, then derive every chart + tile from a single in-memory pass. */
export default async function OverviewPage() {
  const bookings = await getBookings(500);
  const kpis = computeKpis(bookings);
  /* 14 past + today + 15 upcoming days so committed revenue & demand for the days ahead are visible. */
  const series = dailySeries(bookings, { pastDays: 14, futureDays: 15 });
  const serviceData = serviceBreakdown(bookings);
  const upcoming = upcomingBookings(bookings, 5);
  const recent = bookings.slice(0, 8);
  const noData = bookings.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations overview"
        description="Live KPIs, upcoming pickups and revenue trends across the fleet."
        actions={
          <Link
            href="/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600"
          >
            View all bookings
          </Link>
        }
      />

      {noData && (
        <EmptyState
          title="No bookings yet"
          description="Connect Supabase credentials to see live data, or place a test booking from the customer site."
        />
      )}

      <section
        aria-label="Key performance indicators"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Total revenue"
          value={formatCurrency(kpis.totalRevenue, kpis.currency)}
          hint={`From ${formatNumber(kpis.totalTrips)} trips`}
          accent="success"
          icon={<BadgeDollar />}
        />
        <KpiCard
          label="Today's revenue"
          value={formatCurrency(kpis.todaysRevenue, kpis.currency)}
          hint="Paid bookings today"
          accent="brand"
          icon={<CashIcon />}
        />
        <KpiCard
          label="Total trips"
          value={formatNumber(kpis.totalTrips)}
          hint={`${formatNumber(kpis.completedTrips)} completed`}
          accent="info"
          icon={<CarIcon />}
        />
        <KpiCard
          label="Upcoming trips"
          value={formatNumber(kpis.upcomingTrips)}
          hint="Scheduled & active"
          accent="purple"
          icon={<CalendarPlus />}
        />
        <KpiCard
          label="Airport pickups"
          value={formatNumber(kpis.airportPickups)}
          hint="Across all-time bookings"
          accent="brand"
          icon={<PlaneIcon />}
        />
        <KpiCard
          label="Completed trips"
          value={formatNumber(kpis.completedTrips)}
          hint="Lifetime"
          accent="success"
          icon={<CheckCircle />}
        />
        <KpiCard
          label="Avg trip distance"
          value={formatDistance(kpis.averageDistanceKm)}
          hint="Per booking with route data"
          accent="warning"
          icon={<MapDistance />}
        />
        <KpiCard
          label="Returning customers"
          value={formatNumber(kpis.returningCustomers)}
          hint="Booked more than once"
          accent="purple"
          icon={<UsersIcon />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Revenue & trips · 30-day window"
          description="Past 14 days, today and the next 15 days — bucketed by pickup date so upcoming bookings are visible."
        >
          {series.length > 0 ? (
            <RevenueAreaChart data={series} currency={kpis.currency} />
          ) : (
            <EmptyState title="Not enough data" description="Charts populate once bookings are recorded." />
          )}
        </SectionCard>

        <SectionCard
          title="Service mix"
          description="Bookings broken down by service type."
        >
          {serviceData.length > 0 ? (
            <ServiceTypeChart data={serviceData} />
          ) : (
            <EmptyState title="No service data" />
          )}
        </SectionCard>
      </section>

      <SectionCard
        title="Upcoming pickups"
        description="Live countdown to the next scheduled trips."
        action={
          <Link
            href="/calendar"
            className="text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            Open calendar →
          </Link>
        }
      >
        <UpcomingTripsList bookings={upcoming} />
      </SectionCard>

      <SectionCard
        title="Recent bookings"
        description="Most recent activity across the fleet."
        action={
          <Link
            href="/bookings"
            className="text-xs font-semibold text-brand-500 hover:text-brand-600"
          >
            All bookings →
          </Link>
        }
        contentClassName="!px-0 !pt-0 !pb-0"
      >
        <BookingsTable bookings={recent} compact pageSize={8} />
      </SectionCard>
    </div>
  );
}
