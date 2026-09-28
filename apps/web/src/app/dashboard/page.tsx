import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportCard from "@/components/reports/ReportCard";

async function getDashboardData(token: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        query GetDashboardData {
          dashboardStats {
            totalReports
            resolvedIssues
            highPriorityIssues
          }
          trendingCategories {
            category
            count
          }
          listReports {
            id
            title
            category
            status
            priorityScore
            createdAt
            attachments {
              url
            }
            aiAssistant {
              reportSummary
            }
          }
          watchlist {
            id
            title
            category
            status
            priorityScore
            createdAt
            attachments {
              url
            }
          }
        }
      `,
    }),
    next: { revalidate: 0 } // No cache for dashboard
  });

  const json = await res.json();
  return json.data;
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const data = await getDashboardData(session.user?.id || "");
  const { dashboardStats, trendingCategories, listReports, watchlist } = data || {
    dashboardStats: { totalReports: 0, resolvedIssues: 0, highPriorityIssues: 0 },
    trendingCategories: [],
    listReports: [],
    watchlist: []
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header & Stats Banner */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Civic Intelligence Dashboard</h1>
              <p className="text-slate-500 mt-1">Real-time community health monitoring and evidence validation.</p>
            </div>
            <Link
              href="/reports/new"
              className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition transform active:scale-95"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Report New Issue
            </Link>
          </div>

          {/* Civic Health Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Reports</p>
                <p className="text-2xl font-black text-slate-900">{dashboardStats.totalReports}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Resolved Issues</p>
                <p className="text-2xl font-black text-slate-900">{dashboardStats.resolvedIssues}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">High Priority</p>
                <p className="text-2xl font-black text-slate-900">{dashboardStats.highPriorityIssues}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

          {/* Sidebar: Trending & Filters */}
          <div className="lg:col-span-1 space-y-8">
            {/* Trending Categories */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Trending Categories
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                {trendingCategories.length > 0 ? trendingCategories.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 font-medium">{c.category}</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{c.count}</span>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400 italic">No trending data yet.</p>
                )}
              </div>
            </div>

            {/* Your Watchlist */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                <svg className="w-4 h-4 mr-2 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Your Watchlist
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                {watchlist && watchlist.length > 0 ? watchlist.map((w: any) => (
                  <Link key={w.id} href={`/reports/${w.id}`} className="block group">
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition truncate">{w.title}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium uppercase">{w.category}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          w.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {w.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <p className="text-xs text-slate-400 italic py-2">No reports on your watchlist yet.</p>
                )}
              </div>
            </div>

            {/* Quick Filters Placeholder */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Filters</h3>
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Status</label>
                  <select className="w-full text-sm bg-transparent border-none focus:ring-0 text-slate-700 font-semibold p-0">
                    <option>All Statuses</option>
                    <option>Submitted</option>
                    <option>Under Review</option>
                    <option>Accepted</option>
                    <option>Resolved</option>
                  </select>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Category</label>
                  <select className="w-full text-sm bg-transparent border-none focus:ring-0 text-slate-700 font-semibold p-0">
                    <option>All Categories</option>
                    <option>Infrastructure</option>
                    <option>Utilities</option>
                    <option>Safety</option>
                    <option>Environment</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed: Report Cards */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6">Recent Evidence Reports</h3>

            {listReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listReports.map((report: any) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-20 flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-6">
                  <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">No civic reports found</h4>
                <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">
                  Start by documenting local issues with evidence to populate your dashboard and gather community support.
                </p>
                <Link
                  href="/reports/new"
                  className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition shadow-md"
                >
                  Create Your First Report
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
