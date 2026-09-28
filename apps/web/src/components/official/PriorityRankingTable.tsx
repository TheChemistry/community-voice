import React from "react";
import Link from "next/link";

interface CivicReport {
  id: string;
  title: string;
  category: string;
  priorityScore: number;
  status: string;
}

interface PriorityRankingTableProps {
  reports: CivicReport[];
  title?: string;
}

export default function PriorityRankingTable({
  reports,
  title = "High Priority Evidence Reports",
}: PriorityRankingTableProps) {
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "RESOLVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "ACCEPTED":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "UNDER_REVIEW":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return "text-red-600 font-black";
    if (score >= 50) return "text-amber-600 font-bold";
    return "text-blue-600 font-medium";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 uppercase">
          Top {reports.length} Ranked
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Title</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority Index</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.length > 0 ? (
              reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition duration-150">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{report.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500 font-medium">{report.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm ${getPriorityColor(report.priorityScore)}`}>
                        {report.priorityScore.toFixed(1)}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className={`h-full ${
                            report.priorityScore >= 80
                              ? "bg-red-500"
                              : report.priorityScore >= 50
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                          style={{ width: `${Math.min(100, report.priorityScore)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wide ${getStatusStyle(
                        report.status
                      )}`}
                    >
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      Inspect Details
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                  No priority reports found in the current tracking period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
