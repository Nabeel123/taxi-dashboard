"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { ServiceBreakdown } from "@/services/analytics";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PALETTE = ["#465fff", "#12b76a", "#f97316", "#a855f7", "#0ea5e9"];

export function ServiceTypeChart({ data, height = 260 }: { data: readonly ServiceBreakdown[]; height?: number }) {
  const { options, series } = useMemo(() => {
    const labels = data.map((d) => d.label);
    const counts = data.map((d) => d.count);
    const opts: ApexOptions = {
      chart: { type: "donut", fontFamily: "Outfit, sans-serif" },
      labels,
      colors: PALETTE,
      legend: { position: "bottom", labels: { colors: "#94a3b8" } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          donut: {
            size: "72%",
            labels: {
              show: true,
              name: { show: true, color: "#94a3b8" },
              value: {
                show: true,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#0f172a",
                formatter: (v: string) => v,
              },
              total: {
                show: true,
                label: "Total trips",
                color: "#94a3b8",
                formatter: () => `${counts.reduce((s, n) => s + n, 0)}`,
              },
            },
          },
        },
      },
      tooltip: {
        y: { formatter: (v: number) => `${v} trips` },
      },
    };
    return { options: opts, series: counts };
  }, [data]);

  return <Chart options={options} series={series} type="donut" height={height} />;
}
