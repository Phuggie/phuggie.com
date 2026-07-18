const DROPDOWN_CORNERS = {
  tl: { x: 4709, y: 14 },
  tr: { x: 5999, y: 14 },
  br: { x: 5999, y: 1640 },
  bl: { x: 4709, y: 1640 },
};

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

  const tl = toScreen(DROPDOWN_CORNERS.tl.x, DROPDOWN_CORNERS.tl.y);
  const tr = toScreen(DROPDOWN_CORNERS.tr.x, DROPDOWN_CORNERS.tr.y);
  const br = toScreen(DROPDOWN_CORNERS.br.x, DROPDOWN_CORNERS.br.y);
  const bl = toScreen(DROPDOWN_CORNERS.bl.x, DROPDOWN_CORNERS.bl.y);

  const w = tr.x - tl.x;
  const h = bl.y - tl.y;

  // Position relative to viewport, accounting for nav height
  dropdown.style.position = 'fixed';
  dropdown.style.right    = (heroW - tr.x) + 'px';
  dropdown.style.top      = '60px'; // sits just below nav
  dropdown.style.width    = w + 'px';
  dropdown.style.height   = h + 'px';
}

// Scale font size relative to dropdown height
// Dividing by 10 gives a comfortable ratio — adjust the divisor to taste
const fontSize = h / 10;
dropdown.style.fontSize = fontSize + 'px';
dropdown.style.setProperty('--dropdown-gap', (fontSize * 0.8) + 'px');

function initSocialMenu() {
  const toggle   = document.getElementById('socialToggle');
  const dropdown = document.querySelector('.social-dropdown');

  if (!toggle || !dropdown) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('open');
    // Animate hamburger to X
    toggle.classList.toggle('is-open', isOpen);
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
    toggle.classList.remove('is-open');
  });
}

window.addEventListener('load', () => {
  positionDropdown();
  initSocialMenu();
});

window.addEventListener('resize', () => {
  positionDropdown();
});