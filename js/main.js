//Background image dimensions
const IMG_W = 6000;
const IMG_H = 3375;

//Pixel coordinates of the location where the dropdown should be
const CORNERS = {
  tl: { x: 4709, y: 14 },
  tr: { x: 5999, y: 14 },
  br: { x: 5999, y: 1640 },
  bl: { x: 4709, y: 1640 },
};

//Automatically positions and resizes the dropdown to match a verticle line on the home background image
function positionDropdown() {
  const hero     = document.querySelector('.hero');
  const dropdown = document.querySelector('.social-dropdown');

  if (!hero || !dropdown) return;

  const heroW = hero.offsetWidth;
  const heroH = hero.offsetHeight;

  const scale   = Math.max(heroW / IMG_W, heroH / IMG_H);
  const offsetX = (IMG_W * scale - heroW) / 2;
  const offsetY = (IMG_H * scale - heroH) / 2;

  function toScreen(px, py) {
    return {
      x: px * scale - offsetX,
      y: py * scale - offsetY,
    };
  }

  const tl = toScreen(CORNERS.tl.x, CORNERS.tl.y);
  const tr = toScreen(CORNERS.tr.x, CORNERS.tr.y);
  const br = toScreen(CORNERS.br.x, CORNERS.br.y);
  const bl = toScreen(CORNERS.bl.x, CORNERS.bl.y);

  const w = tr.x - tl.x;
  const h = bl.y - tl.y;

  dropdown.style.left   = tl.x + 'px';
  dropdown.style.top    = tl.y + 'px';
  dropdown.style.width  = w + 'px';
  dropdown.style.height = h + 'px';
}

// ─── Social dropdown toggle ───────────────────────────────────────────────
// Opens and closes the social links hamburger menu
function initSocialMenu() {
  const toggle   = document.getElementById('socialToggle');
  const dropdown = document.querySelector('.social-dropdown');

  if (!toggle || !dropdown) return;

  // Toggle open/closed on button click
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  // Close dropdown when clicking anywhere else on the page
  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
}

// ─── Shared page init ─────────────────────────────────────────────────────
window.addEventListener('load', () => {
  positionDropdown();
  initSocialMenu();
});