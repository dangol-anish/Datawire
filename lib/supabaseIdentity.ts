import { supabaseServer } from "@/lib/supabaseServer";

type GithubIdentity = {
  githubId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  login?: string | null;
};

async function findExistingSupabaseAuthUserId(args: {
  email?: string | null;
  matchMetadata?: (meta: Record<string, unknown> | undefined) => boolean;
}): Promise<string | null> {
  const targetEmail = args.email?.toLowerCase() ?? null;

  const maxPages = 20;
  const perPage = 100;

  for (let page = 1; page <= maxPages; page++) {
    const { data, error } = await supabaseServer.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error(`Supabase Auth listUsers failed: ${error.message}`);
    }

    for (const user of data.users) {
      const userMetadata = (user as any)?.user_metadata as
        | Record<string, unknown>
        | undefined;
      if (args.matchMetadata?.(userMetadata)) return user.id;

      if (
        targetEmail &&
        typeof user.email === "string" &&
        user.email.toLowerCase() === targetEmail
      ) {
        return user.id;
      }
    }

    if (data.users.length < perPage) break;
  }

  return null;
}

/**
 * Maps a GitHub user to a Supabase Auth user UUID (and a `profiles` row).
 *
 * Requirements in Supabase:
 * - `profiles.id` is a uuid (typically FK to `auth.users.id`)
 * - `profiles.github_id` exists and is unique (text recommended)
 */
export async function getOrCreateSupabaseUserIdForGithub(
  identity: GithubIdentity,
): Promise<string> {
  const githubId = identity.githubId;
  if (!githubId) throw new Error("Missing GitHub id");

  // Preferred: use a `profiles` table as a stable, queryable mapping.
  // Fallback: if `profiles` doesn't exist, scan Supabase Auth users.
  try {
    const { data: existingProfile, error: profileLookupError } =
      await supabaseServer
        .from("profiles")
        .select("id")
        .eq("github_id", githubId)
        .maybeSingle();

    if (profileLookupError) {
      throw profileLookupError;
    }

    if (existingProfile?.id) return existingProfile.id as string;
  } catch (err: any) {
    const message =
      typeof err?.message === "string" ? (err.message as string) : "";

    const looksLikeMissingProfilesTable =
      message.includes("Could not find the table") ||
      message.includes("schema cache") ||
      message.includes("profiles");

    if (!looksLikeMissingProfilesTable) {
      throw new Error(
        `Supabase profiles lookup failed (need profiles.github_id): ${message || "unknown error"}`,
      );
    }

    const existingAuthUserId = await findExistingSupabaseAuthUserId({
      email: identity.email,
      matchMetadata: (meta) => meta?.github_id === githubId,
    });
    if (existingAuthUserId) return existingAuthUserId;
  }

  const resolvedEmail =
    identity.email ?? `github-${githubId}@users.noreply.github.com`;

  const { data: created, error: createError } =
    await supabaseServer.auth.admin.createUser({
      email: resolvedEmail,
      email_confirm: true,
      user_metadata: {
        provider: "github",
        github_id: githubId,
        github_login: identity.login ?? null,
        name: identity.name ?? null,
        avatar_url: identity.image ?? null,
      },
    });

  if (createError || !created?.user?.id) {
    throw new Error(
      `Supabase Auth user create failed: ${createError?.message ?? "no user id"}`,
    );
  }

  const supabaseUserId = created.user.id;

  // Best-effort profiles upsert (skip if table doesn't exist).
  try {
    const { error: profileUpsertError } = await supabaseServer
      .from("profiles")
      .upsert(
        {
          id: supabaseUserId,
          github_id: githubId,
        },
        { onConflict: "id" },
      );

    if (profileUpsertError) {
      throw profileUpsertError;
    }
  } catch {
    // Intentionally ignore: app can function without profiles in early/dev setups.
  }

  return supabaseUserId;
}

export async function getOrCreateSupabaseUserIdForOAuth(args: {
  provider: "google";
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<string> {
  const provider = args.provider;
  const providerAccountId = args.providerAccountId;
  if (!providerAccountId) throw new Error("Missing OAuth providerAccountId");

  const existing = await findExistingSupabaseAuthUserId({
    email: args.email,
    matchMetadata: (meta) =>
      meta?.oauth_provider === provider && meta?.oauth_id === providerAccountId,
  });
  if (existing) return existing;

  const resolvedEmail =
    args.email ?? `${provider}-${providerAccountId}@users.noreply.local`;

  const { data: created, error: createError } =
    await supabaseServer.auth.admin.createUser({
      email: resolvedEmail,
      email_confirm: true,
      user_metadata: {
        provider,
        oauth_provider: provider,
        oauth_id: providerAccountId,
        name: args.name ?? null,
        avatar_url: args.image ?? null,
      },
    });

  if (createError || !created?.user?.id) {
    const msg = createError?.message ?? "no user id";
    // If the email already exists, try to look it up again.
    const mightAlreadyExist =
      msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist");
    if (mightAlreadyExist) {
      const byEmail = await findExistingSupabaseAuthUserId({
        email: resolvedEmail,
      });
      if (byEmail) return byEmail;
    }

    throw new Error(`Supabase Auth user create failed: ${msg}`);
  }

  return created.user.id;
}
