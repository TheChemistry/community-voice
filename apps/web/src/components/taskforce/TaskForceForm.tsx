"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Calendar, MapPin, Tag, Type, AlignLeft } from "lucide-react";

const taskForceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details"),
  category: z.string().min(1, "Select a category"),
  location: z.string().min(1, "Location is required"),
  scheduledAt: z.string().min(1, "Date and time are required"),
});

type TaskForceFormValues = z.infer<typeof taskForceSchema>;

export default function TaskForceForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskForceFormValues>({
    resolver: zodResolver(taskForceSchema),
  });

  async function onSubmit(data: TaskForceFormValues) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation CreateTaskForce($input: CreateTaskForceInput!) {
              createTaskForce(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              ...data,
              scheduledAt: new Date(data.scheduledAt).toISOString(),
            },
          },
        }),
      });

      const json = await res.json();
      if (json.data?.createTaskForce) {
        router.push(`/task-force/${json.data.createTaskForce.id}`);
        router.refresh();
      } else {
        setError(json.errors?.[0]?.message || "Failed to create task force");
      }
    } catch (e) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="flex items-center text-sm font-black text-slate-700 mb-2">
            <Type className="w-4 h-4 mr-2 text-orange-500" />
            Event Title
          </label>
          <input
            {...register("title")}
            placeholder="e.g., Oak Street Park Cleanup"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition"
          />
          {errors.title && <p className="mt-1 text-xs text-red-500 font-medium">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center text-sm font-black text-slate-700 mb-2">
              <Tag className="w-4 h-4 mr-2 text-orange-500" />
              Category
            </label>
            <select
              {...register("category")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition bg-white"
            >
              <option value="">Select a category</option>
              <option value="Environment">Environment</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Safety">Public Safety</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500 font-medium">{errors.category.message}</p>}
          </div>

          <div>
            <label className="flex items-center text-sm font-black text-slate-700 mb-2">
              <Calendar className="w-4 h-4 mr-2 text-orange-500" />
              Scheduled Date
            </label>
            <input
              type="datetime-local"
              {...register("scheduledAt")}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition"
            />
            {errors.scheduledAt && <p className="mt-1 text-xs text-red-500 font-medium">{errors.scheduledAt.message}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-center text-sm font-black text-slate-700 mb-2">
            <MapPin className="w-4 h-4 mr-2 text-orange-500" />
            Meeting Location
          </label>
          <input
            {...register("location")}
            placeholder="e.g., Main Entrance, Central Park"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition"
          />
          {errors.location && <p className="mt-1 text-xs text-red-500 font-medium">{errors.location.message}</p>}
        </div>

        <div>
          <label className="flex items-center text-sm font-black text-slate-700 mb-2">
            <AlignLeft className="w-4 h-4 mr-2 text-orange-500" />
            Description & Goals
          </label>
          <textarea
            {...register("description")}
            rows={5}
            placeholder="What will we be doing? What should people bring?"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition"
          />
          {errors.description && <p className="mt-1 text-xs text-red-500 font-medium">{errors.description.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-orange-500 text-white font-black rounded-xl shadow-xl hover:bg-orange-600 transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Creating Event...
          </>
        ) : (
          "Launch Task Force"
        )}
      </button>
    </form>
  );
}
