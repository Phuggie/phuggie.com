import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const clientId     = Deno.env.get('TWITCH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET')!;
    const userId       = Deno.env.get('TWITCH_USER_ID')!;
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Supabase client — service role bypasses RLS
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Get Twitch access token ───────────────────────────────────────────
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    });
    if (!tokenRes.ok) throw new Error(`Token request failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    const twitchHeaders = {
      'Client-ID': clientId,
      'Authorization': `Bearer ${access_token}`,
    };

    // ── Check if live ─────────────────────────────────────────────────────
    const streamRes = await fetch(
      'https://api.twitch.tv/helix/streams?user_login=phuggie',
      { headers: twitchHeaders }
    );
    if (!streamRes.ok) throw new Error(`Streams request failed: ${streamRes.status}`);
    const streamData = await streamRes.json();
    const isLive     = streamData.data.length > 0;
    const stream     = isLive ? streamData.data[0] : null;

    // ── If live, get game art and upsert to stream_history ───────────────
    let streamGameArt = null;

    if (stream) {
      // Get box art for current game
      if (stream.game_id) {
        const gameRes = await fetch(
          `https://api.twitch.tv/helix/games?id=${stream.game_id}`,
          { headers: twitchHeaders }
        );
        if (gameRes.ok) {
          const gameData = await gameRes.json();
          if (gameData.data.length > 0) {
            streamGameArt = gameData.data[0].box_art_url
              .replace('{width}', '144')
              .replace('{height}', '192');
          }
        }
      }

      // Upsert stream record — creates or updates based on stream_id
      // This is how we store game info for later VOD lookup
      await supabase.from('stream_history').upsert({
        stream_id:  stream.id,
        game_name:  stream.game_name,
        game_art:   streamGameArt,
        title:      stream.title,
        started_at: stream.started_at,
      }, { onConflict: 'stream_id' });
    }

    // ── Get latest VOD ────────────────────────────────────────────────────
    const vodRes = await fetch(
      `https://api.twitch.tv/helix/videos?user_id=${userId}&type=archive&first=1`,
      { headers: twitchHeaders }
    );
    if (!vodRes.ok) throw new Error(`Videos request failed: ${vodRes.status}`);
    const vodData = await vodRes.json();
    const vod     = vodData.data.length > 0 ? vodData.data[0] : null;

    // ── Look up VOD game from stream_history ──────────────────────────────
    let vodGame    = null;
    let vodGameArt = null;

    if (vod?.stream_id) {
      const { data: historyRow } = await supabase
        .from('stream_history')
        .select('game_name, game_art')
        .eq('stream_id', vod.stream_id)
        .single();

      if (historyRow) {
        vodGame    = historyRow.game_name;
        vodGameArt = historyRow.game_art;
      }
    }

    // ── Format VOD date ───────────────────────────────────────────────────
    const vodDate = vod
      ? new Date(vod.created_at).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })
      : null;

    // ── Return response ───────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        isLive,
        stream: isLive ? {
          title:   stream.title,
          game:    stream.game_name,
          gameArt: streamGameArt,
        } : null,
        vod: vod ? {
          id:      vod.id,
          title:   vod.title,
          date:    vodDate,
          game:    vodGame,
          gameArt: vodGameArt,
        } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

});