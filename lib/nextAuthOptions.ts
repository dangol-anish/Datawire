import GitHubProvider from "next-auth/providers/github";
import type { NextAuthOptions } from "next-auth";
import { getOrCreateSupabaseUserIdForGithub } from "@/lib/supabaseIdentity";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "github" && account.providerAccountId) {
        // Persist GitHub id for reference/debugging
        token.githubId = account.providerAccountId;

        // Ensure token.id is a Supabase Auth UUID (not the GitHub numeric id)
        if (typeof token.id !== "string" || !UUID_RE.test(token.id)) {
          token.id = await getOrCreateSupabaseUserIdForGithub({
            githubId: account.providerAccountId,
            email: user?.email,
            name: user?.name,
            image: user?.image,
            login:
              profile && typeof (profile as any).login === "string"
                ? ((profile as any).login as string)
                : null,
          });
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.githubId =
          typeof (token as any).githubId === "string"
            ? ((token as any).githubId as string)
            : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
