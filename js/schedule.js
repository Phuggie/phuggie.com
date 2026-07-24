// ─── Stream schedule config ───────────────────────────────────────────────────
// Days: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// Times in CST (UTC-6) / CDT (UTC-5) — we calculate in local time then convert
const STREAM_SCHEDULE = [
  { day: 1, hour: 17, minute: 0 }, // Monday    5:00 PM
  { day: 3, hour: 17, minute: 0 }, // Wednesday 5:00 PM
  { day: 5, hour: 17, minute: 0 }, // Friday    5:00 PM
  { day: 6, hour: 12, minute: 0 }, // Saturday  12:00 PM
];

// CST is UTC-6, CDT is UTC-5
// We'll use UTC-6 (CST) as the base offset
const CST_OFFSET = -6;

// ─── Countdown ───────────────────────────────────────────────────────────────
// Calculates time remaining until the next scheduled stream
function getNextStreamTime() {
  const now = new Date();

  // Current time in CST
  const nowCST = new Date(now.getTime() + (CST_OFFSET * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));

  let nearest = null;

  for (const slot of STREAM_SCHEDULE) {
    // Build a candidate date for this slot in the current week
    const candidate = new Date(nowCST);
    candidate.setHours(slot.hour, slot.minute, 0, 0);

    // Adjust to correct day of week
    const diff = slot.day - nowCST.getDay();
    candidate.setDate(candidate.getDate() + diff);

    // If this slot is in the past, push to next week
    if (candidate <= nowCST) {
      candidate.setDate(candidate.getDate() + 7);
    }

    if (!nearest || candidate < nearest) {
      nearest = candidate;
    }
  }

  return nearest;
}

function updateCountdown() {
  const next    = getNextStreamTime();
  const now     = new Date();
  const nowCST  = new Date(now.getTime() + (CST_OFFSET * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
  const diff    = next - nowCST;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent    = '00';
    document.getElementById('cd-hours').textContent   = '00';
    document.getElementById('cd-minutes').textContent = '00';
    document.getElementById('cd-seconds').textContent = '00';
    return;
  }

  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Pad single digits with leading zero
  document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
  document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
  document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
}

// ─── Upcoming events ──────────────────────────────────────────────────────────
// Fetches events from Strapi and renders them
async function loadEvents() {
  const list = document.getElementById('eventsList');
  if (!list) return;

  try {
    // Sort by event_date ascending so soonest events show first
    // filters[event_date][$gte] = only show future events
    const now = new Date().toISOString();
    const res = await fetch(
    `http://localhost:1337/api/stream-events?sort=event_date:asc&filters[event_date][$gte]=${now}&populate=*`
    );

    if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
    const data = await res.json();
    const events = data.data;

    if (!events || events.length === 0) {
      list.innerHTML = `<div class="events-empty">No upcoming events scheduled. Check back soon!</div>`;
      return;
    }

    list.innerHTML = events.map(event => {
      const date     = new Date(event.event_date);
      const month    = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum   = date.getDate();
      const time     = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

      return `
        <div class="event-card ${event.is_special ? 'special' : ''}">
          <div class="event-date-block">
            <div class="event-month">${month}</div>
            <div class="event-day-num">${dayNum}</div>
          </div>
          <div class="event-divider"></div>
          <div class="event-info">
            ${event.is_special ? '<div class="event-special-badge">⭐ Special Event</div>' : ''}
            <div class="event-title">${event.title}</div>
            ${event.game        ? `<div class="event-game">🎮 ${event.game}</div>` : ''}
            ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
          </div>
          <div class="event-time">${time}</div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load events:', error);
    list.innerHTML = `<div class="events-empty">Unable to load events right now. Check back soon!</div>`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  updateCountdown();
  setInterval(updateCountdown, 1000); // update every second
  loadEvents();
});