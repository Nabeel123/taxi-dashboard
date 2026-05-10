import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";

export const metadata: Metadata = {
  title: "Account",
  description: "Workspace preferences and integrations.",
};

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Account & integrations"
        description="Workspace settings — operator details, integrations and API access."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Operator" description="Identity used across the dispatch dashboard.">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Workspace">Arlanda Taxi</Field>
            <Field label="Region">Stockholm, Sweden</Field>
            <Field label="Currency">SEK</Field>
            <Field label="Timezone">Europe/Stockholm</Field>
          </dl>
        </SectionCard>

        <SectionCard title="Integrations" description="Live integrations powering this dashboard.">
          <ul className="space-y-3 text-sm">
            <Integration name="Supabase" status="Bookings source · booking_form_snapshots view" />
            <Integration name="Stripe" status="Payment intents linked from completion_kind = stripe_paid" />
            <Integration name="Google Maps" status="Used by the customer app for distance + autocomplete" />
            <Integration name="Resend" status="Transactional email delivery" />
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 dark:text-gray-200">{children}</dd>
    </div>
  );
}

function Integration({ name, status }: { name: string; status: string }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <div>
        <p className="font-medium text-gray-900 dark:text-white/90">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{status}</p>
      </div>
      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">
        Connected
      </span>
    </li>
  );
}
