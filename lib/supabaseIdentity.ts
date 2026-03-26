import { supabaseServer } from "@/lib/supabaseServer";

type GithubIdentity = {
  githubId: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  login?: string | null;
};

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

  const { data: existingProfile, error: profileLookupError } =
    await supabaseServer
      .from("profiles")
      .select("id")
      .eq("github_id", githubId)
      .maybeSingle();

  if (profileLookupError) {
    throw new Error(
      `Supabase profiles lookup failed (need profiles.github_id): ${profileLookupError.message}`,
    );
  }

  if (existingProfile?.id) return existingProfile.id as string;

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
    throw new Error(
      `Supabase profiles upsert failed (need id + github_id columns): ${profileUpsertError.message}`,
    );
  }

  return supabaseUserId;
}

