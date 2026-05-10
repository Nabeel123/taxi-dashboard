/**
 * Locale-aware formatters. SSR safe — never depend on browser timezone implicitly;
 * the dashboard is operated from Sweden so `sv-SE` defaults yield consistent output
 * server- and client-side.
 */

const DEFAULT_LOCALE = "sv-SE";

const numberFormatters = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts);
  let f = numberFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    numberFormatters.set(key, f);
  }
  return f;
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "SEK",
  locale = DEFAULT_LOCALE,
): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return getNumberFormatter(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined, locale = DEFAULT_LOCALE): string {
  if (value == null || Number.isNaN(value)) return "—";
  return getNumberFormatter(locale, { maximumFractionDigits: 1 }).format(value);
}

export function formatDistance(km: number | null | undefined, locale = DEFAULT_LOCALE): string {
  if (km == null || Number.isNaN(km)) return "—";
  return `${getNumberFormatter(locale, { maximumFractionDigits: 1 }).format(km)} km`;
}

export function formatDate(iso: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "2-digit" });
}

export function formatTime(iso: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string | Date | null | undefined, locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  return `${formatDate(iso, locale)} · ${formatTime(iso, locale)}`;
}

/** ISO date key (YYYY-MM-DD) — useful as a stable group-by key for daily charts. */
export function dateKey(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Human friendly relative time ("in 2h", "5 min ago"). */
export function formatRelative(target: Date, now: Date = new Date()): string {
  const diffMs = target.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(diffMs / 60_000);
  const hours = Math.round(diffMs / 3_600_000);
  const days = Math.round(diffMs / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < 60_000) return diffMs >= 0 ? "in a moment" : "just now";
  if (abs < 3_600_000) return rtf.format(minutes, "minute");
  if (abs < 86_400_000) return rtf.format(hours, "hour");
  return rtf.format(days, "day");
}

export function truncate(s: string | null | undefined, max = 32): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
