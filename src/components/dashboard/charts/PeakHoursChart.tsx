"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface PeakHoursChartProps {
  data: readonly { hour: number; trips: number }[];
  height?: number;
}

export function PeakHoursChart({ data, height = 240 }: PeakHoursChartProps) {
  const { options, series } = useMemo(() => {
    const opts: ApexOptions = {
      chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
      colors: ["#465fff"],
      plotOptions: { bar: { borderRadius: 4, columnWidth: "60%", borderRadiusApplication: "end" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4, xaxis: { lines: { show: false } } },
      xaxis: {
        categories: data.map((d) => `${String(d.hour).padStart(2, "0")}:00`),
        labels: { style: { colors: "#94a3b8" }, rotate: 0, hideOverlappingLabels: true },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: "#94a3b8" }, formatter: (v: number) => String(Math.round(v)) } },
      tooltip: { y: { formatter: (v: number) => `${v} trips` } },
    };
    return {
      options: opts,
      series: [{ name: "Trips", data: data.map((d) => d.trips) }],
    };
  }, [data]);

  return <Chart options={options} series={series} type="bar" height={height} />;
}
