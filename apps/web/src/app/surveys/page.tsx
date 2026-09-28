import React from "react";
import Link from "next/link";
import { auth } from "@/auth";

async function getSurveys() {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query GetActiveSurveys {
          getActiveSurveys {
            id
            title
            description
            createdAt
          }
        }
      `,
    }),
    next: { revalidate: 60 },
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    return [];
  }
  return json.data.getActiveSurveys;
}

export default async function SurveyListPage() {
  const session = await auth();
  const surveys = await getSurveys();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Active Surveys</h1>
        <p className="mt-4 text-xl text-gray-500">
          Your voice matters. Participate in municipal surveys to help shape our community.
        </p>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
          <p className="text-gray-500 text-lg">No active surveys at this time. Check back later!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {surveys.map((survey: any) => (
            <div
              key={survey.id}
              className="bg-white overflow-hidden shadow-lg border border-gray-100 rounded-2xl flex flex-col hover:shadow-xl transition duration-300"
            >
              <div className="p-8 flex-1">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Open
                  </span>
                  <span className="text-sm text-gray-400">
                    {new Date(survey.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{survey.title}</h3>
                <p className="text-gray-600 line-clamp-3 mb-6">
                  {survey.description}
                </p>
              </div>
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
                <Link
                  href={`/surveys/${survey.id}`}
                  className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-bold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
                >
                  Take Survey
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {!session && (
        <div className="mt-12 p-6 bg-amber-50 rounded-xl border border-amber-200 flex items-center space-x-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-amber-800 font-medium">Want to earn civic rewards?</p>
            <p className="text-amber-700 text-sm">
              <Link href="/login" className="underline font-bold">Sign in</Link> to track your contributions and earn points for participating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
