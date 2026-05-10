"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface DistanceChartProps {
  data: readonly { bin: string; trips: number }[];
  height?: number;
}

export function DistanceChart({ data, height = 240 }: DistanceChartProps) {
  const { options, series } = useMemo(() => {
    const opts: ApexOptions = {
      chart: { type: "bar", fontFamily: "Outfit, sans-serif", toolbar: { show: false } },
      colors: ["#12b76a"],
      plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", borderRadiusApplication: "end" } },
      dataLabels: { enabled: false },
      grid: { borderColor: "rgba(148,163,184,0.15)", strokeDashArray: 4, xaxis: { lines: { show: false } } },
      xaxis: {
        categories: data.map((d) => `${d.bin} km`),
        labels: { style: { colors: "#94a3b8" } },
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
