import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/dashboard/StatusBadge";
import { getBookingById } from "@/services/bookings";
import {
  formatCurrency,
  formatDateTime,
  formatDistance,
  formatDate,
  formatTime,
} from "@/utils/format";
import { SERVICE_TYPE_LABELS } from "@/types/booking";

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BookingDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Booking ${id.slice(0, 8)}` };
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Booking · ${booking.customer.name}`}
        description={`Created ${formatDateTime(booking.createdAt)}`}
        actions={
          <Link
            href="/bookings"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            ← All bookings
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Trip" description="Route, schedule and trip parameters.">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Pickup">{booking.pickupLocation}</Field>
            <Field label="Dropoff">{booking.dropoffLocation ?? "—"}</Field>
            <Field label="Pickup date">{formatDate(booking.pickupAt)}</Field>
            <Field label="Pickup time">{formatTime(booking.pickupAt)}</Field>
            <Field label="Service">{SERVICE_TYPE_LABELS[booking.serviceType]}</Field>
            <Field label="Distance">{formatDistance(booking.distanceKm)}</Field>
            <Field label="Passengers">{booking.passengers ?? "—"}</Field>
            <Field label="Flight number">{booking.flightNumber ?? "—"}</Field>
          </dl>

          {booking.message && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Special note
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{booking.message}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Status & payment">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Booking status
              </p>
              <div className="mt-2">
                <BookingStatusBadge status={booking.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Payment
              </p>
              <div className="mt-2 flex items-center gap-3">
                <PaymentStatusBadge status={booking.paymentStatus} />
                <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
                  {booking.amount != null ? formatCurrency(booking.amount, booking.currency) : "—"}
                </span>
              </div>
              {booking.packageLabel && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{booking.packageLabel}</p>
              )}
              {booking.paymentIntentId && (
                <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">
                  Stripe PI: <code>{booking.paymentIntentId}</code>
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="Customer">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Name">{booking.customer.name}</Field>
            <Field label="Email">
              {booking.customer.email ? (
                <a href={`mailto:${booking.customer.email}`} className="text-brand-500 hover:underline">
                  {booking.customer.email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Phone">
              {booking.customer.phone ? (
                <a href={`tel:${booking.customer.phone}`} className="text-brand-500 hover:underline">
                  {booking.customer.phone}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Locale">{booking.locale ?? "—"}</Field>
          </dl>
        </SectionCard>

        <SectionCard title="Identifiers">
          <dl className="space-y-3 text-sm">
            <Field label="Booking ID">
              <code className="break-all text-xs text-gray-700 dark:text-gray-300">{booking.id}</code>
            </Field>
            <Field label="Completion kind">{booking.completionKind ?? "—"}</Field>
            <Field label="Created at">{formatDateTime(booking.createdAt)}</Field>
          </dl>
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
