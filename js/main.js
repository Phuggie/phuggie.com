// ─── Monitor screen corner coordinates in the original photo (pixels) ───────
const IMG_W = 6000;
const IMG_H = 3375;

const CORNERS = {
  tl: { x: 2364, y: 1215 },
  tr: { x: 4073, y: 1192 },
  br: { x: 4070, y: 2010 },
  bl: { x: 2367, y: 2158 },
};

// ─── Main positioning function ───────────────────────────────────────────────
// Calculates how background-size:cover crops the hero image at the current
// window size, maps the monitor corners to screen coordinates, then applies
// a perspective-correct matrix3d transform to the Twitch embed iframe.
function positionEmbed() {
  const hero   = document.querySelector('.hero');
  const embed  = document.querySelector('.twitchEmbed');
  const iframe = document.querySelector('.twitchEmbed iframe');

  // Guard — main.js runs on every page; skip if these elements don't exist
  if (!hero || !embed || !iframe) return;

  const heroW = hero.offsetWidth;
  const heroH = hero.offsetHeight;

  // Calculate how background-size:cover scales and crops the image
  const scale   = Math.max(heroW / IMG_W, heroH / IMG_H);
  const offsetX = (IMG_W * scale - heroW) / 2;
  const offsetY = (IMG_H * scale - heroH) / 2;

  // Convert original image corners to screen pixel coordinates
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

  // Size and position the container using tl anchor and top/left edges
  const w = tr.x - tl.x;
  const h = bl.y - tl.y;

  embed.style.left   = tl.x + 'px';
  embed.style.top    = tl.y + 'px';
  embed.style.width  = w + 'px';
  embed.style.height = h + 'px';

  // Source rectangle corners (flat iframe) and destination trapezoid corners
  // (actual monitor screen shape) relative to tl anchor
  const src = [[0,0],[w,0],[w,h],[0,h]];
  const dst = [
    [0,            0           ],
    [tr.x - tl.x, tr.y - tl.y],
    [br.x - tl.x, br.y - tl.y],
    [bl.x - tl.x, bl.y - tl.y],
  ];

  const H = solveHomography(src, dst);

  // CSS matrix3d is column-major — map 3x3 homography to 4x4
  // H indices: [0]=a [1]=b [2]=c [3]=d [4]=e [5]=f [6]=g [7]=h [8]=i
  iframe.style.transformOrigin = '0 0';
  iframe.style.transform = `matrix3d(
    ${H[0]}, ${H[3]}, 0, ${H[6]},
    ${H[1]}, ${H[4]}, 0, ${H[7]},
    0,       0,       1, 0,
    ${H[2]}, ${H[5]}, 0, ${H[8]}
  )`;
}

// ─── Homography solver ───────────────────────────────────────────────────────
// Finds the 3x3 perspective transform matrix that maps src rectangle corners
// to dst trapezoid corners. Uses inverse iteration with LU decomposition
// (with partial pivoting) to find the smallest eigenvector of ATA — the
// null space of the constraint matrix A, which is the exact homography solution.
function solveHomography(src, dst) {
  // Build 8x9 constraint matrix A from point correspondences
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [x, y]   = src[i];
    const [xp, yp] = dst[i];
    A.push([-x, -y, -1,  0,  0,  0,  x*xp,  y*xp,  xp]);
    A.push([ 0,  0,  0, -x, -y, -1,  x*yp,  y*yp,  yp]);
  }

  // Build ATA (9x9) — symmetric positive semi-definite
  const n = 9;
  const ATA = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let r = 0; r < A.length; r++)
        ATA[i][j] += A[r][i] * A[r][j];

  // Inverse iteration with LU decomposition to find SMALLEST eigenvector
  // Deterministic initialization aligned with h[8] (our normalization target)
  const LU = luDecompose(ATA);
  let v = Array(n).fill(0);
  v[8] = 1;

  for (let iter = 0; iter < 200; iter++) {
    v = luSolve(LU, v);  // v = ATA^-1 * v → converges to smallest eigenvector
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);
  }

  // Normalize so h[8] = 1
  const s = v[8];
  return v.map(x => x / s);
}

// ─── LU decomposition with partial pivoting ──────────────────────────────────
// Factors matrix A into L (lower triangular) and U (upper triangular).
// Partial pivoting swaps rows to put the largest available value on the
// diagonal at each step, preventing division by near-zero values.
function luDecompose(A) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) =>
    Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  const U = A.map(row => [...row]);
  const P = Array.from({ length: n }, (_, i) => i);

  for (let col = 0; col < n; col++) {
    // Partial pivoting — find row with largest absolute value in this column
    let maxVal = Math.abs(U[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(U[row][col]) > maxVal) {
        maxVal = Math.abs(U[row][col]);
        maxRow = row;
      }
    }
    if (maxRow !== col) {
      [U[col], U[maxRow]] = [U[maxRow], U[col]];
      [P[col], P[maxRow]] = [P[maxRow], P[col]];
      for (let k = 0; k < col; k++)
        [L[col][k], L[maxRow][k]] = [L[maxRow][k], L[col][k]];
    }

    for (let row = col + 1; row < n; row++) {
      const factor = U[row][col] / U[col][col];
      L[row][col] = factor;
      for (let k = col; k < n; k++)
        U[row][k] -= factor * U[col][k];
    }
  }

  return { L, U, P };
}

// ─── LU solve ────────────────────────────────────────────────────────────────
// Solves Ax = b given LU decomposition of A.
// Forward substitution solves Ly = Pb, back substitution solves Ux = y.
function luSolve({ L, U, P }, b) {
  const n = L.length;

  // Apply row permutation from pivoting
  const pb = P.map(i => b[i]);

  // Forward substitution: Ly = pb
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = pb[i];
    for (let j = 0; j < i; j++)
      y[i] -= L[i][j] * y[j];
  }

  // Back substitution: Ux = y
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i + 1; j < n; j++)
      x[i] -= U[i][j] * x[j];
    x[i] /= U[i][i];
  }

  return x;
}

function typeWriter(element, text, speed = 80) {
  // Guard — skip if element doesn't exist
  if (!element) return;

  let i = 0;
  element.setAttribute('data-text', '');

  const interval = setInterval(() => {
    i++;
    // Update data-text one character at a time
    // Both ::before and ::after pseudo-elements read this attribute
    element.setAttribute('data-text', text.slice(0, i));

    if (i === text.length) {
      clearInterval(interval); // stop when fully typed
    }
  }, speed);
}

// Run on load — after positionEmbed so the page is ready
window.addEventListener('load', () => {
  positionEmbed();
  const h1 = document.querySelector('.intro h1');
  typeWriter(h1, 'twitch.tv/Phuggie', 80);
});

// ─── Event listeners ─────────────────────────────────────────────────────────
window.addEventListener('load', positionEmbed);
window.addEventListener('resize', positionEmbed);