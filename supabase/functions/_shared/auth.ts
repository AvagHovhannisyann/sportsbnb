import { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { adminClient, userClient } from "./supabase.ts";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Authenticate the caller from the Authorization bearer JWT.
 * Throws HttpError(401) when missing/invalid.
 * Returns both the user and an RLS-scoped client for that user.
 */
export async function requireUser(req: Request): Promise<{ user: User; supabase: SupabaseClient }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new HttpError(401, "unauthorized");

  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "unauthorized");
  return { user: data.user, supabase };
}

/**
 * Authenticate + require the admin role (user_roles table).
 * Throws HttpError(401/403).
 */
export async function requireAdmin(req: Request): Promise<{ user: User; supabase: SupabaseClient }> {
  const { user, supabase } = await requireUser(req);
  const { data: role } = await adminClient()
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) throw new HttpError(403, "forbidden");
  return { user, supabase };
}

/**
 * For machine-invoked functions (pg_cron, internal chains).
 * Accepts either the x-cron-secret header matching CRON_SECRET,
 * or a service-role bearer token.
 * Throws HttpError(401).
 */
export function requireCronSecret(req: Request): void {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided && timingSafeEqual(provided, cronSecret)) return;

  const auth = req.headers.get("Authorization") ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (serviceRole && timingSafeEqual(auth, `Bearer ${serviceRole}`)) return;

  throw new HttpError(401, "unauthorized");
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}
