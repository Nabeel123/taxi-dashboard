"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface GaActiveUsersChartPoint {
  date: string;
  activeUsers: number;
  sessions: number;
}

interface GaActiveUsersChartProps {
  data: readonly GaActiveUsersChartPoint[];
  height?: number;
}

/** Daily GA4 `activeUsers` and `sessions` per calendar day (property reporting timezone). */
export function GaActiveUsersChart({ data, height = 280 }: GaActiveUsersChartProps) {
  const { options, series } = useMemo(() => {
    const categories = data.map((p) => p.date);
    const users = data.map((p) => Math.round(p.activeUsers));
    const sessions = data.map((p) => Math.round(p.sessions));

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
      yaxis: [
        {
          labels: {
            style: { colors: "#94a3b8" },
            formatter: (v: number) => Math.round(v).toLocaleString(),
          },
          title: { text: "Active users", style: { color: "#94a3b8", fontSize: "11px" } },
        },
        {
          opposite: true,
          labels: {
            style: { colors: "#94a3b8" },
            formatter: (v: number) => Math.round(v).toLocaleString(),
          },
          title: { text: "Sessions", style: { color: "#94a3b8", fontSize: "11px" } },
        },
      ],
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        labels: { colors: "#94a3b8" },
      },
      tooltip: {
        x: { format: "dd MMM yyyy" },
        y: [
          { formatter: (v: number) => `${Math.round(v).toLocaleString()} users` },
          { formatter: (v: number) => `${Math.round(v).toLocaleString()} sessions` },
        ],
      },
      markers: { size: 0, hover: { size: 5 } },
    };

    return {
      options: opts,
      series: [
        { name: "Active users", type: "area", data: users },
        { name: "Sessions", type: "area", data: sessions },
      ],
    };
  }, [data, height]);

  return <Chart options={options} series={series} type="area" height={height} />;
}
