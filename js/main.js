// ─── Social dropdown toggle ───────────────────────────────────────────────
// Opens and closes the social links hamburger menu
function initSocialMenu() {
  const toggle   = document.getElementById('socialToggle');
  const dropdown = document.getElementById('socialDropdown');

  if (!toggle || !dropdown) return;

  // Toggle open/closed on button click
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    // stopPropagation prevents the click from immediately
    // triggering the document click listener below
    dropdown.classList.toggle('open');
  });

  // Close dropdown when clicking anywhere else on the page
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
}

// Add initSocialMenu() to your load listener
window.addEventListener('load', () => {
  positionEmbed();
  updateTwitchEmbed();
  typeWriter(document.querySelector('.intro h1'), 'twitch.tv/Phuggie', 80);
  initSocialMenu();
});

window.addEventListener('load', () => {
  initSocialMenu();
});