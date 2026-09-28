import { auth } from "@/auth";
import { redirect } from "next/navigation";
import IssueMap from "@/components/maps/IssueMap";

async function getMapReports(token: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: `
        query GetMapReports {
          listReportsForMap {
            id
            title
            latitude
            longitude
            category
            priorityScore
          }
        }
      `,
    }),
    next: { revalidate: 0 }
  });

  const json = await res.json();
  return json.data?.listReportsForMap || [];
}

export default async function MapPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const reports = await getMapReports(session.user?.id || "");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Public Issue Map</h1>
          <p className="text-slate-500 mt-1">Spatial visualization of civic reports clustered by priority.</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 h-[650px]">
          <IssueMap reports={reports} mapboxToken={mapboxToken} />
        </div>
      </div>
    </div>
  );
}
