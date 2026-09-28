"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface AnalyticsChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  title: string;
  type?: "line" | "bar";
  color?: string;
}

export default function AnalyticsChart({
  data,
  dataKey,
  xAxisKey,
  title,
  type = "line",
  color = "#3b82f6",
}: AnalyticsChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[300px] flex items-center justify-center">
        <p className="text-sm text-slate-400 animate-pulse">Loading visualization...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">{title}</h4>
      <div className="w-full h-[300px]">
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-lg">
            <p className="text-xs text-slate-400 italic">No trend data available.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey={xAxisKey}
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} name={title} />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey={xAxisKey}
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none" }}
                  labelStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                  itemStyle={{ color: "#3b82f6" }}
                />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  name={title}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
