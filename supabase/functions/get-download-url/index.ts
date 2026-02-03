// Supabase Edge Function: get-download-url
// Verifies purchase and returns download URL for a sequence

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Sequence ID to R2 URL mapping
// In production, this could come from a database
const sequenceDownloads: Record<number, string> = {
  3: "https://downloads.lightsofelmridge.com/Paid/Abracadabra.zip",
  8: "https://downloads.lightsofelmridge.com/Free/Spooky%20Dub.zip",
  9: "https://downloads.lightsofelmridge.com/Free/Purple%20People%20Eater%20-%20Dub%20Step%20by%20Pegboard%20Nerds.zip",
  // Add more sequences as they become available
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authentication required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Invalid session");
    }

    // Get the sequence ID from the request
    const { sequenceId } = await req.json();

    if (!sequenceId || typeof sequenceId !== "number") {
      throw new Error("Sequence ID required");
    }

    // Check if user has purchased this sequence
    const { data: purchases, error: purchaseError } = await supabase
      .from("purchases")
      .select("sequence_ids")
      .eq("user_id", user.id);

    if (purchaseError) {
      console.error("Error fetching purchases:", purchaseError);
      throw new Error("Failed to verify purchase");
    }

    // Check if the sequence is in any of the user's purchases
    const hasPurchased = purchases?.some(
      (purchase: { sequence_ids: number[] }) =>
        purchase.sequence_ids.includes(sequenceId),
    );

    if (!hasPurchased) {
      throw new Error("You haven't purchased this sequence");
    }

    // Get the download URL
    const downloadUrl = sequenceDownloads[sequenceId];

    if (!downloadUrl) {
      throw new Error("Download not available for this sequence yet");
    }

    return new Response(JSON.stringify({ url: downloadUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Download URL error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to get download URL",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
