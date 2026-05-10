import React from "react";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionCard({ title, description, action, children, className, contentClassName }: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${
        className ?? ""
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white/90">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div className={`px-5 pb-5 pt-4 sm:px-6 sm:pb-6 ${contentClassName ?? ""}`}>{children}</div>
    </section>
  );
}
