// Optional authentication with Auth.js (NextAuth v5).
// The base app runs fine without configuring this. To enable it, see the
// "Optional: Authentication" section in the README, then set AUTH_SECRET and
// your provider credentials in .env.
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // GitHub reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET from the environment.
    GitHub,
  ],
  // Using the JWT session strategy means no database adapter is required.
  session: { strategy: "jwt" },
});
