import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import {
  getOrCreateSupabaseUserIdForGithub,
  getOrCreateSupabaseUserIdForOAuth,
} from "@/lib/supabaseIdentity";
import { createClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        if (!email || !password) return null;

        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
            },
          },
        );

        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email,
          password,
        });

        if (error || !data.user) return null;

        return {
          id: data.user.id,
          name: (data.user.user_metadata as any)?.name ?? data.user.email ?? email,
          email: data.user.email ?? email,
          image: (data.user.user_metadata as any)?.avatar_url ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "credentials" && user?.id) {
        token.id = user.id;
        return token;
      }

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

      if (account?.provider === "google" && account.providerAccountId) {
        token.googleId = account.providerAccountId;
        if (typeof token.id !== "string" || !UUID_RE.test(token.id)) {
          token.id = await getOrCreateSupabaseUserIdForOAuth({
            provider: "google",
            providerAccountId: account.providerAccountId,
            email: user?.email,
            name: user?.name,
            image: user?.image,
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
        session.user.googleId =
          typeof (token as any).googleId === "string"
            ? ((token as any).googleId as string)
            : undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
