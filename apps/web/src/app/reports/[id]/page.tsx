"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ReportAssistant from "@/components/reports/ReportAssistant";
import {
  Star,
  Eye,
  CheckCircle2,
  Clock,
  User,
  MessageSquare,
  Camera,
  Upload,
  X,
  AlertCircle
} from "lucide-react";

interface MediaAttachment {
  id: string;
  url: string;
  s3Key: string;
}

interface GovernmentResponse {
  id: string;
  content: string;
  officialId: string;
  statusChange: string;
  createdAt: string;
}

interface ResolutionVerification {
  id: string;
  afterPhotoKey: string;
  comment: string;
  createdAt: string;
}

interface CivicReport {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priorityScore: number;
  latitude: number;
  longitude: number;
  isWatched: boolean;
  createdAt: string;
  acknowledgedAt?: string;
  assignedAt?: string;
  inProgressAt?: string;
  resolvedAt?: string;
  verifiedAt?: string;
  closedAt?: string;
  attachments: MediaAttachment[];
  responses: GovernmentResponse[];
  verifications: ResolutionVerification[];
}

export default function ReportDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const { data: session, status: authStatus } = useSession();
  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyComment, setVerifyComment] = useState("");
  const [verifyPhoto, setVerifyPhoto] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  const fetchReportDetails = async () => {
    if (!id || authStatus !== "authenticated") return;

    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user?.id || ""}`,
        },
        body: JSON.stringify({
          query: `
            query GetCivicReportDetails($id: ID!) {
              civicReport(id: $id) {
                id
                title
                description
                category
                status
                priorityScore
                latitude
                longitude
                isWatched
                createdAt
                acknowledgedAt
                assignedAt
                inProgressAt
                resolvedAt
                verifiedAt
                closedAt
                attachments {
                  id
                  url
                  s3Key
                }
                responses {
                  id
                  content
                  officialId
                  statusChange
                  createdAt
                }
                verifications {
                  id
                  afterPhotoKey
                  comment
                  createdAt
                }
              }
            }
          `,
          variables: { id },
        }),
      });

      const json = await res.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      if (json.data?.civicReport) {
        setReport(json.data.civicReport);
        setIsWatching(json.data.civicReport.isWatched);
      } else {
        throw new Error("The requested civic report could not be found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportDetails();
  }, [id, authStatus, session?.user?.id]);

  const toggleWatchlist = async () => {
    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user?.id || ""}`,
        },
        body: JSON.stringify({
          query: `
            mutation ToggleWatchlist($reportId: ID!) {
              watchlist(reportId: $reportId)
            }
          `,
          variables: { reportId: id },
        }),
      });
      const json = await res.json();
      setIsWatching(json.data.watchlist);
    } catch (err) {
      console.error("Watchlist toggle failed", err);
    }
  };

  const handleVerifyResolution = async () => {
    if (!verifyPhoto) return;

    setIsVerifying(true);
    try {
      // 1. Get Presigned URL
      const uploadRes = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user?.id || ""}`,
        },
        body: JSON.stringify({
          query: `
            mutation GetUploadUrl($fileName: String!, $contentType: String!) {
              getUploadUrl(fileName: $fileName, contentType: $contentType) {
                uploadUrl
                key
              }
            }
          `,
          variables: { fileName: verifyPhoto.name, contentType: verifyPhoto.type },
        }),
      });
      const uploadJson = await uploadRes.json();
      const { uploadUrl, key } = uploadJson.data.getUploadUrl;

      // 2. Upload to S3 (Mocked or actual)
      await fetch(uploadUrl, {
        method: "PUT",
        body: verifyPhoto,
        headers: { "Content-Type": verifyPhoto.type },
      });

      // 3. Mutation
      await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user?.id || ""}`,
        },
        body: JSON.stringify({
          query: `
            mutation VerifyResolution($reportId: ID!, $afterPhotoKey: String!, $comment: String) {
              verifyResolution(reportId: $reportId, afterPhotoKey: $afterPhotoKey, comment: $comment) {
                id
              }
            }
          `,
          variables: { reportId: id, afterPhotoKey: key, comment: verifyComment },
        }),
      });

      setShowVerifyModal(false);
      fetchReportDetails();
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (authStatus === "loading" || (loading && !report)) {
    return (
      <div className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-10 w-2/3 bg-slate-200 rounded animate-pulse mt-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 h-64 bg-slate-200 rounded animate-pulse"></div>
          <div className="h-64 bg-slate-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center mb-6 transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Dashboard
        </button>
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 shadow-sm">
          <h2 className="font-bold text-lg mb-2">Error Encountered</h2>
          <p className="text-sm">{error || "Report not found."}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SUBMITTED": return "bg-amber-50 text-amber-700 border-amber-200";
      case "UNDER_REVIEW": return "bg-blue-50 text-blue-700 border-blue-200";
      case "ACKNOWLEDGED": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ASSIGNED": return "bg-violet-50 text-violet-700 border-violet-200";
      case "IN_PROGRESS": return "bg-sky-50 text-sky-700 border-sky-200";
      case "RESOLVED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "VERIFIED_RESOLVED": return "bg-green-100 text-green-800 border-green-300";
      case "FLAGGED":
      case "REJECTED": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formattedDate = new Date(report.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const steps = [
    { label: "SUBMITTED", timestamp: report.createdAt },
    { label: "ACKNOWLEDGED", timestamp: report.acknowledgedAt },
    { label: "ASSIGNED", timestamp: report.assignedAt },
    { label: "IN_PROGRESS", timestamp: report.inProgressAt },
    { label: "RESOLVED", timestamp: report.resolvedAt },
    { label: "CLOSED", timestamp: report.closedAt },
  ];

  const currentStepIndex = steps.findIndex(s => s.label === report.status.toUpperCase());
  const activeStepIndex = currentStepIndex === -1 ? (report.status === 'VERIFIED_RESOLVED' ? 4 : 0) : currentStepIndex;

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-8 pb-24">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-slate-500 hover:text-slate-900 inline-flex items-center transition"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleWatchlist}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition ${isWatching ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Star className={`w-4 h-4 ${isWatching ? 'fill-amber-500' : ''}`} />
            <span className="text-sm font-bold">{isWatching ? 'Watching' : 'Watch Report'}</span>
          </button>
          <span className="text-xs text-slate-400 font-mono">ID: {report.id}</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 border border-slate-200 rounded-md text-slate-700">
              {report.category}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold border rounded-md capitalize ${getStatusColor(report.status)}`}>
              {report.status?.replace("_", " ").toLowerCase()}
            </span>
            <span className="text-xs text-slate-400 ml-auto">{formattedDate}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">{report.title}</h1>
        </div>

        {report.status === 'RESOLVED' && (
          <button
            onClick={() => setShowVerifyModal(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Verify Official Fix</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          {/* Report Content */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Issue Overview</h2>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{report.description}</p>
            </div>

            {report.attachments && report.attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {report.attachments.map((file) => (
                  <div key={file.id} className="group relative aspect-square bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <img src={file.url} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Official Responses */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              Government Accountability Log
            </h2>
            <div className="space-y-4">
              {report.responses && report.responses.length > 0 ? (
                report.responses.map((resp) => (
                  <div key={resp.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-blue-50 rounded-lg">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">Official Response</span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(resp.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed">"{resp.content}"</p>
                    {resp.statusChange && (
                      <div className="mt-4 pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Status Update:</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                          {resp.statusChange}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-sm text-slate-400 font-medium italic">Waiting for official municipal response...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          {/* Interactive Timeline */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-8">Resolution Timeline</h2>
            <div className="relative space-y-8 before:absolute before:inset-0 before:left-[11px] before:w-[2px] before:bg-slate-100">
              {steps.map((step, index) => {
                const isActive = index <= activeStepIndex;
                const isCurrent = index === activeStepIndex;

                return (
                  <div key={index} className="relative flex items-start space-x-4 pl-8">
                    <div className={`absolute left-0 w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all ${
                      isActive ? 'bg-blue-600 border-blue-100 z-10' : 'bg-white border-slate-100 z-10'
                    }`}>
                      {isActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 -mt-1">
                      <p className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-slate-900' : 'text-slate-300'}`}>
                        {step.label}
                      </p>
                      {step.timestamp && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {new Date(step.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                      {isCurrent && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
                          Current Phase
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Evidence */}
          {report.verifications && report.verifications.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-widest">Citizen Verification</h2>
              {report.verifications.map((v) => (
                <div key={v.id} className="space-y-3">
                  <div className="aspect-video bg-white rounded-xl overflow-hidden border border-emerald-200 shadow-sm">
                    {/* Placeholder for verfication photo URL */}
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <Camera className="w-8 h-8 text-emerald-200" />
                    </div>
                  </div>
                  <p className="text-xs text-emerald-700 font-medium italic">"{v.comment}"</p>
                  <div className="flex items-center space-x-2 text-[10px] text-emerald-600 font-bold uppercase">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Resolution Confirmed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="pt-8 border-t border-slate-100">
        <div className="space-y-1 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 uppercase tracking-widest text-sm">AI Report Workspace</h2>
          <p className="text-sm text-slate-500 font-medium">Resolution assistance and stakeholder communication drafting.</p>
        </div>
        <ReportAssistant reportId={report.id} />
      </div>

      {/* Verify Resolution Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest text-sm">Verify Resolution</h3>
              <button onClick={() => setShowVerifyModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Upload "After" Photo</label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={(e) => setVerifyPhoto(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*"
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-10 text-center transition ${verifyPhoto ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 group-hover:border-blue-400 bg-slate-50'}`}>
                    {verifyPhoto ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <p className="text-sm font-bold text-emerald-700">{verifyPhoto.name}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-sm font-medium text-slate-500">Tap to capture or select photo</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Verification Comment</label>
                <textarea
                  value={verifyComment}
                  onChange={(e) => setVerifyComment(e.target.value)}
                  placeholder="Describe the quality of the fix..."
                  className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                />
              </div>

              <button
                onClick={handleVerifyResolution}
                disabled={!verifyPhoto || isVerifying}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 transition flex items-center justify-center space-x-2"
              >
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    <span>Submit Verification</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
