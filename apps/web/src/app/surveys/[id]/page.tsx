import React from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import SurveyDetailContainer from "./SurveyDetailContainer";

async function getSurvey(id: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query GetSurvey($id: ID!) {
          survey(id: $id) {
            id
            title
            description
            schemaJson
          }
        }
      `,
      variables: { id },
    }),
    cache: "no-store",
  });

  const json = await res.json();
  if (json.errors || !json.data.survey) {
    return null;
  }
  return json.data.survey;
}

export default async function SurveyDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const session = await auth();
  const survey = await getSurvey(id);

  if (!survey) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <SurveyDetailContainer survey={survey} userId={session?.user?.id} />
      </div>
    </div>
  );
}
