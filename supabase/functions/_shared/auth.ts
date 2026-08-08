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

/**
 * True when the caller presented a genuine service-role key.
 *
 * requireCronSecret() authenticates a machine caller by string-comparing the
 * Authorization header against SUPABASE_SERVICE_ROLE_KEY. That silently stops
 * working on a project running both the legacy JWT keys and the newer
 * sb_secret_/sb_publishable_ scheme: the injected env var and the key an
 * operator copies out of the dashboard become two different strings for the
 * same authority, the comparison fails, and every cron-invoked function
 * answers 401 to a perfectly valid key. It is the reason payouts-run and
 * payments-preflight both refused a working service-role token.
 *
 * Asking Postgres what role it resolved settles it without a shared secret.
 * PostgREST verifies the JWT signature against the project secret before any
 * SQL runs — a token with an altered payload is rejected as "Invalid API key"
 * rather than reaching current_jwt_role() — so the only way to get
 * "service_role" back is to hold a real one.
 *
 * Fails closed: any non-200, any unexpected body, any network error is false.
 */
export async function isServiceRoleToken(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return false;

  const url = Deno.env.get("SUPABASE_URL");
  if (!url) return false;

  try {
    const res = await fetch(`${url}/rest/v1/rpc/current_jwt_role`, {
      method: "POST",
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!res.ok) return false;
    return (await res.json()) === "service_role";
  } catch {
    return false;
  }
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
