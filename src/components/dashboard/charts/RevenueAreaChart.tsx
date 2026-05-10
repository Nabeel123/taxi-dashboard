"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { DailySeriesPoint } from "@/services/analytics";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface RevenueAreaChartProps {
  data: readonly DailySeriesPoint[];
  currency?: string;
  height?: number;
}

/**
 * Stacked-area dual series: revenue (left axis) + trip count (right axis) over a daily window.
 * Both series share the X axis so anomalies (high trips, low revenue) jump out visually.
 */
export function RevenueAreaChart({ data, currency = "SEK", height = 280 }: RevenueAreaChartProps) {
  const { options, series } = useMemo(() => {
    const categories = data.map((p) => p.date);
    const revenue = data.map((p) => Math.round(p.revenue));
    const trips = data.map((p) => p.trips);
    /* Find the first future bucket so we can drop a "today" guideline at that boundary. */
    const todayBoundary = data.find((p) => p.isFuture)?.date;

    const opts: ApexOptions = {
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "area",
        height,
        toolbar: { show: false },
        animations: { speed: 350 },
      },
      colors: ["#465fff", "#12b76a"],
      stroke: { curve: "smooth", width: [2, 2] },
      fill: {
        type: "gradient",
        gradient: { opacityFrom: 0.45, opacityTo: 0, stops: [0, 100] },
      },
      dataLabels: { enabled: false },
      grid: {
        borderColor: "rgba(148,163,184,0.15)",
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
      },
      xaxis: {
        categories,
        type: "datetime",
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: "#94a3b8" } },
      },
      annotations: todayBoundary
        ? {
            xaxis: [
              {
                x: new Date(todayBoundary).getTime(),
                strokeDashArray: 4,
                borderColor: "#94a3b8",
                label: {
                  text: "Today",
                  borderColor: "#94a3b8",
                  style: { color: "#fff", background: "#94a3b8", fontSize: "10px" },
                  orientation: "horizontal",
                },
              },
            ],
          }
        : undefined,
      yaxis: [
        {
          labels: {
            style: { colors: "#94a3b8" },
            formatter: (v: number) => `${Math.round(v)} ${currency}`,
          },
        },
        {
          opposite: true,
          labels: {
            style: { colors: "#94a3b8" },
            formatter: (v: number) => String(Math.round(v)),
          },
        },
      ],
      legend: { show: true, position: "top", horizontalAlign: "right", labels: { colors: "#94a3b8" } },
      tooltip: {
        x: { format: "dd MMM yyyy" },
        y: [
          { formatter: (v: number) => `${Math.round(v).toLocaleString()} ${currency}` },
          { formatter: (v: number) => `${Math.round(v)} trips` },
        ],
      },
      markers: { size: 0, hover: { size: 5 } },
    };

    return {
      options: opts,
      series: [
        { name: "Revenue", type: "area", data: revenue },
        { name: "Trips", type: "area", data: trips },
      ],
    };
  }, [data, currency, height]);

  return <Chart options={options} series={series} type="area" height={height} />;
}
