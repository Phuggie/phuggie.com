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
    const apiKey  = Deno.env.get('STEAM_API_KEY')!;
    const steamId = Deno.env.get('STEAM_ID')!;

    // Fetch owned games with app info (names, icons) included
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`
    );

    if (!res.ok) {
      throw new Error(`Steam API request failed: ${res.status}`);
    }

    const data = await res.json();
    const games = data.response.games || [];

    // Sort by most recently played
    const sorted = games.sort((a: any, b: any) => 
      (b.rtime_last_played || 0) - (a.rtime_last_played || 0)
    );

    // Format each game for the frontend
    const formatted = sorted.map((game: any) => ({
      id:           game.appid,
      name:         game.name,
      playtime:     Math.round(game.playtime_forever / 60), // convert minutes to hours
      lastPlayed:   game.rtime_last_played
        ? new Date(game.rtime_last_played * 1000).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          })
        : 'Never',
      iconUrl: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
      coverUrl: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appid}/capsule_231x87.jpg`,
    }));

    return new Response(
      JSON.stringify({
        totalGames: formatted.length,
        games:      formatted,
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