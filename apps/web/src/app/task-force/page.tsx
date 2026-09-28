import { auth } from "@/auth";
import Link from "next/link";
import TaskForceCard from "@/components/taskforce/TaskForceCard";
import { Plus } from "lucide-react";

async function getTaskForces() {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query GetTaskForces {
          taskForces {
            id
            title
            category
            location
            scheduledAt
            volunteerCount
          }
        }
      `,
    }),
    next: { revalidate: 60 } // Revalidate every minute
  });

  const json = await res.json();
  return json.data?.taskForces || [];
}

export default async function TaskForceListPage() {
  const taskForces = await getTaskForces();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-orange-500 text-white border-b border-orange-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                Community Task Forces
              </h1>
              <p className="text-xl text-orange-100 font-medium">
                Direct action for local impact. Join your neighbors to clean, build, and improve our shared spaces.
              </p>
            </div>
            <Link
              href="/task-force/new"
              className="mt-8 md:mt-0 inline-flex items-center px-8 py-4 bg-white text-orange-600 font-black rounded-xl shadow-2xl hover:bg-orange-50 transition transform active:scale-95"
            >
              <Plus className="w-6 h-6 mr-2" />
              Organize Event
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Active Task Forces</h2>
          <div className="flex space-x-2">
             {/* Simple filter placeholders */}
             <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:border-orange-300">Latest</button>
             <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:border-orange-300">Upcoming</button>
          </div>
        </div>

        {taskForces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {taskForces.map((tf: any) => (
              <TaskForceCard key={tf.id} taskForce={tf} />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center">
            <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <Plus className="w-12 h-12 text-orange-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Task Forces Yet</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-10">
              Be the first to organize a community event. Whether it's a park cleanup or a neighborhood watch meeting, every action counts.
            </p>
            <Link
              href="/task-force/new"
              className="inline-flex items-center px-8 py-4 bg-orange-500 text-white font-black rounded-xl shadow-lg hover:bg-orange-600 transition"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
