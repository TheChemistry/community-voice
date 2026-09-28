import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Users, ArrowLeft, Info } from "lucide-react";
import JoinButton from "@/components/taskforce/JoinButton";

async function getTaskForce(id: string, userId?: string) {
  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query GetTaskForce($id: ID!) {
          taskForce(id: $id) {
            id
            title
            description
            category
            location
            scheduledAt
            volunteerCount
            creatorId
            volunteers {
              userId
            }
          }
        }
      `,
      variables: { id },
    }),
    next: { revalidate: 0 }
  });

  const json = await res.json();
  const tf = json.data?.taskForce;

  if (!tf) return null;

  const isJoined = userId ? tf.volunteers.some((v: any) => v.userId === userId) : false;

  return { ...tf, isJoined };
}

export default async function TaskForceDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session?.user?.id;
  const taskForce = await getTaskForce(params.id, userId);

  if (!taskForce) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/task-force" className="inline-flex items-center text-slate-500 hover:text-orange-600 font-bold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Task Forces
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
              <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-xs font-black uppercase tracking-widest rounded-full mb-4">
                {taskForce.category}
              </span>
              <h1 className="text-4xl font-black text-slate-900 mb-6 leading-tight">
                {taskForce.title}
              </h1>

              <div className="prose prose-slate max-w-none">
                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                   <Info className="w-5 h-5 mr-2 text-orange-500" />
                   About this Event
                </h3>
                <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                  {taskForce.description}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center text-slate-900 font-bold mb-2">
                       <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                       Date & Time
                    </div>
                    <p className="text-slate-600">
                       {taskForce.scheduledAt ? new Date(taskForce.scheduledAt).toLocaleString() : "Date to be announced"}
                    </p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex items-center text-slate-900 font-bold mb-2">
                       <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                       Meeting Point
                    </div>
                    <p className="text-slate-600">
                       {taskForce.location || "Location to be confirmed"}
                    </p>
                 </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-orange-100 relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>

               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Volunteers</p>
                      <p className="text-4xl font-black text-slate-900">{taskForce.volunteerCount}</p>
                    </div>
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                      <Users className="w-8 h-8" />
                    </div>
                  </div>

                  <JoinButton
                    taskForceId={taskForce.id}
                    isJoinedInitial={taskForce.isJoined}
                    token={session?.user?.id} // Assuming ID is the token for simplicity in this mockup, or use actual token
                  />

                  <p className="mt-6 text-center text-sm text-slate-500 font-medium">
                    Help us reach our goal of {Math.max(20, taskForce.volunteerCount + 5)} volunteers!
                  </p>
               </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-sm">
               <h4 className="font-bold mb-4">Community Impact</h4>
               <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Events like these help build local resilience and improve quality of life for all residents.
               </p>
               <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: '65%' }}></div>
               </div>
               <p className="mt-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right">Progress Tracking Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
