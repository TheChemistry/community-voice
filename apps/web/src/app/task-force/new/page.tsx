import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import TaskForceForm from "@/components/taskforce/TaskForceForm";

export default async function NewTaskForcePage() {
  const session = await auth();

  if (!session) {
    redirect("/login?callbackUrl=/task-force/new");
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/task-force" className="inline-flex items-center text-slate-500 hover:text-orange-600 font-bold mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to List
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-orange-500 p-8 text-white relative overflow-hidden">
             {/* Decorative background element */}
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

             <div className="relative z-10 flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                   <Rocket className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Organize Action</h1>
                  <p className="text-orange-100 font-medium opacity-90">Start a new community task force today.</p>
                </div>
             </div>
          </div>

          <div className="p-8">
            <TaskForceForm token={session.user?.id || ""} />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
           <h3 className="text-blue-900 font-bold mb-2">Pro-tip for Organizers</h3>
           <p className="text-blue-700 text-sm">
             Clearly defined goals and specific meeting points help increase volunteer turnout by up to 40%. Consider adding what tools or equipment participants should bring.
           </p>
        </div>
      </div>
    </div>
  );
}
