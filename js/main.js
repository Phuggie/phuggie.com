const IMG_W = 6000;
const IMG_H = 3375;

const CORNERS = {
  tl: { x: 2364, y: 1215 },
  tr: { x: 4073, y: 1192 },
  br: { x: 4070, y: 2010 },
  bl: { x: 2367, y: 2158 },
};

function positionEmbed() {
  const hero   = document.querySelector('.hero');
  const embed  = document.querySelector('.twitchEmbed');
  const iframe = document.querySelector('.twitchEmbed iframe');

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

  // Destination trapezoid corners relative to tl anchor
  const src = [[0,0],[w,0],[w,h],[0,h]];
  const dst = [
    [0,             0            ],
    [tr.x - tl.x,  tr.y - tl.y ],
    [br.x - tl.x,  br.y - tl.y ],
    [bl.x - tl.x,  bl.y - tl.y ],
  ];

  const H = solveHomography(src, dst);

  // CSS matrix3d is column-major — map 3x3 homography to 4x4
  // H indices: [0]=a [1]=b [2]=c [3]=d [4]=e [5]=f [6]=g [7]=h [8]=i
  // matrix3d column order: col1, col2, col3, col4
  iframe.style.transformOrigin = '0 0';
  iframe.style.transform = `matrix3d(
    ${H[0]}, ${H[3]}, 0, ${H[6]},
    ${H[1]}, ${H[4]}, 0, ${H[7]},
    0,       0,       1, 0,
    ${H[2]}, ${H[5]}, 0, ${H[8]}
  )`;
}

function solveHomography(src, dst) {
  // Build 8x9 matrix A from point correspondences
  const A = [];
  for (let i = 0; i < 4; i++) {
    const [x, y]   = src[i];
    const [xp, yp] = dst[i];
    A.push([-x, -y, -1,  0,  0,  0,  x*xp,  y*xp,  xp]);
    A.push([ 0,  0,  0, -x, -y, -1,  x*yp,  y*yp,  yp]);
  }

  // Build ATA (9x9)
  const n = 9;
  const ATA = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let r = 0; r < A.length; r++)
        ATA[i][j] += A[r][i] * A[r][j];

  // Inverse iteration to find SMALLEST eigenvector
  // (power iteration finds largest — we need smallest, so we invert)
  const LU = luDecompose(ATA);
  let v = Array(n).fill(1).map((_, i) => i === 0 ? 1 : Math.random() * 0.01);
  let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  v = v.map(x => x / norm);

  for (let iter = 0; iter < 200; iter++) {
    v = luSolve(LU, v);  // v = ATA^-1 * v  →  converges to smallest eigenvector
    norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);
  }

  // Normalize so h[8] = 1
  const s = v[8];
  return v.map(x => x / s);
}

function luDecompose(A) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
  const U = A.map(row => [...row]);
  const P = Array.from({ length: n }, (_, i) => i); // pivot index

  for (let col = 0; col < n; col++) {
    // Partial pivoting
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

function luSolve({ L, U, P }, b) {
  const n = L.length;

  // Apply permutation
  const pb = P.map(i => b[i]);

  // Forward substitution Ly = pb
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = pb[i];
    for (let j = 0; j < i; j++)
      y[i] -= L[i][j] * y[j];
  }

  // Back substitution Ux = y
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i + 1; j < n; j++)
      x[i] -= U[i][j] * x[j];
    x[i] /= U[i][i];
  }

  return x;
}

// Run on load and on every resize
window.addEventListener('load', positionEmbed);
window.addEventListener('resize', positionEmbed);