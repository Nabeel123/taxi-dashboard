"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import type { DailySeriesPoint } from "@/services/analytics";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function TripsBarChart({ data, height = 220 }: { data: readonly DailySeriesPoint[]; height?: number }) {
  const { options, series } = useMemo(() => {
    const todayBoundary = data.find((d) => d.isFuture)?.date;
    /* Tint the future bars so users can immediately tell scheduled vs realised trips. */
    const palette = data.map((d) => (d.isFuture ? "#c084fc" : "#a855f7"));

    const opts: ApexOptions = {
      chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
      colors: ["#a855f7"],
      plotOptions: {
        bar: {
          borderRadius: 3,
          columnWidth: "50%",
          borderRadiusApplication: "end",
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4, xaxis: { lines: { show: false } } },
      legend: { show: false },
      xaxis: {
        type: "datetime",
        categories: data.map((d) => d.date),
        labels: { style: { colors: "#94a3b8" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: (v: number) => String(Math.round(v)) } },
      tooltip: { x: { format: "dd MMM yyyy" }, y: { formatter: (v: number) => `${v} trips` } },
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
                },
              },
            ],
          }
        : undefined,
    };
    return {
      options: opts,
      series: [{ name: "Trips", data: data.map((d, i) => ({ x: d.date, y: d.trips, fillColor: palette[i] })) }],
    };
  }, [data]);
  return <Chart options={options} series={series} type="bar" height={height} />;
}
