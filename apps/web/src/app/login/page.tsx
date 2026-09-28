import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Login to Community Voice</h1>
      <div className="flex flex-col gap-4">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
          >
            Sign in with Google
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("azure-ad", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full px-6 py-3 text-white bg-gray-800 rounded-md hover:bg-gray-900 transition"
          >
            Sign in with Microsoft
          </button>
        </form>
      </div>
    </div>
  );
}
