// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

console.log("Hello from Functions!");

// This endpoint uses 'publishable' | 'secret' access, apiKey is required.
// Use publishable for Client-facing, key-validated endpoints
// Use secret for Server-to-server, internal calls
export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    // Called by another service with a secret key
    // ctx.supabaseAdmin bypasses RLS — use for privileged operations
    /*
    if (ctx.authMode === "secret") {
      const { user_id } = await req.json();
      const { data } = await ctx.supabaseAdmin.auth.admin.getUserById(user_id);

      return Response.json({
        email: data?.user?.email,
      });
    }
    */

    const { name } = await req.json();

    return Response.json({
      message: `Hello ${name}!`,
    });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/twitch-status' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"name":"Functions"}'

*/
// supabase/functions/twitch-status/index.ts

// CORS headers — required for browser requests to this function
// Must be included in every response including errors and OPTIONS preflight
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {

  // Handle CORS preflight request — browser sends this before the real request
  // Must be handled first or browser blocks the actual request entirely
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Read Twitch credentials from Supabase secrets
    // These are never visible in code or GitHub — only accessible here on the server
    const clientId     = Deno.env.get('TWITCH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')!;
    const userId       = Deno.env.get('TWITCH_USER_ID')!;

    // Step 1: Get a temporary app access token from Twitch
    // client_credentials grant = server-to-server auth, no user login needed
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    });

    if (!tokenRes.ok) {
      throw new Error(`Twitch token request failed: ${tokenRes.status}`);
    }

    const { access_token } = await tokenRes.json();

    // Shared headers for all Twitch API calls
    const twitchHeaders = {
      'Client-ID': clientId,
      'Authorization': `Bearer ${access_token}`,
    };

    // Step 2: Check if channel is currently live
    // Returns data array with stream info if live, empty array if offline
    const streamRes = await fetch(
      'https://api.twitch.tv/helix/streams?user_login=phuggie',
      { headers: twitchHeaders }
    );

    if (!streamRes.ok) {
      throw new Error(`Twitch streams request failed: ${streamRes.status}`);
    }

    const streamData = await streamRes.json();
    const isLive     = streamData.data.length > 0;
    const stream     = isLive ? streamData.data[0] : null;

    // Step 3: Get the latest VOD (past broadcast)
    // type=archive = full past broadcasts only, not highlights or uploads
    // first=1 = only return the single most recent one
    const vodRes = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=1`,
      { headers: twitchHeaders }
    );

    if (!vodRes.ok) {
      throw new Error(`Twitch videos request failed: ${vodRes.status}`);
    }

    const vodData = await vodRes.json();
    const vod     = vodData.data.length > 0 ? vodData.data[0] : null;

    // Step 4: Format VOD date into a readable string
    const vodDate = vod
      ? new Date(vod.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })
      : null;

    // Step 5: Return clean response to frontend
    return new Response(
      JSON.stringify({
        isLive,
        stream: isLive ? {
          title: stream.title,
          game:  stream.game_name,
        } : null,
        vod: vod ? {
          id:    vod.id,
          title: vod.title,
          date:  vodDate,
        } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Return error response with CORS headers so browser can read the error
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

});