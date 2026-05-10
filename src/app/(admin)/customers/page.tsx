import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { BadgeDollar, CarIcon, UsersIcon } from "@/components/dashboard/icons";

import { getBookings } from "@/services/bookings";
import { topCustomers, topDestinations } from "@/services/analytics";
import { formatCurrency, formatDateTime, formatNumber } from "@/utils/format";

export const metadata: Metadata = {
  title: "Customers",
  description: "Top customers, repeat travellers, average spend and frequent destinations.",
};

export default async function CustomersPage() {
  const bookings = await getBookings(2000);
  const top = topCustomers(bookings, 12);
  const destinations = topDestinations(bookings, 8);

  const uniqueCustomers = new Set(
    bookings.map((b) => (b.customer.email || b.customer.phone).trim().toLowerCase()).filter(Boolean),
  );
  const repeatCustomers = top.filter((c) => c.trips > 1).length;
  const totalSpend = top.reduce((s, c) => s + c.totalSpend, 0);
  const avgSpend = top.length > 0 ? totalSpend / top.length : 0;
  const currency = bookings.find((b) => b.amount && b.paymentStatus === "paid")?.currency ?? "SEK";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Customer insights"
        description="Who books most often, who spends most and where they're going."
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Unique customers"
          value={formatNumber(uniqueCustomers.size)}
          accent="brand"
          icon={<UsersIcon />}
        />
        <KpiCard
          label="Repeat customers"
          value={formatNumber(repeatCustomers)}
          hint="Booked more than once"
          accent="purple"
          icon={<UsersIcon />}
        />
        <KpiCard
          label="Avg spend (top 12)"
          value={formatCurrency(avgSpend, currency)}
          accent="success"
          icon={<BadgeDollar />}
        />
        <KpiCard
          label="Trips per customer"
          value={
            uniqueCustomers.size > 0
              ? (bookings.length / uniqueCustomers.size).toFixed(1)
              : "—"
          }
          hint="Average across the period"
          accent="info"
          icon={<CarIcon />}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Top customers"
          description="Ranked by total paid spend."
          contentClassName="!p-0"
        >
          {top.length === 0 ? (
            <div className="px-5 py-6 sm:px-6">
              <EmptyState title="No customers yet" description="Customer rankings appear once payments come in." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 sm:px-6">Customer</th>
                    <th className="px-5 py-3 sm:px-6">Contact</th>
                    <th className="px-5 py-3 text-right sm:px-6">Trips</th>
                    <th className="px-5 py-3 text-right sm:px-6">Total spend</th>
                    <th className="px-5 py-3 sm:px-6">Last trip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {top.map((c, i) => (
                    <tr key={c.key} className="transition hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-purple-500 text-xs font-semibold text-white">
                            {initials(c.name)}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white/90">{c.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Rank #{i + 1}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 sm:px-6">
                        <p className="text-gray-700 dark:text-gray-200">{c.phone || "—"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.email || "—"}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-gray-900 dark:text-white/90 sm:px-6">
                        {c.trips}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-white/90 sm:px-6">
                        {formatCurrency(c.totalSpend, currency)}
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400 sm:px-6">
                        {formatDateTime(c.lastPickupAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Frequent destinations" description="Where customers travel most often.">
          {destinations.length === 0 ? (
            <EmptyState title="No destinations yet" />
          ) : (
            <ul className="space-y-3">
              {destinations.map((d) => {
                const max = Math.max(...destinations.map((x) => x.trips), 1);
                const pct = (d.trips / max) * 100;
                return (
                  <li key={d.destination}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate text-gray-700 dark:text-gray-200">{d.destination}</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{d.trips}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </section>
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
