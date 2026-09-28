"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ShieldCheck,
  ChevronRight,
  Target
} from "lucide-react";

export default function ScorecardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      if (status !== "authenticated") return;

      setLoading(true);
      try {
        const res = await fetch("http://localhost:4000/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.user?.id}`,
          },
          body: JSON.stringify({
            query: `
              query GetScorecard {
                accountabilityScorecard {
                  overallMetrics {
                    avgResponseTimeHours
                    avgResolutionTimeHours
                    openIssues
                    resolvedIssues
                    resolutionPercentage
                  }
                  departmentMetrics {
                    department
                    metrics {
                      avgResponseTimeHours
                      avgResolutionTimeHours
                      resolutionPercentage
                    }
                    satisfactionScore
                  }
                }
                emergingTrends {
                  category
                  description
                  confidence
                  tags
                }
              }
            `,
          }),
        });

        const json = await res.json();
        if (json.data) {
          setData(json.data.accountabilityScorecard);
          setTrends(json.data.emergingTrends);
        }
      } catch (err) {
        console.error("Failed to fetch scorecard data", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [status, session?.user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Analyzing Civic Performance...</p>
        </div>
      </div>
    );
  }

  const { overallMetrics, departmentMetrics } = data || {
    overallMetrics: { avgResponseTimeHours: 0, avgResolutionTimeHours: 0, openIssues: 0, resolvedIssues: 0, resolutionPercentage: 0 },
    departmentMetrics: []
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Transparency Portal</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Civic Accountability Scorecard</h1>
              <p className="text-slate-500 mt-2 text-lg max-w-2xl">
                Real-time tracking of municipal performance, department responsiveness, and emerging community priorities.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center space-x-6 shadow-inner">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Overall Grade</p>
                <p className="text-3xl font-black text-emerald-600">A-</p>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Data Integrity</p>
                <p className="text-sm font-bold text-slate-700">99.8%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-12">

        {/* Civic Performance Grid */}
        <section>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
            <Target className="w-4 h-4 mr-2" />
            Municipality Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              label="Avg. Response Time"
              value={`${overallMetrics.avgResponseTimeHours.toFixed(1)}h`}
              icon={<Clock className="w-6 h-6 text-blue-600" />}
              subtext="Time to first acknowledgement"
              trend="+4% from last month"
              trendUp={false}
            />
            <MetricCard
              label="Avg. Resolution"
              value={`${overallMetrics.avgResolutionTimeHours.toFixed(1)}h`}
              icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
              subtext="Time to complete verified fix"
              trend="-12% from last month"
              trendUp={true}
            />
            <MetricCard
              label="Resolution Rate"
              value={`${overallMetrics.resolutionPercentage.toFixed(1)}%`}
              icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
              subtext="Reports resolved vs. submitted"
              trend="+2.4% vs city goal"
              trendUp={true}
            />
            <MetricCard
              label="Active Caseload"
              value={overallMetrics.openIssues}
              icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
              subtext="Current reports in progress"
              trend="-8 since yesterday"
              trendUp={true}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Department Accountability Table */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Department Accountability</h2>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Response Speed</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Resolution %</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">CSAT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {departmentMetrics.map((dept: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900">{dept.department}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="text-sm text-slate-700 font-medium mr-2">{dept.metrics.avgResponseTimeHours.toFixed(1)}h</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${Math.max(10, 100 - (dept.metrics.avgResponseTimeHours * 2))}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                          {dept.metrics.resolutionPercentage.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                            {dept.satisfactionScore.toFixed(1)} / 5.0
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Trend Watch */}
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">AI Trend Watch</h2>
            <div className="space-y-4">
              {trends.map((trend, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp className="w-12 h-12 text-blue-600" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded">
                      {trend.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {(trend.confidence * 100).toFixed(0)}% AI Confidence
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 leading-tight">{trend.description}</h3>
                  <div className="flex flex-wrap gap-2">
                    {trend.tags.map((tag: string, j: number) => (
                      <span key={j} className="text-[10px] text-slate-500 font-medium">#{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
              {trends.length === 0 && (
                <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-xs text-slate-400 font-medium italic">Scanning for emerging civic trends...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, subtext, trend, trendUp }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
        <div className={`flex items-center text-[10px] font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-2 font-medium">{subtext}</p>
      </div>
    </div>
  );
}
