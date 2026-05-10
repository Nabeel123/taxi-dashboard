"use client";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  BOOKING_STATUSES,
  type BookingStatus,
  PAYMENT_STATUSES,
  type PaymentStatus,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  type Booking,
  type ServiceType,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/types/booking";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/dashboard/StatusBadge";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { formatCurrency, formatDate, formatDistance, formatTime, truncate } from "@/utils/format";
import { downloadCsv, rowsToCsv, type CsvColumn } from "@/utils/csv";

/**
 * Advanced bookings data table:
 * - Free-text search (name / email / phone / locations)
 * - Status, payment, service-type filters
 * - Date range filter (pickup date)
 * - Sortable columns
 * - Client-side pagination
 * - CSV export of the currently filtered set (not the whole page only)
 *
 * The component is fully client-side: rows are passed in once from a server component, then sorted
 * + filtered in memory. With <1k bookings this beats a network round-trip per filter change.
 */

type SortKey =
  | "pickupAt"
  | "createdAt"
  | "customer"
  | "amount"
  | "distance"
  | "status"
  | "payment"
  | "service";

type SortDir = "asc" | "desc";

interface BookingsTableProps {
  bookings: Booking[];
  /** Hide bulky controls when embedded in a constrained context (e.g. dashboard preview). */
  compact?: boolean;
  /** Cap rows per page; default 10. */
  pageSize?: number;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function BookingsTable({ bookings, compact = false, pageSize: initialPageSize = 10 }: BookingsTableProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("pickupAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59`).getTime() : null;

    return bookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (paymentFilter !== "all" && b.paymentStatus !== paymentFilter) return false;
      if (serviceFilter !== "all" && b.serviceType !== serviceFilter) return false;

      if (fromMs != null || toMs != null) {
        const pickupMs = new Date(b.pickupAt).getTime();
        if (fromMs != null && pickupMs < fromMs) return false;
        if (toMs != null && pickupMs > toMs) return false;
      }

      if (q.length > 0) {
        const hay = [
          b.customer.name,
          b.customer.email,
          b.customer.phone,
          b.pickupLocation,
          b.dropoffLocation ?? "",
          b.flightNumber ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, deferredSearch, statusFilter, paymentFilter, serviceFilter, from, to]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "pickupAt":
          return (new Date(a.pickupAt).getTime() - new Date(b.pickupAt).getTime()) * dir;
        case "createdAt":
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        case "customer":
          return a.customer.name.localeCompare(b.customer.name) * dir;
        case "amount":
          return ((a.amount ?? 0) - (b.amount ?? 0)) * dir;
        case "distance":
          return ((a.distanceKm ?? 0) - (b.distanceKm ?? 0)) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "payment":
          return a.paymentStatus.localeCompare(b.paymentStatus) * dir;
        case "service":
          return a.serviceType.localeCompare(b.serviceType) * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  /* Clamp current page when filters shrink the list. */
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const onSort = useCallback((key: SortKey) => {
    setSortDir((prevDir) => (key === sortKey ? (prevDir === "asc" ? "desc" : "asc") : "desc"));
    setSortKey(key);
  }, [sortKey]);

  const onSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const exportCsv = useCallback(() => {
    const columns: CsvColumn<Booking>[] = [
      { header: "Customer", get: (b) => b.customer.name },
      { header: "Email", get: (b) => b.customer.email },
      { header: "Phone", get: (b) => b.customer.phone },
      { header: "Pickup", get: (b) => b.pickupLocation },
      { header: "Dropoff", get: (b) => b.dropoffLocation ?? "" },
      { header: "Pickup Date", get: (b) => b.pickupDate },
      { header: "Pickup Time", get: (b) => b.pickupTime },
      { header: "Distance (km)", get: (b) => b.distanceKm ?? "" },
      { header: "Amount", get: (b) => b.amount ?? "" },
      { header: "Currency", get: (b) => b.currency },
      { header: "Service Type", get: (b) => SERVICE_TYPE_LABELS[b.serviceType] },
      { header: "Status", get: (b) => BOOKING_STATUS_LABELS[b.status] },
      { header: "Payment", get: (b) => PAYMENT_STATUS_LABELS[b.paymentStatus] },
      { header: "Flight", get: (b) => b.flightNumber ?? "" },
      { header: "Booking ID", get: (b) => b.id },
    ];
    const csv = rowsToCsv(sorted, columns);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`bookings-${stamp}.csv`, csv);
  }, [sorted]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {!compact && (
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 xl:flex-row xl:items-center xl:gap-4">
          {/* Row 1 on narrow viewports / left cluster on xl: search */}
          <div className="w-full xl:max-w-xs xl:flex-shrink-0">
            <SearchInput value={search} onChange={onSearch} />
          </div>

          {/* Row 2: filters + dates wrap freely so nothing overflows on tablets */}
          <div className="flex flex-wrap items-center gap-2 xl:flex-1 xl:justify-end">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v as BookingStatus | "all");
                setPage(1);
              }}
              options={[{ value: "all", label: "All status" }, ...BOOKING_STATUSES.map((s) => ({ value: s, label: BOOKING_STATUS_LABELS[s] }))]}
            />
            <FilterSelect
              label="Payment"
              value={paymentFilter}
              onChange={(v) => {
                setPaymentFilter(v as PaymentStatus | "all");
                setPage(1);
              }}
              options={[{ value: "all", label: "All payment" }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] }))]}
            />
            <FilterSelect
              label="Service"
              value={serviceFilter}
              onChange={(v) => {
                setServiceFilter(v as ServiceType | "all");
                setPage(1);
              }}
              options={[{ value: "all", label: "All services" }, ...SERVICE_TYPES.map((s) => ({ value: s, label: SERVICE_TYPE_LABELS[s] }))]}
            />
            <DateInput label="From" value={from} onChange={(v) => { setFrom(v); setPage(1); }} />
            <DateInput label="To" value={to} onChange={(v) => { setTo(v); setPage(1); }} />
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              <DownloadIcon />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50/60 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
            <tr>
              <Th onClick={() => onSort("customer")} active={sortKey === "customer"} dir={sortDir}>
                Customer
              </Th>
              <Th>Contact</Th>
              <Th>Pickup → Dropoff</Th>
              <Th onClick={() => onSort("pickupAt")} active={sortKey === "pickupAt"} dir={sortDir}>
                Pickup
              </Th>
              <Th onClick={() => onSort("distance")} active={sortKey === "distance"} dir={sortDir} className="text-right">
                Distance
              </Th>
              <Th onClick={() => onSort("amount")} active={sortKey === "amount"} dir={sortDir} className="text-right">
                Amount
              </Th>
              <Th onClick={() => onSort("service")} active={sortKey === "service"} dir={sortDir}>
                Service
              </Th>
              <Th onClick={() => onSort("status")} active={sortKey === "status"} dir={sortDir}>
                Status
              </Th>
              <Th onClick={() => onSort("payment")} active={sortKey === "payment"} dir={sortDir}>
                Payment
              </Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map((b) => (
              <tr key={b.id} className="transition hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                  <div className="font-medium text-gray-900 dark:text-white/90">{b.customer.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">#{b.id.slice(0, 8)}</div>
                </td>
                <td className="px-5 py-3 sm:px-6">
                  {b.customer.phone && (
                    <a href={`tel:${b.customer.phone}`} className="block text-gray-700 hover:text-brand-500 dark:text-gray-200">
                      {b.customer.phone}
                    </a>
                  )}
                  {b.customer.email && (
                    <a
                      href={`mailto:${b.customer.email}`}
                      className="block truncate text-xs text-gray-500 hover:text-brand-500 dark:text-gray-400"
                    >
                      {b.customer.email}
                    </a>
                  )}
                </td>
                <td className="px-5 py-3 sm:px-6">
                  <div className="max-w-[320px] truncate text-gray-700 dark:text-gray-200" title={b.pickupLocation}>
                    {truncate(b.pickupLocation, 48)}
                  </div>
                  {b.dropoffLocation && (
                    <div className="max-w-[320px] truncate text-xs text-gray-500 dark:text-gray-400" title={b.dropoffLocation}>
                      → {truncate(b.dropoffLocation, 48)}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                  <div className="text-gray-700 dark:text-gray-200">{formatDate(b.pickupAt)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{formatTime(b.pickupAt)}</div>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-gray-700 dark:text-gray-200 sm:px-6">
                  {formatDistance(b.distanceKm)}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right font-medium text-gray-900 dark:text-white/90 sm:px-6">
                  {b.amount != null ? formatCurrency(b.amount, b.currency) : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-gray-700 dark:text-gray-200 sm:px-6">
                  {SERVICE_TYPE_LABELS[b.serviceType]}
                </td>
                <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                  <BookingStatusBadge status={b.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 sm:px-6">
                  <PaymentStatusBadge status={b.paymentStatus} />
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right sm:px-6">
                  <Link
                    href={`/bookings/${b.id}`}
                    className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="px-5 py-8 sm:px-6">
            <EmptyState
              title="No bookings match your filters"
              description="Try clearing filters or widening the date range."
            />
          </div>
        )}
      </div>

      {!compact && sorted.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-700 dark:text-gray-200">{start + 1}</span>–
            <span className="font-medium text-gray-700 dark:text-gray-200">{Math.min(start + pageSize, sorted.length)}</span>
            {" "}of{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{sorted.length}</span> bookings
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Rows
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <PaginationButton onClick={() => setPage(1)} disabled={currentPage === 1}>
              «
            </PaginationButton>
            <PaginationButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
              ‹
            </PaginationButton>
            <span className="px-2 text-xs text-gray-500 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <PaginationButton
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              ›
            </PaginationButton>
            <PaginationButton onClick={() => setPage(totalPages)} disabled={currentPage === totalPages}>
              »
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: SortDir;
  className?: string;
}) {
  if (!onClick) {
    return <th scope="col" className={`px-5 py-3 sm:px-6 ${className ?? ""}`}>{children}</th>;
  }
  return (
    <th scope="col" className={`px-5 py-3 sm:px-6 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition ${
          active ? "text-gray-900 dark:text-white" : "hover:text-gray-700 dark:hover:text-gray-200"
        }`}
      >
        {children}
        <span aria-hidden className="text-[10px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function PaginationButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 transition enabled:hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:enabled:hover:bg-white/[0.04]"
    >
      {children}
    </button>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder="Search by name, email, phone, location..."
        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 transition focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:placeholder:text-gray-500"
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <span className="hidden sm:inline">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none dark:text-gray-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none dark:text-gray-200"
      />
    </label>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
