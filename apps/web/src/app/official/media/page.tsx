import { auth } from "@/auth";
import { redirect } from "next/navigation";
import IssueMap from "@/components/maps/IssueMap";
import PriorityRankingTable from "@/components/official/PriorityRankingTable";

async function getMediaDashboardData(token: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        query GetMediaDashboardData {
          dashboardStats {
            totalReports
            resolvedIssues
            highPriorityIssues
          }
          trendingCategories {
            category
            count
          }
          municipalOverview {
            topHighPriorityIssues {
              id
              title
              category
              status
              priorityScore
            }
          }
          listReports {
            id
            title
            category
            priorityScore
            status
            latitude
            longitude
          }
        }
      `,
    }),
    next: { revalidate: 30 }
  });

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL Errors:", json.errors);
    return null;
  }
  return json.data;
}

export default async function MediaDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Role check: allow JOURNALIST, MUNICIPAL_ADMIN, and SUPER_ADMIN
  const role = (session.user as any)?.role;
  if (role !== "JOURNALIST" && role !== "MUNICIPAL_ADMIN" && role !== "SUPER_ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-10 shadow-xl">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Journalist Verification Required</h1>
          <p className="text-slate-500 mb-8">Access to the High-Priority Hotspot Map and Media Analytics feed is restricted to verified news organizations and accredited press entities.</p>
          <a href="/dashboard" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition">
            Go to Main Dashboard
          </a>
        </div>
      </div>
    );
  }

  const data = await getMediaDashboardData(session.user?.id || "");
  const stats = data?.dashboardStats || { totalReports: 0, resolvedIssues: 0, highPriorityIssues: 0 };
  const trending = data?.trendingCategories || [];
  const mapReports = data?.listReports || [];
  const topIssues = data?.municipalOverview?.topHighPriorityIssues || [];

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Media Portal Header */}
      <div className="bg-blue-950 text-white border-b border-blue-900 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2 py-0.5 bg-red-600 text-[10px] font-black uppercase tracking-widest rounded animate-pulse">Press Access</span>
                <span className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Public Information Network</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-100">Civic Media & Journalism Center</h1>
              <p className="text-blue-200 mt-1 text-sm max-w-xl">Investigating community developments, hot spots, and civic verification validation indices.</p>
            </div>
            <div className="mt-4 md:mt-0 bg-blue-900/40 border border-blue-800 rounded-xl px-4 py-3 text-right">
              <p className="text-[10px] font-bold text-blue-300 uppercase">Verification Feed</p>
              <p className="text-xs text-slate-300 mt-1">Sourced from decentralized community evidence uploads.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Trending Topics & Stats */}
          <div className="space-y-8 lg:col-span-1">
            {/* Quick Metrics */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Investigative Indicators</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-medium text-slate-600">Total Sourced Issues</span>
                  <span className="text-lg font-black text-slate-900">{stats.totalReports}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm font-medium text-slate-600">High Priority Incidents</span>
                  <span className="text-lg font-black text-red-600">{stats.highPriorityIssues}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Resolution Rate</span>
                  <span className="text-lg font-black text-emerald-600">
                    {stats.totalReports > 0 ? ((stats.resolvedIssues / stats.totalReports) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Trending Public Topics</h3>
              <div className="space-y-3">
                {trending.length > 0 ? (
                  trending.map((t: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                        <span className="text-sm font-bold text-slate-700">{t.category}</span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 bg-blue-50 text-blue-700 font-black rounded-full border border-blue-100">
                        {t.count} reports
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No trending topics computed.</p>
                )}
              </div>
            </div>

            {/* Editorial Quick Tips */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-xs text-slate-500 space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider">Editorial Guidelines</h4>
              <p>Reports listed with a Priority Index above 75 indicate widespread community distress or critical infrastructural degradation.</p>
              <p>Cross-reference S3 attachments and AI summaries on the detail inspection pages before publication.</p>
            </div>
          </div>

          {/* Right Column: Hotspots Map & Top Stories */}
          <div className="lg:col-span-2 space-y-8">
            {/* Map Hotspots Container */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">High Priority Map Hotspots</h3>
                <p className="text-xs text-slate-400 mt-0.5">Geospatial density of active public complaints cluster maps.</p>
              </div>
              <div className="h-[450px]">
                <IssueMap reports={mapReports} mapboxToken={mapboxToken} />
              </div>
            </div>

            {/* Priority ranking feed */}
            <PriorityRankingTable reports={topIssues} title="Press Priority Queue" />
          </div>

        </div>
      </div>
    </div>
  );
}
