// ─── Stream schedule config ───────────────────────────────────────────────────
const STREAM_SCHEDULE = [
  { day: 1, hour: 17, minute: 0 },
  { day: 3, hour: 17, minute: 0 },
  { day: 5, hour: 17, minute: 0 },
  { day: 6, hour: 12, minute: 0 },
];

const CST_OFFSET = -6; // CST = UTC-6

// ─── Convert CST time to user's local time ────────────────────────────────────
// Takes hour and minute in CST and returns a formatted string in local timezone
function cstToLocal(hour, minute) {
  const now = new Date();

  // Build a date object for this week's occurrence at the given CST time
  // Use a fixed date — today's date — just to get the timezone conversion right
  const cstDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hour - CST_OFFSET, // convert CST hour to UTC
    minute
  ));

  return cstDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

// ─── Populate local times on weekly schedule cards ───────────────────────────
function populateLocalTimes() {
  const localTimeEls = document.querySelectorAll('.card-time-local');
  localTimeEls.forEach(el => {
    const hour   = parseInt(el.dataset.cstHour);
    const minute = parseInt(el.dataset.cstMinute);
    const local  = cstToLocal(hour, minute);
    el.textContent = local;
  });
}

// ─── Countdown ───────────────────────────────────────────────────────────────
function getNextStreamTime() {
  const now    = new Date();
  const nowUTC = now.getTime() + now.getTimezoneOffset() * 60000;
  const nowCST = new Date(nowUTC + CST_OFFSET * 3600000);

  let nearest = null;

  for (const slot of STREAM_SCHEDULE) {
    const candidate = new Date(nowCST);
    candidate.setHours(slot.hour, slot.minute, 0, 0);
    const diff = slot.day - nowCST.getDay();
    candidate.setDate(candidate.getDate() + diff);
    if (candidate <= nowCST) candidate.setDate(candidate.getDate() + 7);
    if (!nearest || candidate < nearest) nearest = candidate;
  }

  return nearest;
}

function updateCountdown() {
  const next   = getNextStreamTime();
  const now    = new Date();
  const nowUTC = now.getTime() + now.getTimezoneOffset() * 60000;
  const nowCST = new Date(nowUTC + CST_OFFSET * 3600000);
  const diff   = next - nowCST;

  if (diff <= 0) {
    ['cd-days','cd-hours','cd-minutes','cd-seconds'].forEach(id => {
      document.getElementById(id).textContent = '00';
    });
    return;
  }

  const days    = Math.floor(diff / 86400000);
  const hours   = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  document.getElementById('cd-days').textContent    = String(days).padStart(2, '0');
  document.getElementById('cd-hours').textContent   = String(hours).padStart(2, '0');
  document.getElementById('cd-minutes').textContent = String(minutes).padStart(2, '0');
  document.getElementById('cd-seconds').textContent = String(seconds).padStart(2, '0');
}

// ─── Upcoming streams ─────────────────────────────────────────────────────────
async function loadEvents() {
  const list = document.getElementById('eventsList');
  if (!list) return;

  try {
    const now = new Date().toISOString();
    const res = await fetch(
      `https://phuggie-cms.onrender.com/api/stream-events?sort=event_date:asc&filters[event_date][$gte]=${now}&populate=*`
    );
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data   = await res.json();
    const events = data.data;

    if (!events || events.length === 0) {
      list.innerHTML = `<div class="events-empty">No upcoming streams scheduled. Check back soon!</div>`;
      return;
    }

    list.innerHTML = events.map(event => {
      const date    = new Date(event.event_date);
      const month   = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum  = date.getDate();

      // CST time display
      const timeCSTStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Chicago',
        timeZoneName: 'short',
      });

      // User's local time
      const timeLocalStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      // Only show local time if it differs from CST
      const userTZ   = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isCSTUser = userTZ === 'America/Chicago' || userTZ === 'America/Indiana/Indianapolis';
      const localTimeHTML = !isCSTUser
        ? `<span class="event-time-local">${timeLocalStr}</span>`
        : '';

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
          <div class="event-times">
            <span class="event-time-cst">${timeCSTStr}</span>
            ${localTimeHTML}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Failed to load events:', error);
    list.innerHTML = `<div class="events-empty">Unable to load streams right now. Check back soon!</div>`;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  populateLocalTimes();
  updateCountdown();
  setInterval(updateCountdown, 1000);
  loadEvents();
});