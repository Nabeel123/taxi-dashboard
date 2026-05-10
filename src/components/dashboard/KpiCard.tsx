import React from "react";

export interface KpiCardProps {
  label: string;
  value: string;
  /**
   * Optional secondary text shown under the value (e.g. "+12% vs last week", "across 23 trips").
   * Pass a `tone` to color it appropriately.
   */
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
  icon?: React.ReactNode;
  /** Optional iconography accent color — kept distinct from `tone` for the hint copy. */
  accent?: "brand" | "success" | "warning" | "info" | "purple";
}

const ACCENT_BG: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-300",
  info: "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300",
};

const TONE_TEXT: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  neutral: "text-gray-500 dark:text-gray-400",
  positive: "text-success-600 dark:text-success-400",
  negative: "text-error-500 dark:text-error-400",
};

export function KpiCard({ label, value, hint, tone = "neutral", icon, accent = "brand" }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white/90">
            {value}
          </p>
          {hint && (
            <p className={`mt-1 text-xs font-medium ${TONE_TEXT[tone]}`}>{hint}</p>
          )}
        </div>
        {icon && (
          <div
            aria-hidden
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${ACCENT_BG[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
