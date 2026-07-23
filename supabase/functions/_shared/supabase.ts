import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Service-role client — bypasses RLS. Server-side use only. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Client scoped to the caller's JWT — RLS applies as that user. */
export function userClient(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    },
  );
}
