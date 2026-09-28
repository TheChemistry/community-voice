"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface TimelineItem {
  timestamp?: string;
  event: string;
}

interface AIAssistantData {
  reportSummary: string;
  executiveSummary: string;
  timeline: TimelineItem[];
  suggestedActions: string[];
}

interface AICommunicationsData {
  mayorLetter: string;
  councillorLetter: string;
  municipalDepartmentSubmission: string;
  mediaRelease: string;
  communityNewsletterArticle: string;
}

interface ReportAssistantProps {
  reportId: string;
}

type Tone = "Neutral" | "Professional" | "Concerned";
type Audience = "Mayor" | "Councillor" | "Department" | "Media";

export default function ReportAssistant({ reportId }: ReportAssistantProps) {
  const { data: session } = useSession();
  const [tone, setTone] = useState<Tone>("Professional");
  const [audience, setAudience] = useState<Audience>("Mayor");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [aiAssistant, setAiAssistant] = useState<AIAssistantData | null>(null);
  const [aiCommunications, setAiCommunications] = useState<AICommunicationsData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:4000/graphql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.user?.id || ""}`,
          },
          body: JSON.stringify({
            query: `
              query GetReportAssistantData($id: ID!, $tone: String!) {
                civicReport(id: $id) {
                  aiAssistant {
                    reportSummary
                    executiveSummary
                    timeline {
                      timestamp
                      event
                    }
                    suggestedActions
                  }
                  aiCommunications(tone: $tone) {
                    mayorLetter
                    councillorLetter
                    municipalDepartmentSubmission
                    mediaRelease
                    communityNewsletterArticle
                  }
                }
              }
            `,
            variables: { id: reportId, tone },
          }),
        });

        const json = await res.json();
        if (json.errors) {
          throw new Error(json.errors[0].message);
        }

        const report = json.data?.civicReport;
        if (report) {
          setAiAssistant(report.aiAssistant);
          setAiCommunications(report.aiCommunications);
        } else {
          throw new Error("Report assistant details could not be found.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load assistant data.");
      } finally {
        setLoading(false);
      }
    }

    if (reportId) {
      fetchData();
    }
  }, [reportId, tone, session?.user?.id]);

  const getLetterText = () => {
    if (!aiCommunications) return "";
    switch (audience) {
      case "Mayor":
        return aiCommunications.mayorLetter;
      case "Councillor":
        return aiCommunications.councillorLetter;
      case "Department":
        return aiCommunications.municipalDepartmentSubmission;
      case "Media":
        return aiCommunications.mediaRelease;
      default:
        return "";
    }
  };

  const handleCopy = () => {
    const text = getLetterText();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading && !aiAssistant) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Community Voice AI is compiling summaries and drafting communications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-700">
        <h3 className="font-semibold mb-1 flex items-center">
          <svg className="w-5 h-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          AI Integration Error
        </h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Left Column: Insight Display */}
      <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col space-y-6">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></span>
              AI Co-Pilot
            </span>
            <h2 className="text-lg font-bold text-slate-900">Civic Insights</h2>
          </div>
          <p className="text-xs text-slate-400">Automated structural verification & chronological fact extraction.</p>
        </div>

        {/* AI Summary */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Factual Summary</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {aiAssistant?.reportSummary || "No summary available."}
          </p>
        </div>

        {/* Key Observations / Executive overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Observations & Actions</h3>
          <ul className="space-y-2.5">
            {aiAssistant?.suggestedActions && aiAssistant.suggestedActions.length > 0 ? (
              aiAssistant.suggestedActions.map((action, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500 mr-2.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{action}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-slate-400 italic">No key observations generated.</li>
            )}
          </ul>
        </div>

        {/* Vertical Timeline Stepper */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Incident Timeline</h3>
          <div className="relative pl-4 border-l-2 border-slate-200 space-y-5 ml-1.5">
            {aiAssistant?.timeline && aiAssistant.timeline.length > 0 ? (
              aiAssistant.timeline.map((item, idx) => (
                <div key={idx} className="relative">
                  {/* Stepper Dot */}
                  <span className="absolute -left-[21px] top-1 bg-white border-2 border-blue-600 rounded-full w-2.5 h-2.5 flex items-center justify-center"></span>
                  <div className="text-xs text-slate-400 font-semibold mb-0.5">
                    {item.timestamp || `Step ${idx + 1}`}
                  </div>
                  <div className="text-sm text-slate-700 leading-tight">
                    {item.event}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400 italic">No chronological timeline items extracted.</div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Communication Tool & Tone Switching */}
      <div className="lg:col-span-7 p-6 bg-slate-50/50 flex flex-col space-y-6">
        <div className="flex flex-col sm:flex-sm sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Advocacy & Communications</h2>
            <p className="text-xs text-slate-400">Generate professional outreach assets to accelerate resolution.</p>
          </div>

          {/* Tone Switching Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 self-start">
            {(["Neutral", "Professional", "Concerned"] as Tone[]).map((t) => (
              <button
                key={t}
                onClick={() => setTone(t)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  tone === t
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Audience Selector Tabs */}
        <div className="border-b border-slate-200 flex space-x-1">
          {(["Mayor", "Councillor", "Department", "Media"] as Audience[]).map((aud) => (
            <button
              key={aud}
              onClick={() => setAudience(aud)}
              className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                audience === aud
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {aud === "Department" ? "Municipal Dept" : aud}
            </button>
          ))}
        </div>

        {/* Letter Workspace Box */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col min-h-[300px] relative overflow-hidden">
          {/* Header Action Bar */}
          <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Recipient: {audience === "Department" ? "Relevant Municipal Service Head" : audience}</span>
            <button
              onClick={handleCopy}
              disabled={!getLetterText()}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h6m-6 4h6m-6 4h3" />
                  </svg>
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>

          {/* Letter Body */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[380px]">
            {loading ? (
              <div className="h-full flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span className="text-sm text-slate-400">Updating tone parameters...</span>
              </div>
            ) : getLetterText() ? (
              <pre className="text-sm text-slate-700 font-sans whitespace-pre-wrap leading-relaxed select-all">
                {getLetterText()}
              </pre>
            ) : (
              <p className="text-sm text-slate-400 italic text-center py-12">
                Outreach letter could not be prepared for this profile.
              </p>
            )}
          </div>
        </div>

        {/* Guidance disclaimer note */}
        <div className="text-[11px] text-slate-400 flex items-start space-x-2 bg-slate-100/50 p-3 rounded-md border border-slate-200/40">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>Civic Tech Notice:</strong> These communications are drafted by an AI core based on neutral visual evidence guidelines. Review all template tags or local details carefully before transmitting to city officials.
          </span>
        </div>
      </div>
    </div>
  );
}
