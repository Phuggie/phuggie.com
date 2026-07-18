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
  // Scale font size relative to dropdown height
  const fontSize = h / 17;
  dropdown.style.fontSize = fontSize + 'px';
}



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

// ─── Complaints button — runs away from cursor ────────────────────────────
function initComplaintsButton() {
  const btn = document.getElementById('complaintsBtn');
  if (!btn) return;

  let btnX = 0;
  let btnY = 0;
  let isFixed = false;

  function makeFixed() {
    if (isFixed) return;
    isFixed = true;

    // Grab current position before switching to fixed
    const rect = btn.getBoundingClientRect();
    btnX = rect.left;
    btnY = rect.top;

    btn.style.position = 'fixed';
    btn.style.left     = btnX + 'px';
    btn.style.top      = btnY + 'px';
  }

  document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    if (!isFixed) {
      // Check distance while still in nav flow
      const rect     = btn.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width  / 2;
      const btnCenterY = rect.top  + rect.height / 2;
      const dx       = btnCenterX - mouseX;
      const dy       = btnCenterY - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 200) makeFixed();
      return;
    }

    // Already fixed — flee logic
    const btnRect    = btn.getBoundingClientRect();
    const btnCenterX = btnRect.left + btnRect.width  / 2;
    const btnCenterY = btnRect.top  + btnRect.height / 2;

    const dx       = btnCenterX - mouseX;
    const dy       = btnCenterY - mouseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fleeRadius = 200;

    if (distance < fleeRadius) {
      const fleeSpeed = (fleeRadius - distance) / fleeRadius * 18;
      const normX = dx / distance;
      const normY = dy / distance;

      btnX += normX * fleeSpeed;
      btnY += normY * fleeSpeed;

      const margin = 10;
      btnX = Math.max(margin, Math.min(window.innerWidth  - btnRect.width  - margin, btnX));
      btnY = Math.max(margin, Math.min(window.innerHeight - btnRect.height - margin, btnY));

      btn.style.left = btnX + 'px';
      btn.style.top  = btnY + 'px';
    }
  });

  btn.addEventListener('mouseenter', () => {
    if (!isFixed) makeFixed();
    btnX = window.innerWidth  - 150;
    btnY = window.innerHeight - 100;
    btn.style.left = btnX + 'px';
    btn.style.top  = btnY + 'px';
  });
}

window.addEventListener('load', () => {
  positionDropdown();
  initSocialMenu();
  initComplaintsButton();
});

window.addEventListener('resize', () => {
  positionDropdown();
});