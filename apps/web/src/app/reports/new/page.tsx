"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function CreateReportPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "Infrastructure",
    latitude: 40.7128,
    longitude: -74.0060,
  });

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Get presigned URLs and upload to S3
      const mediaKeys = await Promise.all(
        files.map(async (file) => {
          const res = await fetch("http://localhost:4000/graphql", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${session?.user?.id}` // In real app, use the actual JWT
            },
            body: JSON.stringify({
              query: `
                mutation GetUploadUrl($fileName: String!, $contentType: String!) {
                  getUploadUrl(fileName: $fileName, contentType: $contentType) {
                    uploadUrl
                    key
                  }
                }
              `,
              variables: { fileName: file.name, contentType: file.type },
            }),
          });
          const json = await res.json();
          if (json.errors) throw new Error(json.errors[0].message);

          const { uploadUrl, key } = json.data.getUploadUrl;

          // Evidence First: Upload directly to S3
          await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          return key;
        })
      );

      // 2. Create civic report
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.user?.id}`
        },
        body: JSON.stringify({
          query: `
            mutation CreateCivicReport($input: CreateCivicReportInput!) {
              createCivicReport(input: $input) {
                id
                title
              }
            }
          `,
          variables: {
            input: {
              ...formData,
              latitude: parseFloat(formData.latitude.toString()),
              longitude: parseFloat(formData.longitude.toString()),
              mediaKeys,
            },
          },
        }),
      });

      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Report a Civic Issue</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm border rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Broken streetlight on 5th Ave"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option>Infrastructure</option>
                <option>Utilities</option>
                <option>Public Safety</option>
                <option>Environment</option>
                <option>Sanitation</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
              <textarea
                required
                rows={5}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue in detail. What, where, and when?"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Location Selection</label>
              <div className="relative h-56 bg-gray-50 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                <div className="text-blue-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">Mapbox Interaction Ready</p>
                <p className="text-gray-400 text-xs px-4 text-center mt-1">Click on the map to pin the exact location of the evidence</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full text-sm border-gray-300 rounded-md px-2 py-1 border focus:ring-1 focus:ring-blue-500"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full text-sm border-gray-300 rounded-md px-2 py-1 border focus:ring-1 focus:ring-blue-500"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Evidence (High Priority)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500">
                      Upload files
                    </span>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, MP4 up to 50MB</p>
                </div>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 border-t pt-6">
          <p className="text-sm text-gray-500 italic">
            * All reports are verified by municipal administrators
          </p>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 disabled:bg-blue-300 shadow-md transform active:scale-95 transition"
          >
            {loading ? "Processing..." : "Submit Evidence & Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
