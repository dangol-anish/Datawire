import { supabaseServer } from "@/lib/supabaseServer";

type GithubIdentity = {
  githubId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  login?: string | null;
};

async function findExistingSupabaseAuthUserId(args: {
  githubId: string;
  email?: string | null;
}): Promise<string | null> {
  const targetGithubId = args.githubId;
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
      const githubId =
        typeof userMetadata?.github_id === "string"
          ? (userMetadata.github_id as string)
          : null;

      if (githubId === targetGithubId) return user.id;

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
      githubId,
      email: identity.email,
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
