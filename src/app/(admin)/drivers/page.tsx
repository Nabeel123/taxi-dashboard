import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { DriverStatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BadgeDollar, CarIcon, UsersIcon } from "@/components/dashboard/icons";

import { getDrivers } from "@/services/drivers";
import { formatCurrency, formatNumber, formatTime } from "@/utils/format";
import type { Driver } from "@/types/driver";

export const metadata: Metadata = {
  title: "Drivers",
  description: "Live driver status, schedule, daily targets and earnings.",
};

export default async function DriversPage() {
  const drivers = await getDrivers();

  const online = drivers.filter((d) => d.status !== "offline").length;
  const onTrip = drivers.filter((d) => d.status === "on_trip").length;
  const tripsToday = drivers.reduce((s, d) => s + d.tripsToday, 0);
  const earningsToday = drivers.reduce((s, d) => s + d.earningsToday, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Driver operations"
        description="Live fleet status, scheduling and daily performance against targets."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Drivers online"
          value={`${online} / ${drivers.length}`}
          hint={`${onTrip} currently on a trip`}
          accent="success"
          icon={<UsersIcon />}
        />
        <KpiCard
          label="Trips today"
          value={formatNumber(tripsToday)}
          accent="brand"
          icon={<CarIcon />}
        />
        <KpiCard
          label="Earnings today"
          value={formatCurrency(earningsToday, "SEK")}
          accent="success"
          icon={<BadgeDollar />}
        />
        <KpiCard
          label="Daily target"
          value={`${Math.round(averageProgress(drivers) * 100)}%`}
          hint="Fleet-wide progress"
          accent="warning"
          icon={<CarIcon />}
        />
      </section>

      <SectionCard
        title="Fleet"
        description="Each card shows the driver's live status, vehicle, today's earnings and target progress."
        contentClassName="!p-0"
      >
        {drivers.length === 0 ? (
          <div className="px-5 py-8 sm:px-6">
            <EmptyState title="No drivers" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-gray-100 dark:bg-gray-800 sm:grid-cols-2 xl:grid-cols-3">
            {drivers.map((d) => (
              <DriverCard key={d.id} driver={d} />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function averageProgress(drivers: readonly Driver[]): number {
  if (drivers.length === 0) return 0;
  return drivers.reduce((s, d) => s + d.dailyTargetProgress, 0) / drivers.length;
}

function DriverCard({ driver }: { driver: Driver }) {
  const progress = Math.max(0, Math.min(1, driver.dailyTargetProgress));
  return (
    <article className="relative bg-white p-5 transition hover:bg-gray-50 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-sm font-semibold text-white">
            {initials(driver.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 dark:text-white/90">{driver.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{driver.vehicle}</p>
          </div>
        </div>
        <DriverStatusBadge status={driver.status} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label="Trips today" value={String(driver.tripsToday)} />
        <Stat label="Earnings" value={formatCurrency(driver.earningsToday, "SEK")} />
        <Stat label="Rating" value={`${driver.rating.toFixed(2)} ★`} />
        <Stat label="Plate" value={driver.licensePlate} />
      </dl>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
          <span>Daily target</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-success-500 transition-[width] duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Shift {formatTime(driver.shift.startsAt)} – {formatTime(driver.shift.endsAt)} · Week earnings{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {formatCurrency(driver.earningsWeek, "SEK")}
        </span>
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
