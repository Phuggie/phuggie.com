// ─── Supabase Edge Function URL ──────────────────────────────────────────────
const SUPABASE_FUNCTION_URL = 'https://enltfgyhkwvrpvefpgkd.supabase.co/functions/v1/twitch-status';

// ─── Twitch status + VOD switcher ────────────────────────────────────────────
// Calls the Supabase Edge Function to check live status and get latest VOD
// Switches the embed source and updates the info panel accordingly
async function updateTwitchEmbed() {
  const liveEmbed = document.querySelector('#liveEmbed');
  const vodEmbed  = document.querySelector('#vodEmbed');
  const infoPanel = document.querySelector('.stream-info');

  // Guard — skip if elements don't exist (not on home page)
  if (!liveEmbed || !vodEmbed) return;

  try {
    const res  = await fetch(SUPABASE_FUNCTION_URL);
    const data = await res.json();

    if (data.isLive) {
      // Show live embed, hide VOD
      liveEmbed.style.visibility = 'initial';
      vodEmbed.style.visibility  = 'hidden';

      // Update info panel for live state
      if (infoPanel) {
        infoPanel.innerHTML = `
          <a href="https://www.twitch.tv/phuggie" target="_blank" class="stream-info-link">
            <div class="stream-status live">🔴 Live Now</div>
            <div class="stream-title">${data.stream.title}</div>
            <div class="stream-meta">${data.stream.game}</div>
          </a>
        `;
      }

    } else {
      // Show VOD embed, hide live
      liveEmbed.style.visibility = 'hidden';
      vodEmbed.style.visibility  = 'initial';

      // Set VOD source dynamically — only set when needed to avoid loading on page start
      vodEmbed.src = `https://player.twitch.tv/?video=${data.vod.id}&parent=phuggie.github.io`;

      // Update info panel for offline state
      if (infoPanel) {
        infoPanel.innerHTML = `
          <a href="https://www.twitch.tv/phuggie" target="_blank" class="stream-info-link">
            <div class="stream-status offline">Last Stream</div>
            <div class="stream-title">${data.vod.title}</div>
            <div class="stream-meta">${data.vod.date}</div>
          </a>
        `;
      }
    }

  } catch (error) {
    // If API call fails, fall back to showing live embed
    console.error('Twitch status check failed:', error);
    if (liveEmbed) liveEmbed.style.visibility = 'initial';
    if (vodEmbed)  vodEmbed.style.visibility  = 'hidden';
  }
}