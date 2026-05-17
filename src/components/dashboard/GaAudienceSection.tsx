import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  getGaAudienceSnapshot,
  type GaDemographicRow,
} from "@/services/ga4-audience";

function DemographicBarList({
  rows,
  emptyTitle = "No rows",
  emptyDescription,
}: {
  rows: readonly GaDemographicRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (rows.length === 0 || total === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={
          emptyDescription ??
          "No data for this dimension in the last 28 days. Traffic and device cards below still work without Google signals."
        }
      />
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex justify-between gap-2 text-sm">
            <span className="truncate text-gray-700 dark:text-gray-200">{r.label}</span>
            <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
              {r.value.toLocaleString()}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/6">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.min(100, (r.value / total) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function GaAudienceSection() {
  const snap = await getGaAudienceSnapshot();

  if (snap.status === "not_configured" || snap.status === "error") {
    return (
      <SectionCard
        title="Website audience (Google Analytics)"
        description="GA4 audience breakdown (demographics, country, traffic channel, device) — uses your configured measurement property when linked."
      >
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100/90">
          {snap.message}
        </div>
      </SectionCard>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white/90">Website audience</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {snap.propertyLabel} · {snap.dateRangeLabel} · active users (unless noted)
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Gender" description="Requires Google signals and enough returning traffic.">
          <DemographicBarList
            rows={snap.gender}
            emptyTitle="No gender breakdown"
            emptyDescription="Enable Google signals (GA4 → Admin → Data settings) and allow time for demographic modelling. Channel and device below do not need signals."
          />
        </SectionCard>
        <SectionCard title="Age" description="Age brackets when GA4 can report them.">
          <DemographicBarList
            rows={snap.age}
            emptyTitle="No age breakdown"
            emptyDescription="Same requirements as gender — signals plus volume in the reporting window."
          />
        </SectionCard>
        <SectionCard title="Country" description="Top countries by active users.">
          <DemographicBarList
            rows={snap.countries}
            emptyTitle="No country data"
            emptyDescription="No sessions with geo in this range yet, or data is still processing."
          />
        </SectionCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Traffic channel" description="Default channel grouping (sessions-style breakdown).">
          <DemographicBarList
            rows={snap.channels}
            emptyTitle="No channel data"
            emptyDescription="Channels appear once GA4 attributes sessions (small properties may see “Unassigned” only)."
          />
        </SectionCard>
        <SectionCard title="Device" description="Desktop, mobile and tablet.">
          <DemographicBarList
            rows={snap.devices}
            emptyTitle="No device data"
            emptyDescription="Device category is usually available as soon as you have page views."
          />
        </SectionCard>
      </div>
    </section>
  );
}
