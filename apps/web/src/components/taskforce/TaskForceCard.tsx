"use client";

import Link from "next/link";
import { Users, Calendar, MapPin } from "lucide-react";

interface TaskForce {
  id: string;
  title: string;
  category: string;
  location?: string;
  scheduledAt?: string;
  volunteerCount: number;
}

interface TaskForceCardProps {
  taskForce: TaskForce;
}

export default function TaskForceCard({ taskForce }: TaskForceCardProps) {
  return (
    <div className="bg-white border border-orange-100 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full group">
      {/* Top Category Badge */}
      <div className="px-4 py-2 border-b border-orange-50 flex items-center justify-between bg-orange-50/30">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-orange-100 text-orange-700">
          {taskForce.category}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug">
            {taskForce.title}
          </h3>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          {taskForce.scheduledAt && (
            <div className="flex items-center text-sm text-slate-600">
              <Calendar className="w-4 h-4 mr-2 text-orange-400" />
              <span>{new Date(taskForce.scheduledAt).toLocaleDateString()}</span>
            </div>
          )}
          {taskForce.location && (
            <div className="flex items-center text-sm text-slate-600">
              <MapPin className="w-4 h-4 mr-2 text-orange-400" />
              <span className="truncate">{taskForce.location}</span>
            </div>
          )}
          <div className="flex items-center text-sm font-bold text-orange-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{taskForce.volunteerCount} volunteers joined</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-4 bg-orange-50/50 border-t border-orange-100">
        <Link
          href={`/task-force/${taskForce.id}`}
          className="w-full flex items-center justify-center py-2.5 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition shadow-sm active:scale-95"
        >
          View & Join Task Force
        </Link>
      </div>
    </div>
  );
}
