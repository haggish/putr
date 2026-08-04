import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

// Example of a protected page. Enable Auth.js (see README) to use it.
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-neutral-600">You need to sign in to view this page.</p>
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <Button type="submit">Sign in with GitHub</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-neutral-600">
        Signed in as{" "}
        <span className="font-medium">
          {session.user.name ?? session.user.email}
        </span>
        .
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
