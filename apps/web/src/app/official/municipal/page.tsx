import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PriorityRankingTable from "@/components/official/PriorityRankingTable";
import AnalyticsChart from "@/components/official/AnalyticsChart";

async function getMunicipalData(token: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        query GetMunicipalAnalytics {
          municipalOverview {
            totalReports
            resolvedCount
            unresolvedCount
            averagePriorityScore
            topHighPriorityIssues {
              id
              title
              category
              status
              priorityScore
            }
          }
          wardLevelAnalytics {
            district
            count
          }
          satisfactionTrends {
            period
            averageRating
          }
        }
      `,
    }),
    next: { revalidate: 60 } // Cache for 1 minute
  });

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL Errors:", json.errors);
    return null;
  }
  return json.data;
}

export default async function MunicipalDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Role check
  const role = (session.user as any)?.role;
  if (role !== "MUNICIPAL_ADMIN" && role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-10 shadow-xl">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-8">This portal is restricted to municipal administrators and verified government officials.</p>
          <a href="/dashboard" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const data = await getMunicipalData(session.user?.id || "");
  const overview = data?.municipalOverview || {
    totalReports: 0,
    resolvedCount: 0,
    unresolvedCount: 0,
    averagePriorityScore: 0,
    topHighPriorityIssues: []
  };

  const resolutionRate = overview.totalReports > 0
    ? (overview.resolvedCount / overview.totalReports) * 100
    : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Official Header */}
      <div className="bg-slate-900 text-white shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-10 blur-3xl -mr-20 -mt-20 rounded-full"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded">Government Portal</span>
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">v2.4 Intelligence</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">Municipal Administration</h1>
              <p className="text-slate-400 mt-2 font-medium max-w-lg">Integrated civic intelligence and infrastructure monitoring for optimized city services.</p>
            </div>
            <div className="mt-6 md:mt-0 flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Live Operations</p>
                <p className="text-sm font-bold text-emerald-400 flex items-center justify-end">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                  Connected to Local Node
                </p>
              </div>
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Caseload</p>
              <p className="text-3xl font-black text-white">{overview.totalReports}</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">+12% from last month</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Resolution Efficiency</p>
              <p className="text-3xl font-black text-white">{resolutionRate.toFixed(1)}%</p>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: `${resolutionRate}%` }}></div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mean Priority Index</p>
              <p className="text-3xl font-black text-blue-400">{overview.averagePriorityScore.toFixed(1)}</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold text-opacity-80">Critical Attention Req.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Active High Priority</p>
              <p className="text-3xl font-black text-red-400">{overview.topHighPriorityIssues.length}</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold">Requires Immediate Action</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Analytics Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trends Chart */}
            <AnalyticsChart
              title="Community Satisfaction Trends"
              data={data?.satisfactionTrends || []}
              xAxisKey="period"
              dataKey="averageRating"
              type="line"
              color="#3b82f6"
            />

            {/* Top Priority Table */}
            <PriorityRankingTable reports={overview.topHighPriorityIssues} />
          </div>

          {/* Secondary Analytics Column */}
          <div className="space-y-8">
            {/* Ward Distribution */}
            <AnalyticsChart
              title="Reports by Ward / District"
              data={data?.wardLevelAnalytics || []}
              xAxisKey="district"
              dataKey="count"
              type="bar"
              color="#8b5cf6"
            />

            {/* Operational Quick Actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Administrative Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition text-left flex items-center justify-between">
                  Generate Municipal Report (PDF)
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition text-left">
                  Configure Alerts & Thresholds
                </button>
                <button className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition text-left">
                  Manage Service Provider Access
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
