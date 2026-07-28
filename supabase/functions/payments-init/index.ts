import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";
import { getProvider } from "../_shared/providers/registry.ts";

const log = makeLogger("payments-init");

/**
 * Starts payment for a booking hold or a paid game.
 * The amount ALWAYS comes from the database row — never from the client.
 * Body: { bookingId?, gameId?, provider: 'lemonsqueezy'|'mock', lang? }
 *
 * Lemon Squeezy is the only live provider. Ameria and Idram were removed from
 * the registry and from this allow-list; their adapters and callbacks remain on
 * disk but are unreachable.
 */
Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    const { user } = await requireUser(req);
    const { bookingId, gameId, provider: providerKey, lang } = await req.json();

    if ((!bookingId && !gameId) || (bookingId && gameId)) {
      return errorResponse(req, "provide exactly one of bookingId or gameId", 400);
    }
    if (!["lemonsqueezy", "mock"].includes(providerKey)) {
      return errorResponse(req, "invalid provider", 400);
    }

    const admin = adminClient();
    let amountMinor: number;
    let currency: string;
    let description: string;

    if (bookingId) {
      const { data: booking } = await admin.from("bookings").select("*").eq("id", bookingId).single();
      if (!booking) return errorResponse(req, "booking not found", 404);
      if (booking.user_id !== user.id) return errorResponse(req, "forbidden", 403);
      if (booking.status !== "pending_payment") {
        return errorResponse(req, `booking is ${booking.status}, not payable`, 409);
      }
      if (booking.expires_at && new Date(booking.expires_at) < new Date()) {
        return errorResponse(req, "booking hold expired", 409);
      }
      if (!booking.amount_minor || booking.amount_minor <= 0) {
        return errorResponse(req, "booking has no amount", 409);
      }
      amountMinor = booking.amount_minor;
      currency = booking.currency ?? "AMD";
      description = `SportsBnB booking — ${booking.venue_name}`;
    } else {
      const { data: game } = await admin.from("games").select("*").eq("id", gameId).single();
      if (!game) return errorResponse(req, "game not found", 404);
      if (game.status !== "open") return errorResponse(req, "game is not open", 409);
      const pricePerPlayer = Number(game.price_per_player ?? 0);
      if (pricePerPlayer <= 0) return errorResponse(req, "game is free — join directly", 400);

      const { data: existing } = await admin
        .from("game_participants")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) return errorResponse(req, "already joined", 409);

      amountMinor = Math.round(pricePerPlayer * 100);
      currency = "AMD";
      description = `SportsBnB game — ${game.title}`;
    }

    /**
     * One payment row per *attempt*, reusing only one that is still in flight.
     *
     * The key used to be `${subject}:${user}:${provider}` with nothing else in
     * it, and `idempotency_key` is `text UNIQUE` over the whole table — not a
     * partial index scoped to live payments. The reuse SELECT accepts only
     * `created` and `redirected`, so once an attempt reached `failed` or
     * `cancelled` the row was invisible to the SELECT and fatal to the INSERT:
     * every later attempt hit the unique constraint and returned 500.
     *
     * For a game that is permanent. `gameId`, `user.id` and the provider never
     * change — GameDetailsPage pins the provider — so one declined card locked
     * that player out of that game forever, with a 500 and no explanation. For a
     * booking it kills the hold: the same `bookingId` cannot be paid again, and
     * the customer has to wait out the 20 minutes and start over.
     *
     * Resetting the failed row instead would have been the shorter fix and the
     * wrong one: `order_ref` is `NOT NULL UNIQUE DEFAULT nextval(...)` and is
     * the order id shown to the provider, which will not accept the same one
     * twice. A fresh row is what gets a fresh order ref.
     *
     * The attempt suffix is derived from how many payments already exist for
     * this subject, user and provider, so history is preserved and every
     * attempt is separable in the ledger.
     */
    const keyPrefix = `${bookingId ?? gameId}:${user.id}:${providerKey}`;
    const { data: existingPayment } = await admin
      .from("payments")
      .select("*")
      .like("idempotency_key", `${keyPrefix}%`)
      .in("status", ["created", "redirected"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let payment = existingPayment;
    if (!payment) {
      const { count } = await admin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .like("idempotency_key", `${keyPrefix}%`);

      const { data: created, error: insertErr } = await admin
        .from("payments")
        .insert({
          user_id: user.id,
          booking_id: bookingId ?? null,
          game_id: gameId ?? null,
          provider: providerKey,
          amount_minor: amountMinor,
          currency,
          status: "created",
          idempotency_key: `${keyPrefix}:${(count ?? 0) + 1}`,
        })
        .select()
        .single();

      if (insertErr) {
        // 23505 here means another request for the same subject computed the
        // same attempt number and won the race. That is the case the key
        // exists for — two clicks on Pay — so the loser joins the winner's
        // payment rather than starting a second one.
        if (insertErr.code === "23505") {
          const { data: raced } = await admin
            .from("payments")
            .select("*")
            .like("idempotency_key", `${keyPrefix}%`)
            .in("status", ["created", "redirected"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (raced) payment = raced;
        }
        if (!payment) {
          log("payment insert failed", { error: insertErr.message, code: insertErr.code });
          return errorResponse(req, "failed to create payment", 500);
        }
      } else if (!created) {
        log("payment insert returned no row", { key: keyPrefix });
        return errorResponse(req, "failed to create payment", 500);
      } else {
        payment = created;
      }
    }

    const provider = getProvider(providerKey);

    /**
     * Where the provider sends the user back to.
     *
     * This used to point at payments-callback-ameria, which made sense only for
     * Ameria's BackURL contract (that function re-verified with the bank and
     * then bounced the browser onward). Lemon Squeezy settles over its webhook,
     * not over the return trip, so the return URL goes straight to the app's
     * status page — which polls payments-verify — and no longer detours through
     * a callback belonging to a provider that is no longer wired up.
     */
    const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://sportsbnb.org";
    const backUrl = bookingId
      ? `${appUrl}/booking/${bookingId}/status`
      : `${appUrl}/game/${gameId}/join-status?paymentId=${payment.id}`;
    const initResult = await provider.init({
      orderRef: payment.order_ref,
      paymentId: payment.id,
      amountMinor,
      currency,
      description,
      backUrl,
      lang: lang === "am" || lang === "ru" ? lang : "en",
    });

    await admin
      .from("payments")
      .update({
        status: "redirected",
        provider_payment_id: initResult.providerPaymentId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    log("payment initialized", { paymentId: payment.id, provider: providerKey });
    return json(req, {
      paymentId: payment.id,
      redirectUrl: initResult.redirectUrl,
      formAction: initResult.formAction ?? null,
      formFields: initResult.formFields ?? null,
      amountMinor,
      currency,
    });
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(req, error.message, error.status);
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return errorResponse(req, "payment initialization failed", 500);
  }
});
