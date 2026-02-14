// Supabase Edge Function: stripe-webhook
// Handles Stripe webhooks for payment completion

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "https://lightsofelmridge.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      throw new Error("Stripe configuration missing");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    // Get the raw body
    const body = await req.text();

    // Verify the webhook signature (use async version for Deno)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Webhook handler failed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log("Processing completed checkout:", session.id);

  // Get Supabase admin client
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Extract metadata
  const userId = session.metadata?.user_id;
  const sequenceIds = session.metadata?.sequence_ids
    ?.split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  if (!sequenceIds || sequenceIds.length === 0) {
    console.error("No sequence IDs in session metadata");
    return;
  }

  // Record the purchase
  const { error } = await supabase.from("purchases").insert({
    user_id: userId !== "anonymous" ? userId : null,
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
    sequence_ids: sequenceIds,
    amount_total: session.amount_total || 0,
    currency: session.currency || "usd",
    status: "completed",
    customer_email: session.customer_email,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to record purchase:", error);
    throw error;
  }

  console.log(
    `Purchase recorded: ${session.id} - ${sequenceIds.length} sequences`,
  );
}
