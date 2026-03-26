import { createClient } from "@supabase/supabase-js";

// Server-only client — uses service role key, bypasses RLS
// Never import this in any client component
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
