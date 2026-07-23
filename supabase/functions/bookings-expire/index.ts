import { requireCronSecret, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { makeLogger } from "../_shared/http.ts";

const log = makeLogger("bookings-expire");

/** Cron: frees expired payment holds so their slots become bookable again. */
Deno.serve(async (req) => {
  try {
    requireCronSecret(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 401;
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = adminClient();
  const { data, error } = await admin.rpc("expire_stale_holds");
  if (error) {
    log("expire failed", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  log("expired holds", { count: data });
  return new Response(JSON.stringify({ expired: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
