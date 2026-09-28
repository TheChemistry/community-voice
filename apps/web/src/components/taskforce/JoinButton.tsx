"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check } from "lucide-react";

interface JoinButtonProps {
  taskForceId: string;
  isJoinedInitial: boolean;
  token?: string;
}

export default function JoinButton({ taskForceId, isJoinedInitial, token }: JoinButtonProps) {
  const [joined, setJoined] = useState(isJoinedInitial);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            mutation JoinTaskForce($id: ID!) {
              joinTaskForce(taskForceId: $id) {
                id
              }
            }
          `,
          variables: { id: taskForceId },
        }),
      });

      const json = await res.json();
      if (json.data?.joinTaskForce) {
        setJoined(true);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (joined) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center px-8 py-4 bg-emerald-100 text-emerald-700 font-black rounded-xl border-2 border-emerald-200 cursor-default"
      >
        <Check className="w-6 h-6 mr-2" />
        Signed Up!
      </button>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full flex items-center justify-center px-8 py-4 bg-orange-500 text-white font-black rounded-xl shadow-xl hover:bg-orange-600 transition transform active:scale-95 disabled:opacity-50"
    >
      <UserPlus className="w-6 h-6 mr-2" />
      {loading ? "Signing up..." : "Join Task Force"}
    </button>
  );
}
