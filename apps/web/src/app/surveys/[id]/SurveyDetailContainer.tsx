"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SurveyRenderer } from "@/components/surveys/SurveyRenderer";

interface SurveyDetailContainerProps {
  survey: any;
  userId?: string;
}

export default function SurveyDetailContainer({ survey, userId }: SurveyDetailContainerProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (answers: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": userId ? `Bearer ${userId}` : "", // Assuming simple bearer for demo
        },
        body: JSON.stringify({
          query: `
            mutation SubmitSurveyResponse($input: SubmitSurveyResponseInput!) {
              submitSurveyResponse(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              surveyId: survey.id,
              answers,
            },
          },
        }),
      });

      const json = await res.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit survey response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-xl border border-green-100 text-center space-y-6">
        <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100">
          <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-gray-900">Thank You!</h2>
          <p className="text-lg text-gray-500">
            Your feedback has been successfully submitted. We appreciate your contribution to our community.
          </p>
        </div>
        <div className="pt-6">
          <Link
            href="/surveys"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-bold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
          >
            Back to Surveys
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">{survey.title}</h1>
        <p className="text-gray-600 leading-relaxed">{survey.description}</p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start space-x-3">
          <svg className="h-5 w-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <SurveyRenderer
          survey={survey}
          onSubmit={handleSubmit}
          isSubmitting={loading}
        />
      </div>

      <div className="text-center">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-700 font-medium transition"
        >
          &larr; Cancel and return
        </button>
      </div>
    </div>
  );
}
