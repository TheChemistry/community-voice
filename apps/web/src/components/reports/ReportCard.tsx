"use client";

import Link from "next/link";

interface MediaAttachment {
  url: string;
  mimeType: string;
}

interface CivicReport {
  id: string;
  title: string;
  category: string;
  status: string;
  priorityScore: number;
  aiAssistant?: {
    reportSummary: string;
  };
  attachments: MediaAttachment[];
  createdAt: string;
}

interface ReportCardProps {
  report: CivicReport;
}

export default function ReportCard({ report }: ReportCardProps) {
  const isHighPriority = report.priorityScore > 75;
  const hasEvidence = report.attachments.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      {/* Top Status Bar */}
      <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
          report.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-700' :
          report.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {report.status}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          {new Date(report.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col space-y-3">
        {/* Title & Category */}
        <div>
          <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{report.title}</h3>
          <p className="text-xs font-semibold text-blue-600">{report.category}</p>
        </div>

        {/* AI Summary Snippet */}
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed italic">
          {report.aiAssistant?.reportSummary || "AI Analysis pending for this evidence block..."}
        </p>

        {/* Evidence & Priority Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {isHighPriority && (
            <span className="flex items-center px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-bold border border-red-100">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              HIGH PRIORITY ({report.priorityScore})
            </span>
          )}
          {hasEvidence && (
            <span className="flex items-center px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              EVIDENCE VALIDATED
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
        <Link
          href={`/reports/${report.id}`}
          className="w-full flex items-center justify-center py-2 bg-white border border-slate-200 rounded-md text-sm font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
        >
          View Case Intelligence
        </Link>
      </div>
    </div>
  );
}
