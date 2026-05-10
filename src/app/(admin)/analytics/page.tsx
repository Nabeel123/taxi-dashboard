import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueAreaChart } from "@/components/dashboard/charts/RevenueAreaChart";
import { ServiceTypeChart } from "@/components/dashboard/charts/ServiceTypeChart";
import { PeakHoursChart } from "@/components/dashboard/charts/PeakHoursChart";
import { DistanceChart } from "@/components/dashboard/charts/DistanceChart";
import { TripsBarChart } from "@/components/dashboard/charts/TripsBarChart";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BadgeDollar, CarIcon, MapDistance, PlaneIcon } from "@/components/dashboard/icons";

import { getBookings } from "@/services/bookings";
import {
  computeKpis,
  dailySeries,
  distanceHistogram,
  peakHours,
  serviceBreakdown,
  topRoutes,
  topDestinations,
} from "@/services/analytics";
import { formatCurrency, formatDistance, formatNumber } from "@/utils/format";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Revenue, service mix, peak hours and route insights for the fleet.",
};

export default async function AnalyticsPage() {
  const bookings = await getBookings(2000);
  const kpis = computeKpis(bookings);
  /* 14 past + today + 15 upcoming days, bucketed by pickup date so scheduled rides are visible. */
  const series30 = dailySeries(bookings, { pastDays: 14, futureDays: 15 });
  const serviceData = serviceBreakdown(bookings);
  const hours = peakHours(bookings);
  const distance = distanceHistogram(bookings);
  const routes = topRoutes(bookings, 6);
  const destinations = topDestinations(bookings, 6);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue & route analytics"
        description="Understand demand patterns, service mix and peak operations windows."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="30-day revenue"
          value={formatCurrency(series30.reduce((s, p) => s + p.revenue, 0), kpis.currency)}
          hint="Past 14d + next 15d"
          accent="success"
          icon={<BadgeDollar />}
        />
        <KpiCard
          label="30-day trips"
          value={formatNumber(series30.reduce((s, p) => s + p.trips, 0))}
          hint="Past 14d + next 15d"
          accent="brand"
          icon={<CarIcon />}
        />
        <KpiCard
          label="Airport pickups"
          value={formatNumber(kpis.airportPickups)}
          accent="info"
          icon={<PlaneIcon />}
        />
        <KpiCard
          label="Avg trip distance"
          value={formatDistance(kpis.averageDistanceKm)}
          accent="warning"
          icon={<MapDistance />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Revenue per day"
          description="Past 14 days, today and the next 15 — committed revenue from upcoming paid bookings is shown ahead of today."
        >
          {series30.length > 0 ? (
            <RevenueAreaChart data={series30} currency={kpis.currency} />
          ) : (
            <EmptyState title="Not enough data" />
          )}
        </SectionCard>

        <SectionCard title="Service mix" description="How bookings split across service types.">
          {serviceData.length > 0 ? (
            <ServiceTypeChart data={serviceData} />
          ) : (
            <EmptyState title="No data" />
          )}
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Trips per day" description="Booking volume by pickup date — past 14 days through the next 15.">
          <TripsBarChart data={series30} />
        </SectionCard>

        <SectionCard title="Peak booking hours" description="Pickup-time distribution across the day.">
          <PeakHoursChart data={hours} />
        </SectionCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Distance distribution" description="Trip length buckets.">
          <DistanceChart data={distance} />
        </SectionCard>

        <SectionCard title="Top destinations">
          {destinations.length === 0 ? (
            <EmptyState title="No destinations yet" />
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {destinations.map((d) => (
                <li key={d.destination} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <span className="truncate text-sm text-gray-700 dark:text-gray-200">{d.destination}</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{d.trips} trips</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <SectionCard title="Most common routes" description="Pickup → dropoff pairs ranked by trip count.">
        {routes.length === 0 ? (
          <EmptyState title="No repeat routes yet" description="Routes appear once you have multiple bookings sharing pickup and dropoff." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-2 pr-4">Pickup</th>
                  <th className="py-2 pr-4">Dropoff</th>
                  <th className="py-2 pr-4 text-right">Trips</th>
                  <th className="py-2 pr-4 text-right">Avg distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {routes.map((r, i) => (
                  <tr key={`${r.pickup}-${r.dropoff}-${i}`}>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-200">{r.pickup}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-200">{r.dropoff}</td>
                    <td className="py-3 pr-4 text-right font-medium text-gray-900 dark:text-white/90">{r.trips}</td>
                    <td className="py-3 pr-4 text-right text-gray-600 dark:text-gray-400">{formatDistance(r.averageDistanceKm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
