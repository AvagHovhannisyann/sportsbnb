import Stripe from "npm:stripe@18.5.0";
import { handlePreflight } from "../_shared/cors.ts";
import { json, errorResponse, makeLogger } from "../_shared/http.ts";
import { requireUser, HttpError } from "../_shared/auth.ts";
import { adminClient } from "../_shared/supabase.ts";

const log = makeLogger("verify-game-payment");

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    log("Function started");

    const { user } = await requireUser(req);
    log("User authenticated", { userId: user.id });

    const admin = adminClient();

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required");
    log("Session ID received", { sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    log("Session retrieved", {
      status: session.payment_status,
      metadata: session.metadata,
    });

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const gameId = session.metadata?.game_id;
    const userId = session.metadata?.user_id;

    if (!gameId || !userId) {
      throw new Error("Invalid session metadata");
    }

    // Verify the user making the request is the same as the one who paid
    if (userId !== user.id) {
      throw new Error("User mismatch");
    }

    // Check if already joined (prevent double joining)
    const { data: existingParticipant } = await admin
      .from("game_participants")
      .select("id")
      .eq("game_id", gameId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingParticipant) {
      log("User already joined", { participantId: existingParticipant.id });
      return json(req, { success: true, alreadyJoined: true, gameId });
    }

    const { error: insertError } = await admin.from("game_participants").insert({
      game_id: gameId,
      user_id: userId,
      status: "confirmed",
    });

    if (insertError) {
      log("Failed to insert participant", { error: insertError.message });
      throw new Error("Failed to join game");
    }
    log("Participant added successfully");

    const { data: game } = await admin
      .from("games")
      .select("host_id, title")
      .eq("id", gameId)
      .single();

    if (game && game.host_id !== userId) {
      const { data: joiner } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .single();

      await admin.from("notifications").insert({
        user_id: game.host_id,
        type: "game",
        title: "New Player Joined! 🎮💰",
        message: `${joiner?.full_name || "Someone"} has paid and joined your game "${game.title}".`,
        link: `/game/${gameId}`,
      });
      log("Host notification sent");
    }

    await admin.from("notifications").insert({
      user_id: userId,
      type: "game",
      title: "Successfully Joined Game! 🎉",
      message: `Your payment was successful and you've joined "${game?.title}".`,
      link: `/game/${gameId}`,
    });
    log("User notification sent");

    return json(req, { success: true, gameId, gameTitle: game?.title });
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(req, error.message, error.status);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: errorMessage });
    return errorResponse(req, errorMessage, 500);
  }
});
