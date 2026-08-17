// ContextJule sprite engine. Girl "1b": strawberry twin tails, denim jacket over cream tank, teal eyes.
// Transparent background always. Only in-scene EFFECTS and props are drawn around her.
export const PAL = {
  o: '#221b2c', h: '#b0523c', l: '#d1795a', s: '#f6ceac', S: '#dda87f', k: '#ec8f96',
  w: '#3f5a7a', W: '#2c4059', t: '#e8e2d6', T: '#c2bbad', r: '#3a4a63', R: '#2a3648',
  b: '#e8e2d6', B: '#c2bbad', e: '#2f8f8f', E: '#1c5a5a', u: '#fff9f2', i: '#f0b13f',
  c: '#7ecad6', C: '#4a93a8', x: '#e04a4a', g: '#7bbf6a', n: '#6a6478', N: '#928ba6',
  d: '#a3814f', D: '#6d5433', f: '#4a4458', m: '#8f5f3f', p: '#b58ad6', P: '#8659ad',
  y: '#f5e07a', z: '#c9a227', q: '#9aa3b5', Q: '#5d6675',
  A: '#4fb3e8', a: '#2f7fb8', G: '#5aa84f', V: '#33683a', J: '#2a2136', j: '#3d3150',
  H: '#8a3f2e', L: '#ffb066', M: '#c96a2e'
};

export const STATES = [
  { id: 'fresh', label: 'Fresh', tokens: '0 – 5k', accent: '#7bbf6a', note: 'Standing tall, tails up, small pack, easy smile.' },
  { id: 'loaded', label: 'Loaded', tokens: '5k – 32k', accent: '#f0b13f', note: 'Wider stance, pack stuffed with scrolls, focused.' },
  { id: 'heavy', label: 'Heavy', tokens: '32k – 128k', accent: '#e08a3a', note: 'Knees bent, pack towering, brow down. Sweat is its own layer.' },
  { id: 'crashed', label: 'Crashed', tokens: '128k +', accent: '#e04a4a', note: 'Face down, pack toppled. Dizzy swirl is its own layer.' },
  { id: 'chest', label: 'Loot chest', tokens: 'on reset', accent: '#f0b13f', note: 'Closed, then burst open. Lid and particles are separate layers.' }
];

export const ACTIONS = [
  { id: 'idle', label: 'Idle', use: 'Default loop', frames: 8, fps: 8, loop: true },
  { id: 'wave', label: 'Wave', use: 'App launch and quit', frames: 12, fps: 12, loop: false },
  { id: 'walk', label: 'Walk', use: 'Crossing the screen, drag', frames: 8, fps: 10, loop: true },
  { id: 'listen', label: 'Listening', use: 'User is typing', frames: 8, fps: 8, loop: true },
  { id: 'think', label: 'Thinking', use: 'Model is generating', frames: 12, fps: 10, loop: true },
  { id: 'type', label: 'Typing along', use: 'Tokens streaming in', frames: 8, fps: 10, loop: true },
  { id: 'cheer', label: 'Cheer', use: 'Task done, chest opened', frames: 12, fps: 12, loop: false },
  { id: 'catch', label: 'Catch', use: 'File dropped on window', frames: 12, fps: 12, loop: false },
  { id: 'zap', label: 'Overload', use: 'Context near ceiling', frames: 12, fps: 12, loop: true },
  { id: 'crash', label: 'Collapse', use: 'Context full', frames: 12, fps: 10, loop: false },
  { id: 'sweep', label: 'Sweep', use: 'Context cleared', frames: 12, fps: 12, loop: false },
  { id: 'sip', label: 'Sip', use: 'Long idle, between turns', frames: 12, fps: 8, loop: false },
  { id: 'stretch', label: 'Stretch', use: 'Wake from sleep', frames: 12, fps: 10, loop: false },
  { id: 'nap', label: 'Nap', use: 'Idle timeout', frames: 8, fps: 6, loop: true },
  { id: 'bed', label: 'In bed', use: 'App asleep, deep idle', frames: 8, fps: 5, loop: true },
  { id: 'turn', label: 'Turn', use: 'Show off gear, cosmetics preview', frames: 8, fps: 8, loop: true },
  { id: 'boop', label: 'Boop', use: 'User clicks her', frames: 8, fps: 12, loop: false },
  { id: 'held', label: 'Held', use: 'Dragged by the cursor', frames: 6, fps: 8, loop: true },
  { id: 'dump', label: 'Backpack dump', use: 'Context cleanse', frames: 12, fps: 10, loop: false },
  { id: 'nudge', label: 'Nudge', use: 'Proactive suggestion', frames: 8, fps: 10, loop: false }
];

export const ITEMS = [
  { id: 'hat-wizard', label: 'Wizard hat', slot: 'head' },
  { id: 'hat-cowboy', label: 'Cowboy hat', slot: 'head' },
  { id: 'crown', label: 'Royal crown', slot: 'head' },
  { id: 'pack-battery', label: 'Battery pack', slot: 'back' },
  { id: 'pack-vault', label: 'Bank vault', slot: 'back' },
  { id: 'campfire', label: 'Campfire', slot: 'scene' }
];

const pick = (arr, f) => arr[f % arr.length];

export class Jule {
  // ---- grid plumbing -------------------------------------------------------
  mk(w, h) { const g = Array.from({ length: h }, () => Array(w).fill('.')); return g; }
  r(g, x1, y1, x2, y2, c) {
    const w = g[0].length, h = g.length;
    for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c;
  }
  d(g, x, y, c) { this.r(g, x, y, x, y, c); }
  shift(g, dy, dx) {
    dx = dx || 0; if (!dy && !dx) return g;
    const out = this.mk(g[0].length, g.length);
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < g.length && nx >= 0 && nx < g[0].length) out[ny][nx] = g[y][x];
    }
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) g[y][x] = out[y][x];
    return g;
  }
  outline(g, col) {
    const src = g.map(row => row.slice());
    const at = (x, y) => (src[y] && src[y][x]) || '.';
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      if (src[y][x] !== '.') continue;
      if (at(x - 1, y) !== '.' || at(x + 1, y) !== '.' || at(x, y - 1) !== '.' || at(x, y + 1) !== '.') g[y][x] = col || 'o';
    }
  }
  shadow(g, unit) {
    const out = [];
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      const k = g[y][x];
      if (k === '.') continue;
      out.push((x * unit) + 'px ' + (y * unit) + 'px 0 0 ' + (PAL[k] || '#ff00ff'));
    }
    return out.join(',');
  }
  scale(g, n) {
    const out = this.mk(g[0].length * n, g.length * n);
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++)
      for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) out[y * n + j][x * n + k] = g[y][x];
    return out;
  }

  // ---- face ---------------------------------------------------------------
  eye(g, x, y, kind) {
    if (kind === 'none') return;
    switch (kind) {
      case 'closed': this.r(g, x, y + 1, x + 2, y + 1, 'h'); return;
      case 'half': this.r(g, x, y + 1, x + 2, y + 2, 'e'); this.r(g, x, y + 1, x + 2, y + 1, 'h'); return;
      case 'happy': this.d(g, x, y + 1, 'h'); this.r(g, x + 1, y, x + 2, y, 'h'); this.d(g, x + 1, y + 1, 'h'); return;
      case 'squint': this.r(g, x, y + 1, x + 2, y + 1, 'h'); this.d(g, x + 1, y + 2, 'h'); return;
      case 'up': this.r(g, x, y, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'E'); this.d(g, x + 1, y, 'u'); return;
      case 'lookL': this.r(g, x, y, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'E'); this.d(g, x, y + 1, 'u'); this.d(g, x + 2, y + 1, 'E'); return;
      case 'lookR': this.r(g, x, y, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'E'); this.d(g, x + 2, y + 1, 'u'); this.d(g, x, y + 1, 'E'); return;
      case 'sparkle':
        this.r(g, x, y, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'E');
        this.d(g, x, y + 1, 'u'); this.d(g, x + 2, y + 2, 'u'); this.d(g, x + 1, y + 1, 'y'); return;
      case 'spiral':
        this.r(g, x, y, x + 2, y + 2, 'u'); this.d(g, x + 1, y, 'E'); this.d(g, x, y + 1, 'E');
        this.d(g, x + 2, y + 1, 'E'); this.d(g, x + 1, y + 2, 'E'); this.d(g, x + 1, y + 1, 'e'); return;
      case 'spiral2':
        this.r(g, x, y, x + 2, y + 2, 'u'); this.d(g, x, y, 'E'); this.d(g, x + 2, y, 'E');
        this.d(g, x + 1, y + 1, 'E'); this.d(g, x, y + 2, 'E'); this.d(g, x + 2, y + 2, 'e'); return;
      case 'wide':
        this.r(g, x, y - 1, x + 2, y + 2, 'u'); this.r(g, x, y - 1, x + 2, y - 1, 'h');
        this.r(g, x, y, x + 1, y + 1, 'e'); this.d(g, x, y, 'u'); return;
      case 'strain': this.r(g, x, y + 1, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'h'); this.d(g, x, y + 1, 'u'); return;
      default:
        this.r(g, x, y, x + 2, y + 2, 'e'); this.r(g, x, y, x + 2, y, 'E');
        this.d(g, x, y + 1, 'u'); this.d(g, x + 2, y + 2, 'i');
    }
  }
  mouth(g, kind) {
    switch (kind) {
      case 'open': this.r(g, 14, 20, 15, 21, 'E'); break;
      case 'ohh': this.r(g, 14, 20, 15, 21, 'E'); this.d(g, 14, 20, 'h'); break;
      case 'wide': this.r(g, 13, 20, 16, 21, 'E'); this.r(g, 14, 21, 15, 21, 'k'); break;
      case 'grin': this.r(g, 12, 20, 17, 21, 'E'); this.r(g, 13, 20, 16, 20, 'u'); this.r(g, 14, 21, 15, 21, 'k'); break;
      case 'yawn': this.r(g, 13, 19, 16, 22, 'E'); this.r(g, 14, 20, 15, 20, 'h'); this.r(g, 14, 22, 15, 22, 'k'); break;
      case 'flat': this.r(g, 14, 20, 15, 20, 'S'); break;
      case 'wobble': this.d(g, 13, 20, 'E'); this.d(g, 14, 21, 'E'); this.d(g, 15, 20, 'E'); break;
      case 'sleep': this.r(g, 14, 20, 15, 20, 'E'); this.d(g, 15, 21, 'E'); break;
      case 'grit': this.r(g, 13, 20, 16, 20, 'E'); this.d(g, 14, 20, 'u'); this.d(g, 15, 20, 'u'); break;
      case 'sip': this.r(g, 14, 20, 15, 20, 'E'); this.d(g, 13, 20, 'S'); break;
      case 'drink': this.r(g, 14, 19, 16, 21, 'E'); this.r(g, 15, 20, 16, 20, 'k'); this.d(g, 13, 20, 'S'); break;
      case 'swallow': this.r(g, 13, 20, 15, 20, 'E'); this.d(g, 14, 21, 'S'); break;
      case 'smirk': this.r(g, 14, 20, 16, 20, 'E'); this.d(g, 16, 19, 'E'); break;
      default: this.r(g, 14, 20, 15, 20, 'E');
    }
  }
  hair(g, o) {
    const sway = o.sway || 0, lift = o.tailLift || 0;
    if (o.hat || this._hat) {
      // crown flattened under a hat brim; the fringe still shows below it
      this.r(g, 9, 11, 20, 15, 'h'); this.r(g, 8, 12, 21, 19, 'h');
    } else {
      this.r(g, 10, 9, 19, 9, 'h'); this.r(g, 9, 10, 20, 10, 'h');
      this.r(g, 8, 11, 21, 15, 'h'); this.r(g, 8, 16, 21, 19, 'h');
    }
    if (o.spike) {
      [[9, 4], [11, 2], [13, 5], [15, 1], [17, 4], [19, 2], [21, 6]].forEach(p => this.r(g, p[0], p[1] + (o.spikeLift || 0), p[0], 10, 'h'));
      [[10, 3], [16, 0], [20, 1]].forEach(p => this.d(g, p[0], p[1] + (o.spikeLift || 0), 'l'));
    }
    const drop = Math.abs(sway) + lift, lt = 4 + sway, rt = 22 + sway;
    // scalp bridges: keep both tails welded to the head mass at every sway/lift
    this.r(g, Math.min(lt + 3, 8), 16 - lift, 9, 19, 'h');
    this.r(g, 20, 16 - lift, Math.max(rt, 21), 19, 'h');
    this.r(g, lt, 16 - lift, lt + 3, 26 - drop, 'h'); this.r(g, lt + 1, 27 - drop, lt + 3, 28 - drop, 'h');
    this.r(g, lt, 15 - lift, lt + 3, 15 - lift, 'i'); this.d(g, lt + 1, 16 - lift, 'l');
    this.r(g, rt, 16 - lift, rt + 3, 26 - drop, 'h'); this.r(g, rt, 27 - drop, rt + 2, 28 - drop, 'h');
    this.r(g, rt, 15 - lift, rt + 3, 15 - lift, 'i'); this.d(g, rt + 2, 16 - lift, 'l');
  }
  face(g, o) {
    this.r(g, 9, 14, 20, 20, 's'); this.r(g, 10, 21, 19, 21, 's'); this.r(g, 12, 21, 17, 21, 'S');
    this.r(g, 8, 11, 21, 14, 'h'); this.r(g, 14, 11, 15, 14, 'l');
    this.r(g, 8, 15, 10, 17, 'h'); this.r(g, 19, 15, 21, 17, 'h');
    if (o.brow) { this.r(g, 11, 15, 13, 15, 'h'); this.r(g, 16, 15, 18, 15, 'h'); this.d(g, 13, 16, 'h'); this.d(g, 16, 16, 'h'); }
    if (o.browUp) { this.r(g, 11, 14, 13, 14, 'h'); this.r(g, 16, 14, 18, 14, 'h'); }
    if (o.blush !== false) { this.d(g, 10, 19, 'k'); this.d(g, 19, 19, 'k'); }
    this.eye(g, 11, 16, o.eyeL || o.eyes);
    this.eye(g, 16, 16, o.eyeR || o.eyes);
    if (o.blushBig) { this.r(g, 9, 19, 10, 19, 'k'); this.r(g, 19, 19, 20, 19, 'k'); this.d(g, 10, 18, 'k'); this.d(g, 19, 18, 'k'); }
    this.d(g, 14, 19, 'S');
    this.mouth(g, o.mouth);
    if (o.tear) { this.d(g, 9, 18, 'c'); this.d(g, 9, 19, 'C'); }
  }
  torso(g, o) {
    this.r(g, 13, 22, 16, 23, 's');
    this.r(g, 10, 24, 19, 28, 'w'); this.r(g, 13, 24, 16, 28, 't'); this.r(g, 13, 24, 16, 24, 'T');
    this.r(g, 12, 24, 12, 28, 'W'); this.r(g, 17, 24, 17, 28, 'W'); this.d(g, 12, 26, 'i');
    if (o.strap) { this.r(g, 11, 24, 11, 28, 'D'); this.r(g, 18, 24, 18, 28, 'D'); }
    const legs = o.legs;
    if (legs === 'sit') {
      this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 10, 32, 19, 32, 'R');
      this.r(g, 8, 31, 10, 33, 'r'); this.r(g, 19, 31, 21, 33, 'r');
      this.r(g, 8, 34, 11, 35, 'b'); this.r(g, 18, 34, 21, 35, 'b'); this.r(g, 8, 34, 11, 34, 'B');
    } else if (legs === 'kneel') {
      this.r(g, 10, 29, 19, 33, 'r'); this.r(g, 10, 33, 19, 33, 'R');
      this.r(g, 8, 34, 21, 36, 'r'); this.r(g, 8, 36, 21, 36, 'R');
    } else if (legs === 'bend') {
      this.r(g, 10, 29, 19, 31, 'r'); this.r(g, 10, 31, 19, 31, 'R');
      this.r(g, 10, 32, 13, 34, 'r'); this.r(g, 16, 32, 19, 34, 'r');
      this.r(g, 9, 35, 13, 36, 'b'); this.r(g, 16, 35, 20, 36, 'b'); this.r(g, 9, 35, 13, 35, 'B'); this.r(g, 16, 35, 20, 35, 'B');
    } else if (legs === 'wide') {
      this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 14, 29, 15, 32, 'R');
      this.r(g, 9, 33, 12, 34, 'r'); this.r(g, 17, 33, 20, 34, 'r');
      this.r(g, 8, 35, 12, 36, 'b'); this.r(g, 17, 35, 21, 36, 'b'); this.r(g, 8, 35, 12, 35, 'B'); this.r(g, 17, 35, 21, 35, 'B');
    } else if (legs === 'stride') {
      const st = o.stride || 0, back = o.back || 0;
      this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 14, 29, 15, 32, 'R');
      this.r(g, 9 + st, 33, 11 + st, 34, 'r'); this.r(g, 17 - back, 33, 19 - back, 34, 'r');
      this.r(g, 8 + st, 35, 11 + st, 36, 'b'); this.r(g, 17 - back, 35, 20 - back, 36, 'b');
      this.r(g, 8 + st, 35, 11 + st, 35, 'B'); this.r(g, 17 - back, 35, 20 - back, 35, 'B');
    } else if (legs === 'tip') {
      this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 14, 29, 15, 32, 'R');
      this.r(g, 11, 33, 13, 35, 'r'); this.r(g, 16, 33, 18, 35, 'r');
      this.r(g, 11, 36, 13, 36, 'b'); this.r(g, 16, 36, 18, 36, 'b');
    } else {
      this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 14, 29, 15, 32, 'R');
      this.r(g, 11, 33, 13, 34, 'r'); this.r(g, 16, 33, 18, 34, 'r');
      this.r(g, 11, 35, 13, 36, 'b'); this.r(g, 16, 35, 18, 36, 'b');
      this.r(g, 11, 35, 13, 35, 'B'); this.r(g, 16, 35, 18, 35, 'B');
    }
  }
  arms(g, o) {
    const L = o.armL || 'down', R = o.armR || 'down';
    const down = (x1, x2) => { this.r(g, x1, 24, x2, 27, 'w'); this.r(g, x1, 27, x2, 27, 'W'); this.r(g, x1, 28, x2, 29, 's'); };
    if (L === 'down') down(8, 9);
    else if (L === 'up') { this.r(g, 7, 20, 9, 24, 'w'); this.r(g, 7, 20, 9, 20, 'W'); this.r(g, 5, 17, 7, 19, 's'); }
    else if (L === 'upHigh') { this.r(g, 7, 17, 9, 24, 'w'); this.r(g, 7, 17, 9, 17, 'W'); this.r(g, 5, 13, 8, 16, 's'); }
    else if (L === 'out') { this.r(g, 6, 24, 9, 26, 'w'); this.r(g, 6, 26, 9, 26, 'W'); this.r(g, 4, 24, 5, 26, 's'); }
    else if (L === 'front') { this.r(g, 8, 24, 9, 26, 'w'); this.r(g, 9, 27, 11, 28, 's'); }
    else if (L === 'keys') { this.r(g, 8, 24, 10, 26, 'w'); this.r(g, 9, 27, 12, 29, 's'); }
    else if (L === 'keysUp') { this.r(g, 8, 24, 10, 25, 'w'); this.r(g, 9, 26, 12, 27, 's'); }
    else if (L === 'lap') { this.r(g, 9, 26, 11, 28, 'w'); this.r(g, 11, 29, 13, 30, 's'); }
    else if (L === 'hug') { this.r(g, 8, 25, 10, 27, 'w'); this.r(g, 10, 27, 13, 29, 's'); }
    else if (L === 'swingF') { this.r(g, 8, 24, 10, 27, 'w'); this.r(g, 9, 28, 11, 29, 's'); }
    else if (L === 'swingB') { this.r(g, 6, 24, 9, 27, 'w'); this.r(g, 5, 28, 7, 29, 's'); }
    else if (L === 'hip') { this.r(g, 7, 24, 9, 26, 'w'); this.r(g, 7, 27, 9, 28, 's'); }
    else if (L === 'broomL') { this.r(g, 8, 23, 10, 26, 'w'); this.r(g, 9, 21, 11, 22, 's'); }

    if (R === 'down') down(20, 21);
    else if (R === 'up') { this.r(g, 20, 20, 22, 24, 'w'); this.r(g, 20, 20, 22, 20, 'W'); this.r(g, 22, 17, 24, 19, 's'); }
    else if (R === 'upHigh') { this.r(g, 20, 17, 22, 24, 'w'); this.r(g, 20, 17, 22, 17, 'W'); this.r(g, 21, 13, 24, 16, 's'); }
    else if (R === 'wave') { this.r(g, 20, 21, 22, 24, 'w'); this.r(g, 22, 18, 23, 20, 's'); this.r(g, 23, 15, 25, 17, 's'); this.d(g, 24, 14, 's'); this.d(g, 22, 20, 'S'); }
    else if (R === 'wave2') { this.r(g, 20, 22, 23, 24, 'w'); this.r(g, 23, 20, 24, 21, 's'); this.r(g, 24, 18, 26, 20, 's'); this.d(g, 25, 17, 's'); this.d(g, 23, 21, 'S'); }
    else if (R === 'wave3') { this.r(g, 20, 21, 22, 24, 'w'); this.r(g, 21, 18, 23, 20, 's'); this.r(g, 21, 15, 23, 17, 's'); this.d(g, 22, 14, 's'); }
    else if (R === 'ear') { this.r(g, 20, 21, 21, 24, 'w'); this.r(g, 21, 17, 23, 19, 's'); this.d(g, 21, 20, 'S'); }
    else if (R === 'ear2') { this.r(g, 20, 20, 21, 24, 'w'); this.r(g, 21, 16, 23, 18, 's'); this.d(g, 22, 15, 's'); }
    else if (R === 'chin') { this.r(g, 19, 23, 21, 25, 'w'); this.r(g, 18, 21, 20, 22, 's'); this.r(g, 18, 21, 20, 21, 'S'); this.d(g, 17, 22, 'S'); }
    else if (R === 'chinTap') { this.r(g, 19, 23, 21, 25, 'w'); this.r(g, 18, 20, 20, 22, 's'); this.d(g, 18, 19, 's'); }
    else if (R === 'out') { this.r(g, 20, 24, 23, 26, 'w'); this.r(g, 20, 26, 23, 26, 'W'); this.r(g, 24, 24, 25, 26, 's'); }
    else if (R === 'front') { this.r(g, 20, 24, 21, 26, 'w'); this.r(g, 18, 27, 20, 28, 's'); }
    else if (R === 'keys') { this.r(g, 19, 24, 21, 26, 'w'); this.r(g, 17, 27, 20, 29, 's'); }
    else if (R === 'keysUp') { this.r(g, 19, 24, 21, 25, 'w'); this.r(g, 17, 26, 20, 27, 's'); }
    else if (R === 'lap') { this.r(g, 18, 26, 20, 28, 'w'); this.r(g, 16, 29, 18, 30, 's'); }
    else if (R === 'hug') { this.r(g, 19, 25, 21, 27, 'w'); this.r(g, 16, 27, 19, 29, 's'); }
    else if (R === 'broom') { this.r(g, 20, 22, 21, 25, 'w'); this.r(g, 21, 20, 22, 21, 's'); }
    else if (R === 'broomLow') { this.r(g, 20, 24, 22, 26, 'w'); this.r(g, 22, 26, 23, 27, 's'); }
    else if (R === 'cup') { this.r(g, 20, 23, 21, 26, 'w'); this.r(g, 19, 20, 21, 22, 's'); }
    else if (R === 'cupHigh') { this.r(g, 19, 22, 21, 25, 'w'); this.r(g, 18, 19, 20, 21, 's'); }
    else if (R === 'cupTilt') { this.r(g, 20, 22, 22, 25, 'w'); this.r(g, 19, 19, 22, 21, 's'); this.d(g, 19, 18, 's'); this.d(g, 22, 22, 'S'); }
    else if (R === 'cupTip') { this.r(g, 21, 22, 23, 25, 'w'); this.r(g, 20, 18, 23, 21, 's'); this.d(g, 20, 17, 's'); this.d(g, 23, 22, 'S'); }
    else if (R === 'strapPull') { this.r(g, 19, 23, 21, 26, 'w'); this.r(g, 19, 21, 21, 22, 's'); this.d(g, 20, 20, 's'); }
    else if (R === 'swingF') { this.r(g, 19, 24, 21, 27, 'w'); this.r(g, 18, 28, 20, 29, 's'); }
    else if (R === 'swingB') { this.r(g, 20, 24, 23, 27, 'w'); this.r(g, 22, 28, 24, 29, 's'); }
  }
  pack(g, level, lean) {
    lean = lean || 0;
    if (!level) return;
    if (level === 1) { this.r(g, 21, 25, 25, 30, 'd'); this.r(g, 21, 25, 25, 25, 'D'); this.r(g, 21, 28, 25, 28, 'D'); return; }
    if (level === 2) {
      this.r(g, 21, 20, 26, 30, 'd'); this.r(g, 21, 20, 26, 20, 'D'); this.r(g, 21, 25, 26, 25, 'D');
      this.r(g, 22, 16, 23, 19, 't'); this.r(g, 24, 17, 25, 19, 't'); this.r(g, 22, 16, 23, 16, 'T'); this.r(g, 24, 17, 25, 17, 'T');
      return;
    }
    const dx = Math.min(lean, 1);
    this.r(g, 21, 22, 27, 31, 'd'); this.r(g, 21, 22, 27, 22, 'D'); this.r(g, 21, 27, 27, 27, 'D');
    this.r(g, 20 + dx, 16, 27 + dx, 21, 'd'); this.r(g, 20 + dx, 16, 27 + dx, 16, 'D');
    this.r(g, 21 + dx, 11, 26 + dx, 15, 'd'); this.r(g, 21 + dx, 11, 26 + dx, 11, 'D');
    this.r(g, 22 + dx, 7, 25 + dx, 10, 't'); this.r(g, 22 + dx, 7, 25 + dx, 7, 'T'); this.r(g, 22 + dx, 9, 25 + dx, 9, 'T');
    this.r(g, 26 + dx, 12, 27 + dx, 14, 't'); this.d(g, 26 + dx, 12, 'T');
  }
  body(g, o) {
    o = o || {};
    this.pack(g, o.pack, o.packLean);
    this.hair(g, o);
    this.torso(g, o);
    this.arms(g, o);
    this.face(g, o);
  }
  // Collapsed: lying on her front, head left, cheek to the floor, face toward viewer.
  prone(g, o) {
    o = o || {};
    const dy = o.dy || 0;
    const R = (x1, y1, x2, y2, c) => this.r(g, x1, y1 + dy, x2, y2 + dy, c);
    const D = (x, y, c) => this.d(g, x, y + dy, c);

    // twin tails fanned out on the floor
    R(2, 25, 7, 27, 'h'); R(1, 24, 3, 26, 'h'); R(1, 24, 3, 24, 'l');
    R(4, 24, 6, 24, 'i');
    R(1, 33, 7, 35, 'h'); R(1, 35, 5, 36, 'h'); R(1, 35, 4, 35, 'l');
    R(5, 32, 6, 33, 'i');

    // head: skull cap of hair, face turned up toward the viewer
    R(5, 26, 14, 29, 'h'); R(4, 28, 5, 32, 'h'); R(14, 28, 15, 32, 'h');
    R(6, 29, 13, 33, 's'); R(7, 34, 12, 34, 's'); R(8, 34, 11, 34, 'S');
    R(6, 29, 13, 29, 'h'); R(9, 26, 11, 29, 'l');

    // shoulder, jacket, tank
    R(14, 30, 16, 34, 's');
    R(16, 28, 23, 35, 'w'); R(16, 28, 23, 28, 'W'); R(16, 35, 23, 35, 'W');
    R(18, 30, 21, 34, 't'); R(18, 30, 21, 30, 'T'); D(17, 32, 'i');

    // arm splayed forward past the head, palm open
    R(15, 33, 17, 35, 'w'); R(11, 35, 15, 36, 's'); R(11, 36, 14, 36, 'S');
    // far arm folded along the back
    R(17, 27, 21, 28, 'W'); R(21, 26, 23, 27, 's');

    // legs trailing right, one knee bent up
    R(23, 30, 27, 34, 'r'); R(23, 34, 27, 34, 'R'); R(24, 29, 27, 29, 'R');
    R(26, 26, 28, 29, 'r'); R(26, 26, 28, 26, 'R');
    R(26, 23, 28, 25, 'b'); R(26, 23, 28, 23, 'B');
    R(26, 31, 28, 33, 'b'); R(26, 31, 28, 31, 'B');

    // face: dizzy crosses or shut eyes, open mouth
    if (o.eyesX) {
      [[7, 30], [12, 30]].forEach(p => {
        D(p[0], p[1], 'E'); D(p[0] + 2, p[1], 'E'); D(p[0] + 1, p[1] + 1, 'E');
        D(p[0], p[1] + 2, 'E'); D(p[0] + 2, p[1] + 2, 'E');
      });
    } else {
      R(7, 31, 9, 31, 'h'); R(11, 31, 13, 31, 'h');
    }
    D(6, 32, 'k'); D(13, 32, 'k');
    R(9, 33, 11, 33, 'E'); D(10, 32, 'S');
  }
  // pack knocked over behind her, lid open, scrolls spilling out
  topple(g, x, y) {
    this.r(g, x, y, x + 8, y + 7, 'd'); this.r(g, x, y, x + 8, y, 'D'); this.r(g, x, y + 7, x + 8, y + 7, 'D');
    this.r(g, x, y + 3, x + 8, y + 3, 'D'); this.d(g, x + 4, y + 5, 'i');
    this.r(g, x - 3, y + 1, x - 1, y + 6, 'D'); this.r(g, x - 3, y + 1, x - 1, y + 1, 'd');
    this.r(g, x - 6, y + 2, x - 4, y + 4, 't'); this.r(g, x - 6, y + 2, x - 4, y + 2, 'T');
    this.r(g, x - 8, y + 6, x - 5, y + 7, 't'); this.r(g, x - 8, y + 7, x - 5, y + 7, 'T');
    this.r(g, x + 6, y - 3, x + 8, y - 1, 't'); this.d(g, x + 7, y - 3, 'T');
  }
  swirl(g, cx, cy, phase) {
    const pts = [[0, -2], [2, -1], [2, 1], [0, 2], [-2, 1], [-2, -1], [0, -1], [1, 0]];
    pts.forEach((p, i) => { if ((i + phase) % 4 !== 3) this.d(g, cx + p[0], cy + p[1], i % 2 ? 'N' : 'u'); });
  }
  sweat(g, spots) { spots.forEach(p => { this.d(g, p[0], p[1], 'c'); this.d(g, p[0], p[1] + 1, 'C'); }); }

  // ---- props --------------------------------------------------------------
  // chat box: rounded panel + tail + text lines. Used for listening / thinking.
  chatbox(g, x, y, w, h, lines, tail) {
    this.r(g, x + 1, y, x + w - 1, y, 'u'); this.r(g, x, y + 1, x + w, y + h - 1, 'u'); this.r(g, x + 1, y + h, x + w - 1, y + h, 'u');
    this.r(g, x + 1, y, x + w - 1, y, 'T');
    this.r(g, x + 1, y + h, x + w - 1, y + h, 'T'); this.d(g, x, y + 1, 'T'); this.d(g, x + w, y + 1, 'T');
    for (let i = 0; i < lines.length; i++) {
      const lw = lines[i]; if (lw <= 0) continue;
      this.r(g, x + 2, y + 2 + i * 2, x + 1 + lw, y + 2 + i * 2, i === 0 ? 'f' : 'n');
    }
    if (tail === 'left') { this.d(g, x, y + h - 1, 'u'); this.d(g, x - 1, y + h, 'u'); this.d(g, x - 1, y + h + 1, 'T'); }
    else if (tail === 'right') { this.d(g, x + w, y + h - 1, 'u'); this.d(g, x + w + 1, y + h, 'u'); this.d(g, x + w + 1, y + h + 1, 'T'); }
    else if (tail === 'think') { this.d(g, x + 2, y + h + 2, 'u'); this.r(g, x, y + h + 4, x + 1, y + h + 5, 'u'); }
  }
  // laptop she sits behind: lit screen with code lines, hinge, key deck.
  laptop(g, litRows, caret) {
    this.r(g, 5, 24, 24, 34, 'f'); this.r(g, 5, 24, 24, 24, 'n'); this.r(g, 5, 34, 24, 34, 'n');
    this.r(g, 6, 25, 23, 33, 'Q'); this.r(g, 7, 26, 22, 32, 'E');
    const widths = [12, 8, 14, 6, 10];
    for (let i = 0; i < 5; i++) {
      if (i >= litRows) break;
      const c = i === 0 ? 'c' : (i % 2 ? 'g' : 'u');
      this.r(g, 8, 27 + i, 7 + widths[i], 27 + i, c);
    }
    if (caret >= 0 && caret < 5) this.d(g, 8 + widths[caret], 27 + caret, 'i');
    this.r(g, 3, 35, 26, 37, 'N'); this.r(g, 3, 35, 26, 35, 'q'); this.r(g, 3, 37, 26, 37, 'n');
    for (let x = 5; x < 25; x += 3) { this.d(g, x, 36, 'Q'); this.d(g, x + 1, 36, 'Q'); }
    this.r(g, 11, 38, 18, 38, 'Q');
    this.d(g, 4, 25, 'c'); this.d(g, 25, 25, 'c');
  }
  // broom: rigid handle from grip (gx,gy) to head (hx,hy), bristle fan along that axis
  broom(g, gx, gy, hx, hy, arc) {
    const dx = hx - gx, dy = hy - gy, len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const steps = Math.round(len);
    for (let i = -3; i <= steps; i++) {
      const x = gx + ux * i, y = gy + uy * i;
      const c = (i >= 1 && i <= 4) ? 'i' : 'm';
      const c2 = (i >= 1 && i <= 4) ? 'z' : 'D';
      this.d(g, Math.round(x), Math.round(y), c);
      this.d(g, Math.round(x + px), Math.round(y + py), c2);
    }
    // ferrule
    for (let k = -1; k <= 1; k++) this.d(g, Math.round(hx + px * k), Math.round(hy + py * k), 'D');
    // bristle fan: widens as it goes past the head
    for (let i = 1; i <= 5; i++) {
      const cx = hx + ux * i, cy = hy + uy * i, spread = 1 + i * 0.7;
      for (let s = -spread; s <= spread; s += 0.6)
        this.d(g, Math.round(cx + px * s), Math.round(cy + py * s), i % 2 ? 'd' : 'D');
    }
    if (arc) {
      for (let i = 0; i < 6; i++) {
        const t = 3 + i * 1.6;
        this.d(g, Math.round(hx - ux * -1 + px * t * arc), Math.round(hy + py * t * arc + i * 0.4), i % 2 ? 'N' : 'q');
      }
    }
  }
  // mug. tilt 0 upright, 1 tipping, 2 pouring toward her mouth (rim on the left).
  // Ceramic teal, not cream — it must not dissolve into the tank behind it.
  mug(g, x, y, tilt, steam) {
    if (!tilt) {
      this.r(g, x, y, x + 4, y + 4, 'c'); this.r(g, x, y, x + 4, y, 'u');
      this.r(g, x + 1, y + 1, x + 3, y + 1, 'm'); this.r(g, x, y + 4, x + 4, y + 4, 'C');
      this.r(g, x + 5, y + 1, x + 5, y + 3, 'c'); this.d(g, x + 6, y + 2, 'C');
      this.d(g, x, y + 3, 'C'); this.d(g, x + 1, y + 3, 'u');
    } else if (tilt === 1) {
      this.r(g, x + 1, y, x + 4, y, 'u'); this.d(g, x, y + 1, 'u');
      this.r(g, x, y + 1, x + 4, y + 3, 'c'); this.r(g, x, y + 1, x + 2, y + 1, 'm');
      this.r(g, x, y + 4, x + 3, y + 4, 'C');
      this.r(g, x + 5, y + 1, x + 5, y + 3, 'c'); this.d(g, x + 6, y + 2, 'C');
      this.d(g, x + 1, y + 2, 'u');
    } else {
      this.r(g, x + 2, y - 1, x + 4, y - 1, 'u'); this.d(g, x + 1, y, 'u'); this.d(g, x, y + 1, 'u');
      this.r(g, x + 1, y, x + 4, y + 2, 'c'); this.r(g, x, y + 1, x + 3, y + 3, 'c');
      this.r(g, x, y + 1, x + 2, y + 1, 'm'); this.d(g, x, y + 2, 'm');
      this.r(g, x + 1, y + 4, x + 3, y + 4, 'C');
      this.r(g, x + 5, y, x + 5, y + 2, 'c'); this.d(g, x + 6, y + 1, 'C');
      this.d(g, x + 2, y + 2, 'u');
    }
    if (steam) { this.d(g, x + 1, y - 2, 'N'); this.d(g, x + 2, y - 4, 'N'); this.d(g, x + 1, y - 6, 'q'); this.d(g, x + 3, y - 3, 'q'); }
  }
  // detailed bed seen from the side: frame, mattress, layered blanket, pillow
  bed(g, breathe) {
    const b = breathe || 0;
    this.r(g, 1, 12, 5, 33, 'm'); this.r(g, 1, 12, 5, 13, 'd'); this.r(g, 1, 33, 5, 33, 'D');
    this.r(g, 2, 15, 4, 31, 'D'); this.r(g, 3, 16, 3, 30, 'm');
    this.d(g, 1, 12, 'd'); this.d(g, 5, 12, 'd');
    this.r(g, 24, 21, 28, 34, 'm'); this.r(g, 24, 21, 28, 22, 'd'); this.r(g, 25, 24, 27, 31, 'D');
    this.r(g, 5, 27, 27, 30, 't'); this.r(g, 5, 27, 27, 27, 'u'); this.r(g, 5, 30, 27, 30, 'T');
    for (let x = 7; x < 26; x += 4) this.d(g, x, 29, 'T');
    this.r(g, 4, 31, 28, 34, 'm'); this.r(g, 4, 31, 28, 31, 'd'); this.r(g, 4, 34, 28, 34, 'D');
    this.r(g, 5, 35, 7, 38, 'D'); this.r(g, 24, 35, 26, 38, 'D');
    this.r(g, 5, 35, 7, 35, 'm'); this.r(g, 24, 35, 26, 35, 'm');
    this.r(g, 12, 23 + b, 27, 30, 'w'); this.r(g, 12, 23 + b, 27, 23 + b, 'W');
    this.r(g, 12, 26 + b, 27, 26 + b, 'W'); this.r(g, 12, 24 + b, 27, 25 + b, 'w');
    this.r(g, 11, 24 + b, 12, 29, 'W');
    for (let x = 14; x < 27; x += 5) { this.r(g, x, 27, x + 1, 28, 'c'); this.d(g, x, 25 + b, 'C'); }
    this.r(g, 12, 22 + b, 21, 22 + b, 't'); this.r(g, 12, 21 + b, 18, 21 + b, 'T');
    this.r(g, 6, 20, 15, 26, 'u'); this.r(g, 6, 20, 15, 20, 't');
    this.r(g, 6, 26, 15, 26, 'T'); this.d(g, 6, 21, 'T'); this.d(g, 15, 25, 'T');
    this.r(g, 8, 24, 13, 25, 'T');
  }
  sheet(g, x, y, w, tilt) {
    this.r(g, x, y, x + w, y + 3, 't'); this.r(g, x, y, x + w, y, 'T'); this.r(g, x, y + 3, x + w, y + 3, 'T');
    this.r(g, x + 1, y + 1, x + w - 2, y + 1, 'n'); this.r(g, x + 1, y + 2, x + w - 4, y + 2, 'N');
    if (tilt) { this.d(g, x - 1, y + 1, 'T'); this.d(g, x + w + 1, y + 2, 'T'); }
  }
  zed(g, x, y, s, fade) {
    const c = fade ? 'N' : 'u';
    this.r(g, x, y, x + s, y, c); this.r(g, x, y + s, x + s, y + s, c);
    for (let i = 0; i <= s; i++) this.d(g, x + s - i, y + i, c);
  }
  // chest box only. The lid is a separate layer so it can fly on its own.
  chestBox(g, lidClosed) {
    this.r(g, 8, 26, 22, 34, 'd'); this.r(g, 8, 26, 22, 26, 'D'); this.r(g, 8, 34, 22, 34, 'D');
    this.r(g, 8, 30, 22, 30, 'D'); this.r(g, 14, 29, 16, 32, 'i'); this.d(g, 15, 31, 'z');
    if (lidClosed) {
      this.r(g, 8, 21, 22, 25, 'd'); this.r(g, 8, 21, 22, 21, 'D'); this.r(g, 8, 25, 22, 25, 'D');
      this.r(g, 14, 23, 16, 25, 'i');
    } else {
      this.r(g, 9, 23, 21, 25, 'i'); this.r(g, 9, 23, 21, 23, 'y');
      this.r(g, 9, 25, 21, 25, 'z');
      this.r(g, 8, 22, 9, 26, 'D'); this.r(g, 21, 22, 22, 26, 'D');
    }
  }
  // hinged lid. Pinned at the right rim of the box; the free left edge lifts.
  // y is the free edge's top row, tilt (negative) is how hard it swings up.
  chestLid(g, y, tilt) {
    for (let i = 0; i <= 14; i++) {
      const x = 8 + i, dy = Math.round((14 - i) * -tilt);
      this.r(g, x, y + dy, x, y + dy + 3, 'd');
      this.d(g, x, y + dy, 'D'); this.d(g, x, y + dy + 3, 'D');
    }
    const cd = Math.round(8 * -tilt);
    this.r(g, 14, y + cd + 1, 16, y + cd + 2, 'i');
    // hinge: the pinned end always meets the box rim
    const pin = y + Math.round(14 * -tilt);
    this.r(g, 21, pin, 22, 25, 'D'); this.d(g, 22, pin + 1, 'd');
  }
  itemSlot(id) { const it = ITEMS.find(i => i.id === id); return it ? it.slot : 'head'; }
  item(g, id, ox, oy) {
    ox = ox || 0; oy = oy || 0;
    const R = (x1, y1, x2, y2, c) => this.r(g, x1 + ox, y1 + oy, x2 + ox, y2 + oy, c);
    const D = (x, y, c) => this.d(g, x + ox, y + oy, c);
    if (id === 'hat-wizard') {
      R(13, 0, 16, 1, 'P'); R(12, 2, 17, 3, 'P'); R(11, 4, 18, 5, 'P'); R(10, 6, 19, 7, 'P');
      R(8, 8, 21, 9, 'p'); R(8, 8, 21, 8, 'P'); R(12, 6, 17, 6, 'i'); D(15, 3, 'y'); D(13, 5, 'y'); D(17, 8, 'y');
    } else if (id === 'hat-cowboy') {
      R(11, 2, 18, 5, 'm'); R(11, 2, 18, 2, 'D'); R(7, 6, 22, 8, 'm'); R(7, 6, 22, 6, 'd'); R(7, 8, 22, 8, 'D');
      R(11, 5, 18, 5, 'D'); D(13, 4, 'i'); D(16, 4, 'i');
    } else if (id === 'crown') {
      R(10, 4, 19, 8, 'i'); R(10, 4, 19, 4, 'y'); R(10, 8, 19, 8, 'z');
      R(10, 1, 11, 3, 'i'); R(14, 0, 15, 3, 'i'); R(18, 1, 19, 3, 'i');
      D(10, 1, 'y'); D(14, 0, 'y'); D(19, 1, 'y'); D(12, 6, 'x'); D(17, 6, 'c'); D(14, 6, 'g');
    } else if (id === 'pack-battery') {
      R(22, 20, 28, 31, 'q'); R(22, 20, 28, 20, 'Q'); R(22, 31, 28, 31, 'Q');
      R(23, 22, 27, 23, 'c'); R(23, 25, 27, 30, 'Q'); R(24, 26, 26, 29, 'g');
      D(25, 21, 'u'); R(23, 22, 27, 22, 'C');
    } else if (id === 'pack-vault') {
      R(22, 19, 29, 31, 'Q'); R(22, 19, 29, 19, 'q'); R(22, 31, 29, 31, 'n');
      R(23, 21, 28, 29, 'q'); R(24, 23, 27, 27, 'Q');
      D(25, 25, 'i'); D(26, 25, 'i'); R(25, 24, 26, 26, 'i'); D(28, 25, 'n');
    } else if (id === 'campfire') {
      R(4, 32, 26, 34, 'm'); R(6, 33, 24, 33, 'D');
      R(12, 26, 18, 31, 'i'); R(13, 22, 17, 25, 'y'); R(14, 19, 16, 21, 'y');
      R(13, 29, 17, 31, 'x'); D(15, 24, 'u'); D(14, 27, 'u');
      R(2, 34, 8, 35, 'D'); R(22, 34, 28, 35, 'D');
    }
  }

  // ============ turn cycle =================================================
  // Poses are authored facing the viewer's right; mirror() gives the other side.
  // Accessories are built INTO each pose, never stamped on top of one.
  mirror(g) { for (let y = 0; y < g.length; y++) g[y].reverse(); return g; }

  // three-quarter: head turned right, back rotated toward viewer-left
  head34(g, o) {
    o = o || {};
    this.r(g, 12, 9, 21, 9, 'h'); this.r(g, 11, 10, 22, 10, 'h');
    this.r(g, 10, 11, 23, 15, 'h'); this.r(g, 9, 12, 11, 21, 'h');
    this.r(g, 13, 14, 22, 20, 's'); this.r(g, 15, 21, 21, 21, 's'); this.r(g, 16, 21, 20, 21, 'S');
    this.r(g, 10, 11, 23, 13, 'h'); this.r(g, 16, 11, 18, 14, 'l');
    this.r(g, 22, 15, 23, 17, 'h');
    if (!o.hat) { this.r(g, 13, 14, 22, 14, 'h'); }
    if (o.eyes !== 'none') {
      this.eye(g, 14, 16, o.eyes === 'closed' ? 'closed' : 'lookR');
      this.r(g, 19, 16, 21, 18, 'e'); this.r(g, 19, 16, 21, 16, 'E'); this.d(g, 21, 17, 'u');
      if (o.eyes === 'closed') { this.r(g, 19, 17, 21, 17, 'h'); this.r(g, 19, 16, 21, 18, '.'); this.r(g, 19, 17, 21, 17, 'h'); }
    }
    this.d(g, 23, 18, 'S'); this.d(g, 23, 19, 'S');
    this.d(g, 13, 19, 'k'); this.d(g, 22, 19, 'k');
    if (o.mouth === 'smile') { this.r(g, 19, 20, 20, 20, 'E'); }
    else if (o.mouth === 'grin') { this.r(g, 18, 20, 21, 21, 'E'); this.r(g, 19, 20, 20, 20, 'u'); }
    else { this.r(g, 19, 20, 20, 20, 'E'); }
    // far tail tucked behind the skull, near tail swung out
    this.r(g, 7, 15, 10, 24, 'h'); this.r(g, 8, 25, 10, 26, 'h'); this.r(g, 7, 14, 10, 14, 'i');
    this.r(g, 23, 16, 26, 26, 'h'); this.r(g, 23, 27, 25, 28, 'h'); this.r(g, 23, 15, 26, 15, 'i');
  }
  torso34(g, o) {
    o = o || {};
    this.r(g, 15, 22, 18, 23, 's');
    this.r(g, 12, 24, 20, 28, 'w'); this.r(g, 12, 24, 20, 24, 'W');
    this.r(g, 16, 24, 18, 28, 't'); this.r(g, 16, 24, 18, 24, 'T');
    this.r(g, 19, 24, 19, 28, 'W'); this.d(g, 19, 26, 'i');
    this.r(g, 11, 24, 12, 27, 'W');
    this.r(g, 12, 29, 20, 32, 'r'); this.r(g, 16, 29, 17, 32, 'R');
    this.r(g, 12, 33, 14, 34, 'r'); this.r(g, 18, 33, 20, 34, 'r');
    this.r(g, 11, 35, 15, 36, 'b'); this.r(g, 17, 35, 21, 36, 'b');
    this.r(g, 11, 35, 15, 35, 'B'); this.r(g, 17, 35, 21, 35, 'B');
    if (o.arms !== false) {
      this.r(g, 20, 24, 22, 28, 'w'); this.r(g, 20, 28, 22, 28, 'W'); this.r(g, 20, 29, 22, 30, 's');
      this.r(g, 11, 25, 12, 28, 'w'); this.r(g, 11, 29, 12, 30, 's');
    }
  }
  headBack(g, o) {
    o = o || {};
    this.r(g, 10, 9, 19, 9, 'h'); this.r(g, 9, 10, 20, 10, 'h'); this.r(g, 8, 11, 21, 22, 'h');
    this.r(g, 13, 11, 16, 13, 'l');
    this.r(g, 12, 23, 17, 23, 's'); this.r(g, 12, 23, 17, 23, 'S');
    this.r(g, 4, 15, 7, 27, 'h'); this.r(g, 5, 28, 7, 29, 'h'); this.r(g, 4, 14, 7, 14, 'i');
    this.r(g, 22, 15, 25, 27, 'h'); this.r(g, 22, 28, 24, 29, 'h'); this.r(g, 22, 14, 25, 14, 'i');
  }
  torsoBack(g, o) {
    o = o || {};
    this.r(g, 10, 24, 19, 28, 'w'); this.r(g, 10, 24, 19, 24, 'W');
    this.r(g, 14, 24, 15, 28, 'W'); this.r(g, 11, 26, 11, 28, 'W'); this.r(g, 18, 26, 18, 28, 'W');
    this.r(g, 10, 29, 19, 32, 'r'); this.r(g, 14, 29, 15, 32, 'R');
    this.r(g, 11, 33, 13, 34, 'r'); this.r(g, 16, 33, 18, 34, 'r');
    this.r(g, 11, 35, 13, 36, 'b'); this.r(g, 16, 35, 18, 36, 'b');
    this.r(g, 11, 35, 13, 35, 'B'); this.r(g, 16, 35, 18, 35, 'B');
    if (o.arms !== false) {
      this.r(g, 8, 24, 9, 27, 'w'); this.r(g, 8, 27, 9, 27, 'W'); this.r(g, 8, 28, 9, 29, 's');
      this.r(g, 20, 24, 21, 27, 'w'); this.r(g, 20, 27, 21, 27, 'W'); this.r(g, 20, 28, 21, 29, 's');
    }
  }

  // ---- worn gear ---------------------------------------------------------
  // Front view of any back-slot item: only the harness shows. Straps run over
  // the shoulders, in toward the sternum clip, and vanish under the armpits.
  harness(g, tone) {
    const c = tone || 'D', hi = tone === 'Q' ? 'q' : 'd';
    this.r(g, 11, 24, 11, 25, c); this.r(g, 12, 26, 12, 28, c);
    this.r(g, 18, 24, 18, 25, c); this.r(g, 17, 26, 17, 28, c);
    this.d(g, 11, 24, hi); this.d(g, 18, 24, hi);
    this.r(g, 13, 26, 16, 26, c); this.r(g, 14, 26, 15, 26, 'i');
    this.d(g, 12, 27, hi); this.d(g, 17, 27, hi);
    this.d(g, 12, 29, c); this.d(g, 17, 29, c);
  }
  // Shoulder slivers: the top corners of whatever is on her back, peeking out.
  shoulderPeek(g, body, edge) {
    this.r(g, 8, 22, 10, 27, body); this.r(g, 19, 22, 21, 27, body);
    this.r(g, 8, 22, 10, 22, edge); this.r(g, 19, 22, 21, 22, edge);
    this.d(g, 8, 27, edge); this.d(g, 21, 27, edge);
  }
  // Back-slot geometry, drawn at a given anchor. mode: 'side' | 'back'
  gear(g, id, mode) {
    const x = mode === 'back' ? 10 : 5, y = mode === 'back' ? 20 : 21;
    const w = mode === 'back' ? 11 : 8;
    if (id === 'pack-battery') {
      this.r(g, x, y, x + w, y + 11, 'q'); this.r(g, x, y, x + w, y, 'Q'); this.r(g, x, y + 11, x + w, y + 11, 'Q');
      this.r(g, x + 1, y + 2, x + w - 1, y + 3, 'c'); this.r(g, x + 1, y + 2, x + w - 1, y + 2, 'C');
      this.r(g, x + 1, y + 5, x + w - 1, y + 10, 'Q'); this.r(g, x + 2, y + 6, x + w - 2, y + 9, 'g');
      this.d(g, x + Math.round(w / 2), y + 1, 'u');
    } else if (id === 'pack-vault') {
      this.r(g, x, y - 1, x + w, y + 11, 'Q'); this.r(g, x, y - 1, x + w, y - 1, 'q');
      this.r(g, x + 1, y + 1, x + w - 1, y + 9, 'q'); this.r(g, x + 2, y + 3, x + w - 2, y + 7, 'Q');
      const cx = x + Math.round(w / 2);
      this.r(g, cx - 1, y + 4, cx, y + 6, 'i'); this.d(g, cx + 1, y + 5, 'n');
    } else {
      this.r(g, x, y, x + w, y + 10, 'd'); this.r(g, x, y, x + w, y, 'D');
      this.r(g, x, y + 5, x + w, y + 5, 'D'); this.d(g, x + Math.round(w / 2), y + 7, 'i');
    }
    // straps climbing over the shoulders
    if (mode === 'back') { this.r(g, 11, 22, 12, 24, 'D'); this.r(g, 18, 22, 19, 24, 'D'); }
    else { this.r(g, 13, 23, 14, 26, 'D'); this.d(g, 13, 22, 'D'); }
  }
  // Head gear built into the hairline: brim bites into the fringe, hair escapes
  // under it, and the forehead takes a cast shadow.
  hatOn(g, id, ox) {
    ox = ox || 0;
    const R = (x1, y1, x2, y2, c) => this.r(g, x1 + ox, y1, x2 + ox, y2, c);
    const D = (x, y, c) => this.d(g, x + ox, y, c);
    if (id === 'hat-wizard') {
      R(14, 0, 15, 1, 'P'); R(13, 2, 16, 3, 'P'); R(12, 4, 17, 5, 'P'); R(11, 6, 18, 7, 'P');
      R(10, 8, 19, 9, 'P'); R(8, 10, 21, 11, 'p'); R(8, 10, 21, 10, 'P');
      R(7, 11, 8, 12, 'p'); R(21, 11, 22, 12, 'p');
      R(11, 8, 18, 8, 'i'); D(15, 3, 'y'); D(13, 6, 'y'); D(18, 10, 'y');
      R(9, 12, 20, 12, 'H'); D(9, 13, 'l'); D(20, 13, 'l');
    } else if (id === 'hat-cowboy') {
      R(12, 3, 17, 6, 'm'); R(12, 3, 17, 3, 'D'); R(12, 6, 17, 6, 'D');
      R(7, 8, 22, 9, 'm'); R(7, 8, 22, 8, 'd'); R(7, 9, 22, 9, 'D');
      R(6, 7, 7, 8, 'd'); R(22, 7, 23, 8, 'd');
      D(13, 7, 'i'); D(16, 7, 'i');
      R(9, 10, 20, 10, 'H'); D(8, 11, 'l'); D(21, 11, 'l');
    } else if (id === 'crown') {
      R(10, 6, 19, 9, 'i'); R(10, 6, 19, 6, 'y'); R(10, 9, 19, 9, 'z');
      R(10, 3, 11, 5, 'i'); R(14, 2, 15, 5, 'i'); R(18, 3, 19, 5, 'i');
      D(10, 3, 'y'); D(14, 2, 'y'); D(19, 3, 'y');
      D(12, 8, 'x'); D(17, 8, 'c'); D(14, 8, 'g');
      // hair pushed out around the band so it sits IN her hair, not above it
      R(8, 8, 9, 11, 'h'); R(20, 8, 21, 11, 'h'); D(9, 7, 'h'); D(20, 7, 'h');
      R(10, 10, 19, 10, 'H');
    }
  }
  // compact fire pit that sits BESIDE her, not behind her
  firePit(g, cx, by) {
    this.r(g, cx - 4, by, cx + 4, by + 1, 'D'); this.r(g, cx - 3, by, cx + 3, by, 'm');
    this.r(g, cx - 5, by - 1, cx - 3, by, 'm'); this.r(g, cx + 3, by - 1, cx + 5, by, 'm');
    this.d(g, cx - 4, by - 1, 'D'); this.d(g, cx + 4, by - 1, 'D');
    this.r(g, cx - 2, by - 4, cx + 2, by - 1, 'M'); this.r(g, cx - 2, by - 2, cx + 2, by - 1, 'x');
    this.r(g, cx - 2, by - 7, cx + 2, by - 5, 'i'); this.r(g, cx - 1, by - 10, cx + 1, by - 8, 'y');
    this.d(g, cx, by - 12, 'y'); this.d(g, cx - 1, by - 6, 'u'); this.d(g, cx + 1, by - 9, 'u');
    this.d(g, cx - 4, by - 6, 'i'); this.d(g, cx + 4, by - 8, 'i');
  }
  rimLight(g, dir, warm) {
    const src = g.map(r => r.slice());
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      if (src[y][x] === '.' || src[y][x] === 'o') continue;
      const nx = x + dir;
      if (nx < 0 || nx >= g[0].length || src[y][nx] === '.' || src[y][nx] === 'o') g[y][x] = warm;
    }
  }

  // One pose, with an accessory built in. view: 'front' | '34' | 'back'
  worn(id, view, o) {
    o = o || {};
    const slot = id ? this.itemSlot(id) : null;
    const g = this.mk(30, 40);
    const flip = o.flip;
    if (view === 'back') {
      // seen from behind, the pack is the nearest thing to the viewer
      this.headBack(g, {}); this.torsoBack(g, { arms: true }); this.outline(g);
      if (slot === 'back') { this.gear(g, id, 'back'); this.outline(g); }
      if (slot === 'head') { this.hatOn(g, id, 0); this.outline(g); }
    } else if (view === '34') {
      // turned away on that side, so the pack sits behind the torso
      if (slot === 'back') this.gear(g, id, 'side');
      this.head34(g, { eyes: o.eyes || 'normal', mouth: o.mouth || 'smile', hat: slot === 'head' });
      this.torso34(g, {});
      if (slot === 'back') { this.r(g, 13, 23, 14, 27, 'D'); this.d(g, 13, 22, 'd'); }
      this.outline(g);
      if (slot === 'head') { this.hatOn(g, id, 2); this.outline(g); }
    } else {
      // front on: the shell corners hide behind her arms, the harness lies on top
      if (slot === 'back') this.shoulderPeek(g, id === 'campfire' ? 'd' : 'q', id === 'campfire' ? 'D' : 'Q');
      this.body(g, { eyes: o.eyes || 'normal', mouth: o.mouth || 'smile', hat: slot === 'head' });
      if (slot === 'back') this.harness(g, id === 'pack-vault' || id === 'pack-battery' ? 'Q' : 'D');
      this.outline(g);
      if (slot === 'head') { this.hatOn(g, id, 0); this.outline(g); }
    }
    if (slot === 'scene') {
      const s = this.mk(30, 40);
      this.firePit(s, 23, 35); this.outline(s);
      for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) if (g[y][x] === '.' && s[y][x] !== '.') g[y][x] = s[y][x];
      this.rimLight(g, 1, 'L');
    }
    if (flip) this.mirror(g);
    return g;
  }

  // ============ side profile ==============================================
  // Facing viewer-right. One eye, nose breaking the silhouette, tails gathered
  // behind in two tones so the far one reads as being further away.
  headSide(g, o) {
    o = o || {};
    const dy = o.dy || 0, lean = o.lean || 0;
    const R = (x1, y1, x2, y2, c) => this.r(g, x1 + lean, y1 + dy, x2 + lean, y2 + dy, c);
    const D = (x, y, c) => this.d(g, x + lean, y + dy, c);
    // Tails hang from the nape, well below the crown line, so the silhouette
    // stays a head with hair behind it rather than one continuous arch.
    const sw = o.tailSwing || 0;
    this.r(g, 6 - sw, 17, 8 - sw, 24, 'H'); this.r(g, 6 - sw, 25, 7 - sw, 25, 'H');
    this.r(g, 8 - sw, 16, 11 - sw, 26, 'h'); this.r(g, 8 - sw, 27, 10 - sw, 28, 'h');
    this.r(g, 9 - sw, 14, 12 - sw, 15, 'i');
    // skull: crown, then the back of the head dropping to the nape
    if (this._hat) { R(11, 12, 22, 14, 'h'); }
    else { R(13, 9, 20, 9, 'h'); R(12, 10, 21, 10, 'h'); R(11, 11, 22, 14, 'h'); }
    R(11, 15, 15, 20, 'h'); R(12, 21, 15, 21, 'h');
    // face plane on the leading edge, nose breaking the silhouette
    R(16, 15, 22, 21, 's'); R(17, 22, 21, 22, 's'); R(18, 22, 20, 22, 'S');
    D(23, 17, 's'); D(23, 18, 'S');
    // fringe cutting across the brow, tapering to a point at the front
    R(15, 13, 22, 15, 'h'); D(23, 15, 'h');
    R(17, 13, 19, 13, 'l'); R(19, 14, 21, 14, 'l'); D(22, 15, 'l');
    R(15, 17, 16, 19, 'S'); D(16, 18, 's');
    const e = o.eyes || 'normal';
    if (e === 'closed') { R(19, 17, 22, 17, 'h'); D(19, 18, 'S'); }
    else if (e === 'happy') { R(19, 18, 20, 18, 'h'); R(21, 17, 22, 17, 'h'); D(19, 19, 'S'); }
    else if (e === 'wide') { R(19, 15, 21, 18, 'u'); R(19, 15, 21, 15, 'h'); R(20, 16, 21, 17, 'e'); D(20, 16, 'u'); D(22, 15, 'h'); }
    else if (e === 'strain') { R(19, 16, 21, 18, 'u'); R(19, 16, 22, 16, 'h'); R(20, 17, 21, 18, 'e'); D(20, 17, 'E'); }
    else if (e === 'sparkle') {
      R(19, 16, 21, 18, 'u'); R(19, 15, 22, 15, 'h');
      R(20, 16, 21, 17, 'e'); D(20, 16, 'E'); D(21, 17, 'y'); D(19, 18, 'S');
    } else {
      // white sclera with a two-pixel iris toward the front, lash line above
      R(19, 16, 21, 18, 'u'); R(19, 15, 22, 15, 'h');
      R(20, 16, 21, 17, 'e'); D(20, 16, 'E'); D(21, 17, 'u'); D(19, 18, 'S');
    }
    if (o.blush !== false) { R(17, 19, 18, 19, 'k'); D(18, 20, 'k'); }
    const m = o.mouth;
    if (m === 'open') { R(20, 20, 21, 21, 'E'); D(22, 20, 'E'); D(20, 20, 'h'); }
    else if (m === 'grin') { R(19, 20, 21, 20, 'E'); R(20, 21, 21, 21, 'k'); D(22, 19, 'E'); }
    else if (m === 'flat') { R(20, 20, 21, 20, 'S'); }
    else if (m === 'grit') { R(19, 20, 21, 20, 'E'); D(20, 20, 'u'); }
    else { R(20, 20, 21, 20, 'E'); D(22, 19, 'E'); D(20, 21, 'S'); }
  }
  torsoSide(g, o) {
    o = o || {};
    const dy = o.dy || 0;
    const R = (x1, y1, x2, y2, c) => this.r(g, x1, y1 + dy, x2, y2 + dy, c);
    const D = (x, y, c) => this.d(g, x, y + dy, c);
    R(17, 23, 19, 23, 's');
    R(14, 24, 20, 28, 'w'); R(14, 24, 20, 24, 'W'); R(14, 24, 15, 28, 'W');
    R(19, 25, 20, 28, 't'); D(20, 26, 'i');
    const legs = o.legs, st = o.stride || 0, bk = o.back || 0;
    if (legs === 'walk') {
      // Legs stay within a pixel of centre; the step reads from the foot lift
      // and the body bob, the way small-sprite cycles do it.
      const p = (o.phase || 0) % 8;
      const nf = [1, 1, 0, 0, -1, -1, 0, 0][p];
      const ff = [-1, -1, 0, 0, 1, 1, 0, 0][p];
      const nl = [0, 0, 1, 1, 0, 0, 0, 0][p];
      const fl = [0, 0, 0, 0, 0, 0, 1, 1][p];
      R(15, 29, 20, 32, 'r'); R(15, 29, 16, 32, 'R');
      R(16 + ff, 33 - fl, 18 + ff, 34 - fl, 'R');
      R(15 + ff, 35 - fl, 19 + ff, 36 - fl, 'B');
      R(16 + nf, 33 - nl, 18 + nf, 34 - nl, 'r');
      R(15 + nf, 35 - nl, 19 + nf, 36 - nl, 'b'); R(15 + nf, 35 - nl, 19 + nf, 35 - nl, 'B');
    } else if (legs === 'stride') {
      R(15, 29, 20, 32, 'r'); R(15, 29, 16, 32, 'R');
      R(18 + st, 33, 20 + st, 34, 'r'); R(14 - bk, 33, 16 - bk, 34, 'R');
      R(18 + st, 35, 22 + st, 36, 'b'); R(18 + st, 35, 22 + st, 35, 'B');
      R(13 - bk, 35, 17 - bk, 36, 'B');
    } else if (legs === 'dangle') {
      R(15, 29, 20, 32, 'r'); R(15, 29, 16, 32, 'R');
      R(16, 33, 18, 35, 'r'); R(15, 36, 19, 37, 'b'); R(15, 36, 19, 36, 'B');
      R(19, 33, 22, 34, 'R'); R(22, 35, 25, 36, 'B'); R(22, 35, 25, 35, 'b');
    } else {
      R(15, 29, 20, 32, 'r'); R(15, 29, 16, 32, 'R');
      R(15, 33, 17, 34, 'R'); R(18, 33, 20, 34, 'r');
      R(14, 35, 18, 36, 'B'); R(18, 35, 22, 36, 'b'); R(18, 35, 22, 35, 'B');
    }
    const a = o.arm;
    if (a === 'swingF') { R(16, 24, 18, 27, 'w'); R(17, 28, 19, 29, 's'); }
    else if (a === 'swingB') { R(14, 24, 16, 27, 'w'); R(13, 28, 15, 29, 's'); }
    else if (a === 'reach') { R(17, 24, 19, 26, 'w'); R(20, 24, 22, 25, 's'); }
    else if (a === 'limp') { R(12, 25, 14, 30, 'w'); R(12, 25, 14, 25, 'W'); R(14, 25, 14, 30, 'W'); R(12, 31, 14, 33, 's'); }
    else if (a === 'strap') { R(16, 24, 18, 26, 'w'); R(17, 22, 19, 23, 's'); }
    else if (a !== false) { R(16, 24, 18, 28, 'w'); R(16, 28, 18, 28, 'W'); R(16, 29, 18, 30, 's'); }
  }
  sideView(o) {
    o = o || {};
    const g = this.mk(30, 40);
    this.torsoSide(g, o); this.headSide(g, o);
    this.outline(g);
    if (o.flip) this.mirror(g);
    return g;
  }
  cursor(g, x, y) {
    this.fxPix(g, x, y, 'u');
    this.r(g, x, y + 1, x + 1, y + 1, 'u'); this.r(g, x, y + 2, x + 2, y + 2, 'u');
    this.r(g, x, y + 3, x + 3, y + 3, 'u'); this.r(g, x, y + 4, x + 2, y + 4, 'u');
    this.d(g, x, y + 5, 'u'); this.d(g, x + 3, y + 5, 'u'); this.d(g, x + 4, y + 6, 'u');
    this.d(g, x + 1, y + 3, 'J'); this.d(g, x + 1, y + 4, 'J');
  }
  pinch(g, x, y) {
    this.r(g, x, y, x + 3, y + 1, 's'); this.r(g, x, y, x + 3, y, 'S');
    this.r(g, x + 1, y + 2, x + 2, y + 3, 's'); this.d(g, x + 1, y + 3, 'S');
  }
  // A hand entering frame from the right, index finger extended to poke.
  // Sized to fit inside 30 columns when the fingertip sits at x=19.
  pokeHand(g, x, y) {
    this.r(g, x, y, x + 2, y + 1, 's'); this.r(g, x, y + 1, x + 2, y + 1, 'S');
    this.r(g, x + 3, y - 2, x + 7, y + 4, 's'); this.r(g, x + 3, y + 3, x + 7, y + 4, 'S');
    this.d(g, x + 4, y - 1, 'S'); this.d(g, x + 6, y + 1, 'S');
    this.r(g, x + 8, y - 2, x + 9, y + 4, 'w'); this.r(g, x + 8, y - 2, x + 9, y - 2, 'W');
  }
  // A hand pinching down from above, holding her by the collar.
  pinchHand(g, x, y) {
    this.r(g, x, y, x + 1, y + 2, 's'); this.r(g, x + 3, y, x + 4, y + 2, 's');
    this.d(g, x, y + 2, 'S'); this.d(g, x + 4, y + 2, 'S');
    this.r(g, x, y - 3, x + 4, y - 1, 's'); this.r(g, x, y - 1, x + 4, y - 1, 'S');
    this.r(g, x + 1, y - 6, x + 3, y - 4, 'w'); this.r(g, x + 1, y - 4, x + 3, y - 4, 'W');
  }
  impact(g, cx, cy, r) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.fxPix(g, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), i % 2 ? 'u' : 'y');
    }
  }
  bang(g, x, y) {
    this.r(g, x, y, x + 1, y + 3, 'x'); this.r(g, x, y + 5, x + 1, y + 5, 'x');
    this.d(g, x - 1, y + 1, 'i'); this.d(g, x + 2, y + 2, 'i');
  }

  // ============ speech balloons ============================================
  // 9-slice: 4px corners, 1px repeating edges, free interior. Any w/h from 20x11 up.
  // tail: 'sw' | 'se' | 'nw' | 'ne' | 'think-sw' | 'think-se' | 'none'
  balloon(w, h, tail, lines) {
    const g = this.mk(w, h + 5);
    const top = tail && tail.indexOf('n') === 0 ? 4 : 0;
    const bot = top + h - 1;
    this.r(g, 2, top, w - 3, bot, 'u');
    this.r(g, 0, top + 2, w - 1, bot - 2, 'u');
    this.r(g, 1, top + 1, w - 2, bot - 1, 'u');
    this.r(g, 2, top, w - 3, top, 'T');
    this.r(g, 2, bot, w - 3, bot, 'T');
    this.r(g, 0, top + 2, 0, bot - 2, 'T'); this.r(g, w - 1, top + 2, w - 1, bot - 2, 'T');
    this.d(g, 1, top + 1, 'T'); this.d(g, w - 2, top + 1, 'T');
    this.d(g, 1, bot - 1, 'T'); this.d(g, w - 2, bot - 1, 'T');
    if (tail === 'sw') { this.r(g, 4, bot + 1, 7, bot + 1, 'u'); this.r(g, 4, bot + 2, 6, bot + 2, 'u'); this.r(g, 4, bot + 3, 5, bot + 3, 'u'); this.d(g, 4, bot + 4, 'u'); }
    else if (tail === 'se') { this.r(g, w - 8, bot + 1, w - 5, bot + 1, 'u'); this.r(g, w - 7, bot + 2, w - 5, bot + 2, 'u'); this.r(g, w - 6, bot + 3, w - 5, bot + 3, 'u'); this.d(g, w - 5, bot + 4, 'u'); }
    else if (tail === 'nw') { this.r(g, 4, top - 1, 7, top - 1, 'u'); this.r(g, 4, top - 2, 6, top - 2, 'u'); this.r(g, 4, top - 3, 5, top - 3, 'u'); this.d(g, 4, top - 4, 'u'); }
    else if (tail === 'ne') { this.r(g, w - 8, top - 1, w - 5, top - 1, 'u'); this.r(g, w - 7, top - 2, w - 5, top - 2, 'u'); this.r(g, w - 6, top - 3, w - 5, top - 3, 'u'); this.d(g, w - 5, top - 4, 'u'); }
    else if (tail === 'think-sw') { this.r(g, 5, bot + 2, 6, bot + 2, 'u'); this.d(g, 3, bot + 4, 'u'); }
    else if (tail === 'think-se') { this.r(g, w - 7, bot + 2, w - 6, bot + 2, 'u'); this.d(g, w - 4, bot + 4, 'u'); }
    this.outline(g);
    (lines || []).forEach((lw, i) => {
      if (lw <= 0) return;
      const y = top + 2 + i * 3;
      if (y > bot - 2) return;
      this.r(g, 3, y, Math.min(w - 4, 2 + lw), y, i === 0 ? 'f' : 'n');
      this.r(g, 3, y + 1, Math.min(w - 5, 2 + Math.round(lw * 0.7)), y + 1, 'N');
    });
    return g;
  }

  // ============ directional look set ======================================
  // Eight single frames. The pupil shifts inside a 3x3 white, the head leans,
  // and the tails trail the turn. Hard left and right use the profile instead.
  // 3 wide, 4 tall: lash row on top, then sclera. A downward gaze keeps white
  // above the iris, which is what actually reads as looking down.
  eyeAt(g, x, y, dx, dy) {
    this.r(g, x, y, x + 2, y + 3, 'u');
    this.r(g, x, y, x + 2, y, 'h');
    const py = y + (dy > 0 ? 2 : 1);
    const px = dx < 0 ? x : (dx > 0 ? x + 1 : x);
    const pw = dx === 0 ? 2 : 1;
    this.r(g, px, py, px + pw, py + 1, 'e');
    this.d(g, px, py, 'E'); this.d(g, px + pw, py + 1, 'u');
    if (dy > 0) this.r(g, x, y + 1, x + 2, y + 1, 'T');
  }
  look(dir) {
    const map = {
      up: [0, -1, 0], 'up-right': [1, -1, -1], right: [1, 0, -1], 'down-right': [1, 1, -1],
      down: [0, 1, 0], 'down-left': [-1, 1, 1], left: [-1, 0, 1], 'up-left': [-1, -1, 1]
    };
    const a = map[dir] || [0, 0, 0], dx = a[0], dy = a[1], sway = a[2];
    if (dir === 'right') return this.sideView({ mouth: 'smile' });
    if (dir === 'left') return this.sideView({ mouth: 'smile', flip: true });
    const g = this.mk(30, 40);
    this.body(g, { sway, mouth: dy > 0 ? 'flat' : 'smile', eyes: 'none', tailLift: dy < 0 ? 1 : 0 });
    if (dy > 0) {
      // fringe pulled low over the brow and the chin tucked, so the whole head
      // tips forward instead of only the pupils moving
      this.r(g, 8, 14, 21, 15, 'h'); this.r(g, 12, 21, 17, 21, 'S');
      this.eyeAt(g, 11, 16, dx, dy); this.eyeAt(g, 16, 16, dx, dy);
    } else {
      this.eyeAt(g, 11, 15, dx, dy); this.eyeAt(g, 16, 15, dx, dy);
      this.r(g, 11, 14, 13, 14, 'h'); this.r(g, 16, 14, 18, 14, 'h');
    }
    this.outline(g);
    return g;
  }

  // ---- effect layer (transparent background, effects only) ----------------
  fxPix(g, x, y, c) {
    if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) return;
    if (this._mask && this._mask[y][x]) return;
    g[y][x] = c;
  }
  fxRect(g, x1, y1, x2, y2, c) { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) this.fxPix(g, x, y, c); }
  lockMask(g) { this._mask = g.map(row => row.map(v => v !== '.')); }
  freeMask() { this._mask = null; }
  // dust puff: small ring of pixels that grows and thins
  puff(g, cx, cy, r, c) {
    const pts = [[-1, -1], [0, -2], [1, -1], [2, 0], [1, 1], [0, 2], [-1, 1], [-2, 0]];
    pts.forEach((p, i) => this.fxPix(g, cx + p[0] * r, cy + Math.round(p[1] * r * 0.6), i % 3 ? c : 'q'));
  }
  spark(g, x, y, len, c) { for (let i = 0; i < len; i++) this.fxPix(g, x + (i % 2), y + i, i % 2 ? c : 'y'); }
  bolt(g, x, y, h, c) {
    for (let i = 0; i < h; i++) this.fxPix(g, x + (i % 3 === 1 ? 1 : 0), y + i, c);
    this.fxPix(g, x + 1, y + h, 'y');
  }
  confetti(g, f, n) {
    const cols = ['i', 'c', 'x', 'g', 'p', 'y'];
    for (let i = 0; i < n; i++) {
      const seedX = (i * 7 + (i % 3) * 5) % 30;
      const drift = Math.round(Math.sin((i + f) * 0.7) * 2);
      const y = ((i * 5 + f * 3) % 46) - 6;
      const c = cols[i % cols.length];
      const x = seedX + drift;
      if ((i + f) % 3 === 0) { this.fxPix(g, x, y, c); this.fxPix(g, x + 1, y, c); }
      else if ((i + f) % 3 === 1) { this.fxPix(g, x, y, c); this.fxPix(g, x, y + 1, c); }
      else { this.fxPix(g, x, y, c); }
    }
  }
  streamer(g, x, y, len, c, phase) {
    for (let i = 0; i < len; i++) this.fxPix(g, x + Math.round(Math.sin((i + phase) * 0.9) * 1.5), y + i, i % 2 ? c : 'u');
  }
  // Motion arcs: nested crescents trailing a moving limb. An arc is drawn only
  // if its whole bowed run fits on the grid, so a clipped one is dropped rather
  // than degenerating into two orphan endpoints.
  arcs(g, x, y, n, dir, c) {
    const w = g[0].length;
    for (let i = 0; i < n; i++) {
      const cx = x + dir * i * 2, h = 2 + i, reach = cx + dir * 2;
      if (cx < 0 || cx >= w || reach < 0 || reach >= w) continue;
      for (let dy = -h; dy <= h; dy++) {
        const bow = Math.round((1 - Math.abs(dy) / (h + 1)) * 1.4);
        this.fxPix(g, cx + dir * bow, y + dy, i ? 'q' : c);
      }
    }
  }
  rays(g, cx, cy, n, len, c, tip, phase) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (phase || 0);
      for (let dd = 5; dd < len; dd++) this.fxPix(g, Math.round(cx + Math.cos(a) * dd), Math.round(cy + Math.sin(a) * dd), dd > len - 3 ? tip : c);
    }
  }

  // ---- actions ------------------------------------------------------------
  frames(id) { const a = ACTIONS.find(x => x.id === id); return a ? a.frames : 8; }

  action(id, f, opts) {
    opts = opts || {};
    const g = this.mk(30, 40);
    // gear is built into the pose: shells behind the body, harness and hats on top
    const slot = opts.item ? this.itemSlot(opts.item) : null;
    this._hat = slot === 'head';
    if (slot === 'back') this.shoulderPeek(g, 'q', 'Q');
    else if (slot === 'scene') this.firePit(g, 23, 35);
    const N = this.frames(id);
    const F = ((f % N) + N) % N;
    let fx = null;

    switch (id) {
      // ---- 01 IDLE (8) : breathing, tail drift, one blink, one glance ----
      case 'idle': {
        const bob = [0, 0, 1, 1, 1, 1, 0, 0][F];
        const sway = [0, 0, 1, 1, 1, 0, 0, 0][F];
        const eyes = ['normal', 'normal', 'lookR', 'lookR', 'normal', 'closed', 'half', 'normal'][F];
        const mouth = ['smile', 'smile', 'flat', 'flat', 'smile', 'smile', 'smile', 'smirk'][F];
        this.body(g, { sway, eyes, mouth, tailLift: F === 2 || F === 3 ? 1 : 0 });
        this.outline(g); this.shift(g, bob);
        break;
      }

      // ---- 02 WAVE (12) : wind up, three swings, settle ----
      case 'wave': {
        const armR = ['down', 'up', 'wave3', 'wave', 'wave2', 'wave', 'wave2', 'wave', 'wave2', 'wave3', 'up', 'down'][F];
        const eyes = ['normal', 'wide', 'happy', 'happy', 'sparkle', 'happy', 'squint', 'happy', 'sparkle', 'happy', 'happy', 'normal'][F];
        const eyeR = F === 6 ? 'happy' : null;
        const mouth = ['smile', 'ohh', 'open', 'wide', 'grin', 'wide', 'grin', 'wide', 'grin', 'open', 'smile', 'smile'][F];
        const sway = [0, 0, -1, -1, 0, -1, 0, -1, 0, -1, 0, 0][F];
        const bob = [0, -1, -1, 0, -1, 0, -1, 0, -1, 0, 0, 0][F];
        this.body(g, { armR, armL: F > 1 && F < 10 ? 'hip' : 'down', eyes, eyeR, mouth, sway, blushBig: F > 3 && F < 9, legs: F === 4 || F === 8 ? 'tip' : 'stand' });
        this.outline(g); this.shift(g, bob);
        fx = gg => {
          if (F > 2 && F < 10) { this.arcs(gg, 27, 15, 2, 1, 'u'); }
          if (F === 4 || F === 8) { this.fxPix(gg, 6, 12, 'y'); this.fxPix(gg, 5, 13, 'i'); }
        };
        break;
      }

      // ---- 03 WALK (8) : side profile cycle, contact / down / pass / up x2 ----
      case 'walk': {
        const bob = [0, 1, 1, 0, 0, 1, 1, 0][F];
        const w = this.sideView({
          legs: 'walk', phase: F, dy: bob,
          arm: F < 4 ? 'swingF' : 'swingB',
          tailSwing: F === 2 || F === 6 ? 1 : 0,
          eyes: F === 5 ? 'closed' : 'normal',
          mouth: F === 2 || F === 3 ? 'grin' : 'smile'
        });
        for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) g[y][x] = w[y][x];
        fx = gg => { if (F === 0 || F === 4) { this.fxPix(gg, 11, 37, 'q'); this.fxPix(gg, 10, 36, 'N'); } };
        break;
      }

      // ---- 04 LISTEN (8) : hand cupped, message flying in, nods ----
      case 'listen': {
        const lean = [0, 0, 1, 1, 0, 0, 1, 1][F];
        this.body(g, {
          armR: F % 4 < 2 ? 'ear' : 'ear2', armL: 'hip',
          eyes: ['lookR', 'lookR', 'up', 'normal', 'lookR', 'squint', 'normal', 'lookR'][F],
          mouth: ['flat', 'flat', 'smile', 'flat', 'flat', 'smile', 'flat', 'flat'][F],
          sway: lean, browUp: F === 2 || F === 6
        });
        this.outline(g); this.shift(g, lean);
        fx = gg => {
          const bx = 21 - (F % 4);
          this.chatbox(gg, bx, 3, 7, 6, [4, 5, 3], 'left');
          this.arcs(gg, 27, 19, 2, 1, F % 2 ? 'c' : 'C');
        };
        break;
      }

      // ---- 05 THINK (12) : chin tap, thought box fills, idea sparks ----
      case 'think': {
        const eyes = ['up', 'up', 'lookL', 'lookL', 'up', 'up', 'lookR', 'lookR', 'up', 'closed', 'sparkle', 'sparkle'][F];
        const mouth = ['flat', 'flat', 'flat', 'smirk', 'flat', 'flat', 'flat', 'smirk', 'flat', 'flat', 'ohh', 'smile'][F];
        this.body(g, { armR: F % 4 === 1 ? 'chinTap' : 'chin', armL: 'hip', eyes, mouth, sway: F > 5 ? 1 : 0, browUp: F > 9 });
        this.outline(g); this.shift(g, F % 6 === 3 ? 1 : 0);
        fx = gg => {
          const dots = [1, 1, 2, 2, 3, 3, 1, 2, 3, 3, 0, 0][F];
          this.chatbox(gg, 18, 2, 10, 6, [dots * 3, dots > 1 ? dots * 2 : 0, dots > 2 ? 4 : 0], 'think');
          if (F > 9) { this.fxPix(gg, 16, 1, 'y'); this.fxPix(gg, 29, 3, 'y'); this.spark(gg, 15, 0, 2, 'i'); }
        };
        break;
      }

      // ---- 06 TYPE (8) : laptop, alternating hands, screen filling ----
      case 'type': {
        this.body(g, {
          armL: F % 2 ? 'keys' : 'keysUp', armR: F % 2 ? 'keysUp' : 'keys', legs: 'sit',
          eyes: ['normal', 'normal', 'lookR', 'normal', 'closed', 'normal', 'lookL', 'normal'][F],
          mouth: ['flat', 'smile', 'flat', 'flat', 'smile', 'flat', 'smirk', 'flat'][F],
          sway: F % 4 > 1 ? 1 : 0
        });
        this.laptop(g, Math.min(5, 1 + Math.floor(F / 2)), F % 5);
        this.outline(g); this.shift(g, F % 2);
        fx = gg => {
          if (F % 2 === 0) { this.fxPix(gg, 27, 26 - F, 'c'); this.fxPix(gg, 28, 28 - F, 'C'); }
          if (F === 7) { this.fxPix(gg, 2, 22, 'y'); this.fxPix(gg, 27, 22, 'y'); }
        };
        break;
      }

      // ---- 07 CHEER (12) : crouch, launch, peak, land, settle + confetti ----
      case 'cheer': {
        const lift = [1, 2, -2, -5, -7, -8, -7, -5, -2, 1, 2, 0][F];
        const legs = F < 2 || F > 8 ? 'bend' : (F > 3 && F < 8 ? 'tip' : 'stand');
        const arms = F < 2 ? 'out' : 'upHigh';
        this.body(g, {
          armL: F < 2 ? 'hip' : arms, armR: F < 2 ? 'hip' : arms, legs,
          eyes: ['squint', 'squint', 'wide', 'sparkle', 'sparkle', 'happy', 'happy', 'sparkle', 'happy', 'squint', 'happy', 'happy'][F],
          mouth: ['flat', 'ohh', 'open', 'grin', 'grin', 'grin', 'grin', 'grin', 'wide', 'wide', 'smile', 'smile'][F],
          sway: F > 2 && F < 9 ? 1 : 0, tailLift: F > 2 && F < 9 ? 2 : 0, blushBig: F > 2
        });
        this.outline(g); this.shift(g, lift);
        fx = gg => {
          if (F >= 2) this.confetti(gg, F - 2, 16);
          if (F === 2) { this.puff(gg, 15, 37, 1, 'q'); this.puff(gg, 15, 37, 2, 'N'); }
          if (F === 9) { this.puff(gg, 15, 37, 1, 'q'); }
          if (F > 3 && F < 9) { this.streamer(gg, 2, 4, 7, 'x', F); this.streamer(gg, 27, 2, 8, 'c', F + 2); }
          if (F > 2) this.rays(gg, 15, 16, 8, 13, 'y', 'i', F * 0.2);
        };
        break;
      }

      // ---- 08 CATCH (12) : file falls, impact, absorb, hug, recover ----
      case 'catch': {
        // sheet lands exactly between the hands: upHigh palms sit at x5-8 / x21-24, y13-16;
        // up palms at x5-7 / x22-24, y17-19; hug palms at x10-13 / x16-19, y27-29.
        const sheetY = [-3, 3, 9, 13, 14, 17, 18, 17, 17, 26, 26, 26][F];
        const sheetX = [11, 11, 10, 9, 8, 7, 7, 7, 7, 10, 10, 10][F];
        const sheetW = [8, 8, 9, 11, 13, 15, 15, 15, 15, 9, 9, 9][F];
        const legs = F < 4 ? 'stand' : (F < 9 ? 'bend' : 'stand');
        const grip = F < 4 ? 'upHigh' : (F < 9 ? 'up' : 'hug');
        this.body(g, {
          armL: grip, armR: grip, legs,
          eyes: ['lookR', 'wide', 'wide', 'wide', 'squint', 'closed', 'closed', 'squint', 'normal', 'happy', 'happy', 'normal'][F],
          mouth: ['flat', 'ohh', 'open', 'open', 'wobble', 'grit', 'grit', 'wobble', 'flat', 'smile', 'grin', 'smile'][F],
          sway: F > 4 && F < 9 ? 1 : 0, blushBig: F > 8
        });
        this.sheet(g, sheetX, sheetY, sheetW, F < 4);
        this.outline(g); this.shift(g, F === 5 ? 2 : (F === 6 ? 1 : 0));
        fx = gg => {
          if (F < 4) { this.fxPix(gg, 9, sheetY - 2, 'q'); this.fxPix(gg, 20, sheetY - 3, 'q'); }
          if (F === 5 || F === 6) { this.puff(gg, 8, 36, 1, 'N'); this.puff(gg, 22, 36, 1, 'N'); this.fxPix(gg, 4, 20, 'q'); this.fxPix(gg, 26, 20, 'q'); }
          if (F > 9) { this.fxPix(gg, 6, 12, 'y'); this.fxPix(gg, 24, 10, 'y'); }
        };
        break;
      }

      // ---- 09 ZAP (12) : hair rising, arcing sparks, jitter ----
      case 'zap': {
        const jitterX = [0, 1, -1, 1, 0, -1, 1, -1, 0, 1, -1, 0][F];
        this.body(g, {
          spike: true, spikeLift: -(F % 3), armL: 'out', armR: 'out',
          eyes: F % 2 ? 'spiral' : 'spiral2',
          mouth: ['open', 'wide', 'grit', 'wide', 'open', 'grit', 'wide', 'open', 'grit', 'wide', 'open', 'wide'][F],
          sway: F % 3 === 1 ? 1 : -1, tailLift: F % 2
        });
        this.sweat(g, F % 4 < 2 ? [[22, 14]] : [[7, 15]]);
        this.outline(g); this.shift(g, F % 4 === 2 ? 1 : 0, jitterX);
        fx = gg => {
          this.bolt(gg, 3 + (F % 3), 4 + (F % 4), 5, 'i');
          this.bolt(gg, 25 - (F % 3), 6 + ((F + 2) % 4), 4, 'i');
          this.arcs(gg, 6, 12 + (F % 3) * 2, 2, -1, 'y');
          this.arcs(gg, 24, 10 + ((F + 1) % 3) * 2, 2, 1, 'y');
          if (F % 2) { this.fxPix(gg, 14, 0, 'x'); this.fxPix(gg, 15, 1, 'i'); }
          this.rays(gg, 15, 20, 6, 12, 'i', 'x', F * 0.4);
        };
        break;
      }

      // ---- 10 CRASH (12) : strain, buckle, topple, prone, dust settles ----
      case 'crash': {
        if (F < 3) {
          this.body(g, { legs: 'bend', armL: 'out', armR: 'out', eyes: 'strain', mouth: 'grit', brow: true, pack: 3, packLean: F > 1 ? 1 : 0, sway: F % 2 });
          this.sweat(g, [[22, 14 + F], [7, 16 + F]]);
          this.outline(g); this.shift(g, F);
        } else if (F < 5) {
          this.body(g, { legs: 'kneel', armL: 'out', armR: 'out', eyes: 'spiral', mouth: 'open', pack: 3, packLean: 2, sway: 1 });
          this.outline(g); this.shift(g, 2 + (F - 3) * 2);
        } else if (F === 5) {
          this.prone(g, { dy: -3 });
          this.topple(g, 19, 14); this.outline(g);
        } else {
          const settle = [0, -1, 0, 0, 0, 0][F - 6];
          this.prone(g, { dy: settle, eyesX: F > 8 });
          this.topple(g, 20, 17 + (F > 7 ? 1 : 0));
          this.swirl(g, 10, F < 10 ? 22 : 23, F);
          this.outline(g);
        }
        fx = gg => {
          if (F === 5) { this.puff(gg, 8, 34, 1, 'q'); this.puff(gg, 20, 35, 1, 'q'); this.puff(gg, 14, 33, 2, 'N'); }
          if (F === 6) { this.puff(gg, 6, 33, 2, 'q'); this.puff(gg, 22, 33, 2, 'q'); this.fxPix(gg, 2, 28, 'N'); this.fxPix(gg, 28, 27, 'N'); }
          if (F === 7) { this.puff(gg, 5, 30, 3, 'N'); this.puff(gg, 24, 31, 2, 'N'); this.fxPix(gg, 14, 22, 'q'); }
          if (F === 8) { this.fxPix(gg, 4, 27, 'N'); this.fxPix(gg, 26, 26, 'N'); this.fxPix(gg, 15, 21, 'q'); }
          if (F > 8) { this.fxPix(gg, 3 + (F % 3), 24 - (F - 9), 'q'); this.fxPix(gg, 25, 23 - (F - 9), 'q'); }
          if (F > 5) { this.fxPix(gg, 6, 38, 'T'); this.fxPix(gg, 24, 38, 'T'); }
        };
        break;
      }

      // ---- 11 SWEEP (12) : wind up right, sweep left, dust rolls away ----
      case 'sweep': {
        // rigid broom: grip tracks the hand, head swings on a fixed-length arc
        const swinging = F > 2 && F < 9;
        const gx = 22, gy = swinging ? 26 : 21;
        const heads = [[23, 32], [22, 33], [21, 33], [19, 36], [16, 34], [14, 33], [12, 32], [11, 32], [13, 33], [18, 34], [21, 33], [23, 32]];
        const hd = heads[F];
        this.body(g, {
          armR: swinging ? 'broomLow' : 'broom', armL: F > 1 && F < 9 ? 'broomL' : 'front',
          eyes: ['lookR', 'squint', 'normal', 'normal', 'squint', 'happy', 'happy', 'happy', 'happy', 'normal', 'sparkle', 'happy'][F],
          mouth: ['flat', 'grit', 'flat', 'open', 'grit', 'wide', 'grin', 'grin', 'wide', 'smile', 'grin', 'smile'][F],
          sway: swinging ? 1 : 0, legs: F > 3 && F < 8 ? 'wide' : 'stand'
        });
        this.broom(g, gx, gy, hd[0], hd[1], swinging ? 1 : 0);
        this.outline(g); this.shift(g, F % 3 === 1 ? 1 : 0);
        fx = gg => {
          if (F < 3) { this.r(gg, 20, 37, 27, 38, 't'); this.r(gg, 20, 38, 27, 38, 'T'); this.fxPix(gg, 22, 36, 'T'); }
          if (swinging) {
            const dx = Math.min((F - 3) * 4, 15);
            this.r(gg, 18 - dx, 36, 22 - dx, 38, 'T'); this.puff(gg, 20 - dx, 35, 1, 'q');
            this.fxPix(gg, 24 - dx, 33, 'N'); this.fxPix(gg, 26 - dx, 31, 'q');
          }
          if (F >= 8) {
            this.fxPix(gg, 6 - (F - 8), 34, 'T'); this.fxPix(gg, 3, 32 - (F - 8), 'N'); this.fxPix(gg, 1, 30, 'q');
            if (F > 9) { this.fxPix(gg, 22, 12, 'y'); this.fxPix(gg, 8, 10, 'y'); }
          }
        };
        break;
      }

      // ---- 12 SIP (12) : raise, sip, steam, lower, content ----
      case 'sip': {
        const tilt = [0, 0, 0, 1, 2, 2, 2, 1, 0, 0, 0, 0][F];
        const grip = ['cup', 'cup', 'cupHigh', 'cupTilt', 'cupTip', 'cupTip', 'cupTip', 'cupTilt', 'cupHigh', 'cup', 'cup', 'cup'][F];
        const mugX = [17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17][F];
        const mugY = [24, 22, 20, 19, 19, 18, 18, 19, 21, 23, 24, 24][F];
        this.body(g, {
          armR: grip, armL: 'hip',
          eyes: ['normal', 'lookL', 'half', 'half', 'closed', 'closed', 'closed', 'half', 'normal', 'normal', 'happy', 'sparkle'][F],
          mouth: ['flat', 'flat', 'ohh', 'sip', 'drink', 'drink', 'drink', 'swallow', 'flat', 'smile', 'smile', 'grin'][F],
          sway: F % 3 === 1 ? 1 : 0, blushBig: F > 5
        });
        this.mug(g, mugX, mugY, tilt, true);
        this.outline(g); this.shift(g, F % 4 === 2 ? 1 : 0);
        fx = gg => {
          const s = F % 3;
          this.fxPix(gg, mugX + 1 + s, mugY - 3, 'N'); this.fxPix(gg, mugX + 2 - s, mugY - 5, 'q'); this.fxPix(gg, mugX + 3, mugY - 7 + s, 'N');
          if (tilt === 2) {
            // drops running from the rim into her mouth
            this.fxPix(gg, mugX - 1, mugY + 2, 'm'); this.fxPix(gg, mugX - 2, mugY + 3 + (F % 2), 'D');
          }
          if (F === 7) { this.fxPix(gg, 12, 18, 'c'); }
          if (F > 9) { this.fxPix(gg, 6, 14, 'y'); this.fxPix(gg, 5, 16, 'i'); this.fxPix(gg, 25, 12, 'y'); }
        };
        break;
      }

      // ---- 13 STRETCH (12) : slump, arms up, big yawn, shake out, ready ----
      case 'stretch': {
        const poses = [
          { armL: 'down', armR: 'down', eyes: 'half', mouth: 'flat', bob: 1 },
          { armL: 'down', armR: 'down', eyes: 'closed', mouth: 'ohh', bob: 1 },
          { armL: 'up', armR: 'up', eyes: 'closed', mouth: 'open', bob: 0 },
          { armL: 'upHigh', armR: 'upHigh', eyes: 'closed', mouth: 'yawn', bob: -1, tailLift: 2, tear: true },
          { armL: 'upHigh', armR: 'upHigh', eyes: 'closed', mouth: 'yawn', bob: -2, tailLift: 3, tear: true, legs: 'tip' },
          { armL: 'upHigh', armR: 'upHigh', eyes: 'squint', mouth: 'yawn', bob: -2, tailLift: 3, tear: true, legs: 'tip' },
          { armL: 'upHigh', armR: 'upHigh', eyes: 'squint', mouth: 'open', bob: -1, tailLift: 2, legs: 'tip' },
          { armL: 'out', armR: 'out', eyes: 'half', mouth: 'flat', bob: 0, sway: 1 },
          { armL: 'out', armR: 'out', eyes: 'closed', mouth: 'wobble', bob: 1, sway: -1 },
          { armL: 'hip', armR: 'hip', eyes: 'normal', mouth: 'smile', bob: 0 },
          { armL: 'hip', armR: 'hip', eyes: 'sparkle', mouth: 'grin', bob: 0, blushBig: true },
          { armL: 'down', armR: 'down', eyes: 'normal', mouth: 'smile', bob: 0 }
        ];
        const p = poses[F];
        this.body(g, p);
        this.outline(g); this.shift(g, p.bob);
        fx = gg => {
          if (F > 2 && F < 7) { this.fxPix(gg, 8, 8 - (F - 3), 'q'); this.fxPix(gg, 22, 7 - (F - 3), 'N'); this.arcs(gg, 27, 14, 2, 1, 'u'); }
          if (F === 8) { this.fxPix(gg, 4, 22, 'q'); this.fxPix(gg, 26, 22, 'q'); }
          if (F > 9) { this.fxPix(gg, 5, 12, 'y'); this.fxPix(gg, 25, 11, 'y'); }
        };
        break;
      }

      // ---- 14 NAP (8) : head nods, Zs rise and fade ----
      // ---- 15 BED (8) : tucked in, blanket breathing, Zs. Bed carries the detail ----
      case 'bed': {
        const b = [0, 0, 1, 1, 1, 1, 0, 0][F];
        this.bed(g, b);
        // head on the pillow: hair mass, closed eyes, small mouth. Nothing else of her shows.
        const hy = 17 + (F > 3 ? 1 : 0);
        this.r(g, 6, hy, 14, hy + 2, 'h'); this.r(g, 5, hy + 1, 5, hy + 5, 'h'); this.r(g, 15, hy + 1, 15, hy + 5, 'h');
        this.r(g, 6, hy + 3, 14, hy + 7, 's'); this.r(g, 7, hy + 8, 13, hy + 8, 's');
        this.r(g, 6, hy + 3, 14, hy + 3, 'h'); this.r(g, 9, hy, 11, hy + 3, 'l');
        this.r(g, 2, hy + 4, 5, hy + 6, 'h'); this.r(g, 2, hy + 3, 4, hy + 3, 'i');
        this.r(g, 15, hy + 4, 18, hy + 6, 'h'); this.r(g, 16, hy + 3, 18, hy + 3, 'i');
        this.r(g, 7, hy + 5, 9, hy + 5, 'h'); this.r(g, 11, hy + 5, 13, hy + 5, 'h');
        this.d(g, 6, hy + 6, 'k'); this.d(g, 14, hy + 6, 'k');
        if (F > 3) { this.r(g, 10, hy + 7, 11, hy + 7, 'E'); } else { this.d(g, 10, hy + 7, 'E'); }
        this.outline(g);
        fx = gg => {
          this.zed(gg, 18, 14 - F, 3, false);
          if (F > 1) this.zed(gg, 22, 10 - F, 2, F > 5);
          if (F > 4) this.zed(gg, 25, 7 - (F - 5), 2, true);
        };
        break;
      }

      case 'nap': {
        const nod = [0, 0, 1, 1, 1, 1, 0, 0][F];
        this.body(g, {
          legs: 'sit', armL: 'lap', armR: 'lap', eyes: 'closed',
          mouth: F > 3 ? 'sleep' : 'flat', blush: false, sway: F > 3 ? 1 : 0
        });
        this.outline(g); this.shift(g, nod);
        fx = gg => {
          this.zed(gg, 22, 16 - F, 3, false);
          if (F > 1) this.zed(gg, 25, 12 - F, 2, F > 5);
          if (F > 4) this.zed(gg, 20, 9 - (F - 5), 2, true);
        };
        break;
      }

      // ---- 16 TURN (8) : slow show-off spin, two frames per quarter ----
      case 'turn': {
        const item = opts.item || null;
        const views = ['front', 'front', '34', '34', 'back', 'back', '34', '34'];
        const flips = [false, false, false, false, false, false, true, true];
        const w = this.worn(item, views[F], { flip: flips[F], eyes: F % 4 === 1 ? 'closed' : 'normal', mouth: 'smile' });
        for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) g[y][x] = w[y][x];
        if (F % 2) this.shift(g, 1);
        return g;
      }

      // ---- 17 WALK SIDE (retired: the main walk cycle now uses the profile) ----
      case 'walkside': {
        const st = [3, 2, 0, 2, 3, 2, 0, 2][F];
        const bk = [3, 2, 0, 2, 3, 2, 0, 2][F];
        const bob = [0, 1, 0, 0, 0, 1, 0, 0][F];
        const swap = F > 3;
        const w = this.sideView({
          legs: 'stride', stride: swap ? bk : st, back: swap ? st : bk,
          arm: swap ? 'swingB' : 'swingF', dy: bob,
          tailSwing: F % 4 === 2 ? 1 : 0,
          eyes: F === 6 ? 'closed' : 'normal', mouth: 'smile'
        });
        for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) g[y][x] = w[y][x];
        fx = gg => { if (F % 4 === 0) { this.fxPix(gg, 11, 37, 'q'); this.fxPix(gg, 10, 36, 'N'); } };
        break;
      }

      // ---- 18 BOOP (8) : poked on the forehead, recoil, rub, laugh it off ----
      case 'boop': {
        const poses = [
          { eyes: 'lookR', mouth: 'smile', bob: 0, sway: 0 },
          { eyes: 'wide', mouth: 'ohh', bob: 0, sway: 0, browUp: true },
          { eyes: 'squint', mouth: 'wide', bob: 2, sway: 1, armL: 'up', armR: 'up', legs: 'bend', blushBig: true },
          { eyes: 'closed', mouth: 'wobble', bob: 3, sway: 1, armL: 'up', armR: 'up', legs: 'bend', blushBig: true },
          { eyes: 'squint', mouth: 'flat', bob: 1, sway: 0, armR: 'chin', armL: 'hip', blushBig: true },
          { eyeL: 'closed', eyeR: 'normal', mouth: 'smirk', bob: 0, armR: 'chinTap', armL: 'hip', blushBig: true },
          { eyes: 'happy', mouth: 'grin', bob: 0, sway: 1, armL: 'hip', armR: 'hip', blushBig: true },
          { eyes: 'normal', mouth: 'smile', bob: 0, armL: 'down', armR: 'down' }
        ];
        const p = poses[F];
        this.body(g, p);
        // the hand goes in before outline() so it gets the same 1px dark edge
        const hx = [18, 15, 16, 19, 0, 0, 0, 0][F];
        if (F < 4) this.pokeHand(g, hx, 12);
        this.outline(g); this.shift(g, p.bob);
        fx = gg => {
          if (F === 1) this.impact(gg, 14, 13, 3);
          if (F === 2) { this.impact(gg, 15, 14, 4); this.spark(gg, 6, 10, 3, 'i'); }
          if (F === 3) this.impact(gg, 15, 14, 6);
          if (F === 4) { this.fxPix(gg, 6, 14, 'q'); this.fxPix(gg, 25, 13, 'q'); }
          if (F === 6) { this.fxPix(gg, 5, 12, 'y'); this.fxPix(gg, 26, 11, 'y'); this.fxPix(gg, 4, 14, 'i'); }
        };
        break;
      }

      // ---- 19 HELD (6) : pinched by the collar, legs kicking, tails swinging ----
      case 'held': {
        const swing = [0, 1, 1, 0, -1, -1][F];
        const w = this.sideView({
          legs: 'dangle', arm: 'limp', dy: 1 + (F % 2),
          tailSwing: swing > 0 ? 1 : 0, lean: swing,
          eyes: F < 2 ? 'wide' : (F === 3 ? 'closed' : 'normal'),
          mouth: F < 2 ? 'open' : (F > 3 ? 'smile' : 'flat')
        });
        for (let y = 0; y < 40; y++) for (let x = 0; x < 30; x++) g[y][x] = w[y][x];
        // collar yanked into a peak at the nape: the user's own cursor is the hand
        const cx = 14 + swing;
        this.r(g, cx, 21, cx + 3, 23, 'W'); this.r(g, cx + 1, 19, cx + 2, 20, 'W');
        this.d(g, cx + 1, 19, 'w'); this.outline(g);
        fx = gg => {
          if (F < 2) this.bang(gg, 25, 16);
          if (F > 2) { this.fxPix(gg, 27 - F, 30, 'q'); this.fxPix(gg, 5 + F, 26, 'q'); }
        };
        break;
      }

      // ---- 20 DUMP (12) : shrug the straps, tip the pack out, relief ----
      case 'dump': {
        if (F < 2) {
          this.body(g, { pack: 3, packLean: F, strap: true, legs: 'bend', eyes: 'strain', mouth: 'grit', brow: true, sway: F });
          this.sweat(g, [[22, 14 + F], [7, 16 + F]]); this.outline(g); this.shift(g, F);
        } else if (F < 4) {
          this.body(g, { pack: 3, packLean: 1, strap: true, legs: 'bend', armR: 'strapPull', armL: 'hip', eyes: 'strain', mouth: 'grit', brow: true, sway: 1 });
          this.r(g, 19, 22, 20, 26, 'D'); this.outline(g); this.shift(g, 1);
        } else if (F < 6) {
          // straps clear, the pack thuds down beside her and she comes upright
          this.body(g, { legs: 'bend', armL: 'hip', armR: 'out', eyes: 'squint', mouth: 'open', sway: 1 });
          const dp = F === 4 ? 25 : 30;
          this.r(g, 21, dp, 28, dp + 6, 'd'); this.r(g, 21, dp, 28, dp, 'D');
          this.r(g, 21, dp + 3, 28, dp + 3, 'D'); this.d(g, 24, dp + 4, 'i');
          this.outline(g);
        } else if (F < 9) {
          // kneels, grabs it, turns it mouth-down
          const tip = F - 6;
          this.body(g, { legs: 'kneel', armL: 'front', armR: 'front', eyes: tip > 1 ? 'happy' : 'squint', mouth: tip > 1 ? 'wide' : 'grit', sway: 1 });
          if (tip === 0) { this.r(g, 21, 28, 28, 34, 'd'); this.r(g, 21, 28, 28, 28, 'D'); this.r(g, 21, 31, 28, 31, 'D'); }
          else if (tip === 1) { this.r(g, 21, 26, 28, 32, 'd'); this.r(g, 21, 26, 28, 26, 'D'); this.r(g, 21, 32, 28, 32, 'D'); }
          else { this.r(g, 22, 23, 28, 29, 'd'); this.r(g, 22, 23, 28, 23, 'D'); this.r(g, 22, 29, 28, 29, 'D'); }
          this.outline(g);
        } else {
          const p = [
            { armL: 'out', armR: 'out', eyes: 'closed', mouth: 'ohh', legs: 'stand', bob: 0 },
            { armL: 'upHigh', armR: 'upHigh', eyes: 'closed', mouth: 'grin', legs: 'tip', bob: -2, tailLift: 2, blushBig: true },
            { armL: 'hip', armR: 'hip', eyes: 'sparkle', mouth: 'grin', legs: 'stand', bob: 0, blushBig: true }
          ][F - 9];
          this.body(g, p); this.outline(g); this.shift(g, p.bob);
        }
        fx = gg => {
          if (F === 4) { this.puff(gg, 24, 37, 1, 'q'); this.fxPix(gg, 28, 33, 'N'); }
          if (F === 5) { this.puff(gg, 24, 37, 2, 'q'); this.puff(gg, 20, 37, 1, 'N'); }
          if (F > 5 && F < 9) {
            const s = F - 6;
            [[24, 30], [21, 33], [27, 32], [19, 36]].forEach((pt, i) => {
              if (i > s + 1) return;
              this.sheet(gg, pt[0] - i, pt[1] + s * 2, 3, true);
            });
            this.puff(gg, 24, 36, 1 + s, 'q');
          }
          if (F === 9) { this.puff(gg, 15, 36, 2, 'N'); this.fxPix(gg, 3, 24, 'q'); this.fxPix(gg, 27, 22, 'q'); }
          if (F > 9) {
            this.rays(gg, 15, 18, 8, 12, 'y', 'i', F * 0.3);
            this.fxPix(gg, 5, 10, 'y'); this.fxPix(gg, 25, 8, 'y'); this.fxPix(gg, 3, 16, 'i');
          }
        };
        break;
      }

      // ---- 21 NUDGE (8) : knock on the glass, point at her head, plead ----
      case 'nudge': {
        const poses = [
          { armL: 'hip', armR: 'hip', eyes: 'lookR', mouth: 'flat', bob: 0 },
          { armL: 'hip', armR: 'front', eyes: 'wide', mouth: 'open', bob: 0, browUp: true },
          { armL: 'hip', armR: 'out', eyes: 'wide', mouth: 'wide', bob: 1, browUp: true, sway: 1 },
          { armL: 'hip', armR: 'front', eyes: 'normal', mouth: 'flat', bob: 0 },
          { armL: 'hip', armR: 'ear', eyes: 'up', mouth: 'wobble', bob: 0, brow: true, sway: 1 },
          { armL: 'hip', armR: 'chin', eyes: 'squint', mouth: 'flat', bob: 0, brow: true },
          { armL: 'front', armR: 'front', eyes: 'up', mouth: 'ohh', bob: 1, blushBig: true, sway: 1 },
          { armL: 'hip', armR: 'hip', eyes: 'happy', mouth: 'smile', bob: 0, browUp: true }
        ];
        const p = poses[F];
        this.body(g, p); this.outline(g); this.shift(g, p.bob);
        fx = gg => {
          if (F === 1) this.impact(gg, 22, 27, 3);
          if (F === 2) { this.impact(gg, 26, 25, 3); this.impact(gg, 26, 25, 5); this.bang(gg, 26, 14); }
          if (F === 3) this.impact(gg, 24, 26, 4);
          if (F === 4) { this.arcs(gg, 27, 18, 2, 1, 'i'); this.fxPix(gg, 5, 12, 'x'); }
          if (F === 5) this.chatbox(gg, 19, 2, 9, 5, [6, 4], 'think');
          if (F === 6) { this.fxPix(gg, 6, 14, 'c'); this.fxPix(gg, 24, 13, 'c'); }
          if (F === 7) { this.fxPix(gg, 5, 11, 'y'); this.fxPix(gg, 26, 10, 'y'); }
        };
        break;
      }

      default: this.body(g, {}); this.outline(g);
    }

    if (slot === 'head') { this.hatOn(g, opts.item, 0); this.outline(g); }
    else if (slot === 'back') { this.harness(g, 'Q'); this.outline(g); }
    else if (slot === 'scene') this.rimLight(g, 1, 'L');
    this._hat = false;
    if (fx && opts.fx !== false) { this.lockMask(g); fx(g); this.freeMask(); }
    return g;
  }

  // ---- load states. layer: 'all' | 'base' | 'fx' -------------------------
  state(id, f, opts) {
    opts = opts || {};
    const layer = opts.layer || 'all';
    const base = layer !== 'fx', over = layer !== 'base';
    const g = this.mk(30, 40);
    const F = f % 4;
    if (id === 'fresh') {
      if (base) {
        this.body(g, { pack: 1, strap: true, eyes: F === 2 ? 'closed' : 'normal', mouth: 'smile', sway: F === 1 || F === 2 ? 1 : 0 });
        this.outline(g); if (F === 1 || F === 2) this.shift(g, 1);
      }
    } else if (id === 'loaded') {
      if (base) {
        this.body(g, { pack: 2, strap: true, legs: 'wide', eyes: 'normal', mouth: 'flat', sway: F > 1 ? 1 : 0 });
        this.outline(g); if (F === 2) this.shift(g, 1);
      }
    } else if (id === 'heavy') {
      if (base) {
        this.body(g, { pack: 3, packLean: F > 1 ? 1 : 0, strap: true, legs: 'bend', eyes: 'strain', mouth: 'grit', brow: true, sway: F % 2 });
        this.outline(g); if (F === 2) this.shift(g, 1);
      }
      if (over) this.sweat(g, F % 2 ? [[22, 16], [7, 18]] : [[22, 14], [7, 16]]);
    } else if (id === 'crashed') {
      if (base) {
        this.prone(g, { dy: F === 1 ? -1 : 0, eyesX: true });
        this.topple(g, 20, 17 + (F % 2));
        this.outline(g);
      }
      if (over) this.swirl(g, 10, 23, F);
    } else if (id === 'chest') {
      if (base) { this.chestBox(g, F === 0); this.outline(g); }
      if (over && F > 0) {
        // lid swings up on its hinge, then the loot bursts
        const lidY = [0, 19, 15, 12][F], tilt = [0, -0.15, -0.3, -0.45][F];
        this.chestLid(g, lidY, tilt); this.outline(g);
      }
      if (over && F > 1) {
        [[4, 20], [26, 19], [12, 12], [18, 10], [2, 12], [27, 25], [9, 8], [22, 6]].forEach((p, i) =>
          { this.d(g, p[0], p[1], i % 2 ? 'y' : 'i'); this.d(g, p[0] + 1, p[1] + 1, 'z'); });
      }
      if (over && F === 3) this.r(g, 9, 23, 21, 24, 'y');
    }
    return g;
  }

  // Icon plate: the master bust composited over a filled background.
  // 'day'  — Dan-the-Man style outdoor scene, best at 128px and up.
  // 'dark' — brand plate, holds up at 16-32px in the taskbar and tray.
  iconPlate(size, variant) {
    const g = this.mk(size, size);
    const S = size;
    if (variant === 'day') {
      this.r(g, 0, 0, S - 1, S - 1, 'A');
      this.r(g, 0, 0, S - 1, Math.round(S * 0.12), 'a');
      const gy = Math.round(S * 0.74);
      this.r(g, 0, gy, S - 1, S - 1, 'G'); this.r(g, 0, gy + Math.round(S * 0.09), S - 1, S - 1, 'V');
      if (S >= 24) {
        const cy = Math.round(S * 0.2), cw = Math.max(3, Math.round(S * 0.16));
        this.r(g, 1, cy, 1 + cw, cy + 1, 'u'); this.r(g, 2, cy - 1, cw, cy - 1, 'u');
        this.r(g, S - 2 - cw, cy + Math.round(S * 0.1), S - 2, cy + 1 + Math.round(S * 0.1), 'u');
      }
      if (S >= 32) {
        for (let x = 1; x < S; x += 5) this.d(g, x, gy + 2, 'V');
        this.r(g, 1, gy - 3, 3, gy - 1, 'V'); this.r(g, S - 4, gy - 2, S - 2, gy - 1, 'V');
      }
    } else {
      this.r(g, 0, 0, S - 1, S - 1, 'J');
      this.r(g, 0, 0, S - 1, Math.round(S * 0.42), 'j');
      this.r(g, 0, S - Math.max(1, Math.round(S * 0.06)), S - 1, S - 1, 'i');
      if (S >= 24) {
        this.d(g, 2, 2, 'i'); this.d(g, S - 3, 3, 'i'); this.d(g, S - 4, S - 6, 'i');
      }
    }
    // day plate insets the smaller master so the scene reads around her
    const src = size === 16 ? this.icon(16)
      : (size === 24 ? this.icon(24) : this.icon(variant === 'day' ? 24 : 32));
    const n = src.length;
    const off = Math.floor((S - n) / 2);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      if (src[y][x] !== '.') this.d(g, x + off, y + off, src[y][x]);
    return g;
  }

  // ---- app icon masters: 16, 24, 32 --------------------------------------
  // Same construction as the sheet face, only wider: crown mass, fringe with a
  // two-pixel centre lock, sideburns framing the cheeks, and twin tails hung
  // from a gold scrunchie with a highlight below it. Eyes keep the sheet's
  // order — lash line on top, white sclera, teal iris, gold glint low-right.
  icon(size) {
    if (size === 16) {
      // Taskbar and tray asset: the face has to dominate. No sideburns, no
      // centre lock, tails cut to one column each so the skin wins the frame.
      const g = this.mk(16, 16);
      this.r(g, 5, 1, 10, 1, 'h'); this.r(g, 4, 2, 11, 2, 'h'); this.r(g, 3, 3, 12, 5, 'h');
      this.r(g, 3, 6, 12, 10, 's'); this.r(g, 4, 11, 11, 11, 's'); this.r(g, 5, 11, 10, 11, 'S');
      this.r(g, 1, 5, 2, 5, 'i'); this.r(g, 13, 5, 14, 5, 'i');
      this.r(g, 1, 6, 2, 10, 'h'); this.r(g, 13, 6, 14, 10, 'h');
      this.d(g, 1, 7, 'l'); this.d(g, 14, 7, 'l');
      this.r(g, 4, 7, 6, 7, 'E'); this.r(g, 9, 7, 11, 7, 'E');
      this.r(g, 4, 8, 6, 8, 'u'); this.r(g, 9, 8, 11, 8, 'u');
      this.r(g, 5, 8, 6, 8, 'e'); this.r(g, 10, 8, 11, 8, 'e');
      this.d(g, 3, 10, 'k'); this.d(g, 12, 10, 'k'); this.r(g, 7, 10, 8, 10, 'E');
      this.r(g, 3, 12, 12, 15, 'w'); this.r(g, 6, 12, 9, 12, 'T'); this.r(g, 7, 13, 8, 15, 't');
      this.outline(g); return g;
    }
    if (size === 24) {
      const g = this.mk(24, 24);
      this.r(g, 8, 2, 15, 2, 'h'); this.r(g, 7, 3, 16, 3, 'h'); this.r(g, 5, 4, 18, 9, 'h');
      this.r(g, 6, 10, 17, 17, 's'); this.r(g, 8, 18, 15, 18, 's'); this.r(g, 10, 18, 13, 18, 'S');
      this.r(g, 11, 7, 12, 10, 'l');
      this.r(g, 5, 10, 6, 14, 'h'); this.r(g, 17, 10, 18, 14, 'h');
      this.r(g, 2, 8, 4, 8, 'i'); this.r(g, 19, 8, 21, 8, 'i');
      this.r(g, 2, 9, 4, 17, 'h'); this.r(g, 19, 9, 21, 17, 'h');
      this.r(g, 3, 18, 4, 19, 'h'); this.r(g, 19, 18, 20, 19, 'h');
      this.d(g, 3, 10, 'l'); this.d(g, 20, 10, 'l');
      this.r(g, 8, 11, 10, 11, 'E'); this.r(g, 13, 11, 15, 11, 'E');
      this.r(g, 8, 12, 10, 13, 'u'); this.r(g, 13, 12, 15, 13, 'u');
      this.r(g, 9, 12, 10, 13, 'e'); this.r(g, 14, 12, 15, 13, 'e');
      this.d(g, 10, 13, 'i'); this.d(g, 15, 13, 'i');
      this.r(g, 6, 15, 7, 15, 'k'); this.r(g, 16, 15, 17, 15, 'k');
      this.r(g, 11, 15, 12, 15, 'E'); this.d(g, 12, 14, 'E');
      this.r(g, 5, 19, 18, 23, 'w'); this.r(g, 9, 19, 14, 19, 'T'); this.r(g, 10, 20, 13, 23, 't');
      this.r(g, 8, 19, 8, 23, 'W'); this.r(g, 15, 19, 15, 23, 'W');
      // harness: the strap crosses the shoulder seam and carries a buckle,
      // so it reads as worn rather than laid beside her
      this.r(g, 6, 19, 7, 20, 'd'); this.r(g, 7, 21, 8, 22, 'd'); this.d(g, 8, 23, 'd');
      this.r(g, 6, 19, 7, 19, 'D'); this.d(g, 7, 22, 'i');
      this.outline(g); return g;
    }
    const g = this.mk(32, 32);
    this.r(g, 11, 2, 20, 2, 'h'); this.r(g, 10, 3, 21, 3, 'h'); this.r(g, 7, 4, 24, 12, 'h');
    this.r(g, 8, 13, 23, 21, 's'); this.r(g, 11, 22, 20, 22, 's'); this.r(g, 13, 22, 18, 22, 'S');
    this.r(g, 15, 9, 16, 13, 'l'); this.d(g, 14, 12, 'l');
    this.r(g, 7, 13, 9, 18, 'h'); this.r(g, 22, 13, 24, 18, 'h');
    this.r(g, 3, 11, 6, 11, 'i'); this.r(g, 25, 11, 28, 11, 'i');
    this.r(g, 3, 12, 6, 23, 'h'); this.r(g, 25, 12, 28, 23, 'h');
    this.r(g, 4, 24, 6, 25, 'h'); this.r(g, 25, 24, 27, 25, 'h');
    this.r(g, 3, 13, 4, 15, 'l'); this.r(g, 27, 13, 28, 15, 'l');
    this.r(g, 11, 14, 14, 14, 'E'); this.r(g, 17, 14, 20, 14, 'E');
    this.r(g, 11, 15, 14, 17, 'u'); this.r(g, 17, 15, 20, 17, 'u');
    this.r(g, 12, 15, 13, 17, 'e'); this.r(g, 18, 15, 19, 17, 'e');
    this.r(g, 12, 15, 13, 15, 'E'); this.r(g, 18, 15, 19, 15, 'E');
    this.d(g, 13, 17, 'i'); this.d(g, 19, 17, 'i');
    this.r(g, 9, 19, 10, 19, 'k'); this.r(g, 21, 19, 22, 19, 'k');
    this.r(g, 15, 20, 16, 20, 'E'); this.d(g, 17, 20, 'E'); this.d(g, 17, 19, 's');
    // pack shell first, then the jacket over it, so the shell sits BEHIND her arm
    this.r(g, 22, 25, 28, 31, 'd'); this.r(g, 22, 25, 28, 25, 'D');
    this.r(g, 23, 28, 28, 28, 'D'); this.d(g, 27, 27, 'i');
    this.r(g, 7, 23, 24, 31, 'w'); this.r(g, 13, 23, 18, 23, 'T'); this.r(g, 14, 24, 17, 31, 't');
    this.r(g, 11, 23, 11, 31, 'W'); this.r(g, 20, 23, 20, 31, 'W');
    // harness over the shoulder seam with a buckle on the chest
    this.r(g, 8, 23, 10, 24, 'd'); this.r(g, 9, 25, 11, 27, 'd'); this.r(g, 10, 28, 12, 31, 'd');
    this.r(g, 8, 23, 10, 23, 'D'); this.r(g, 10, 26, 11, 26, 'i'); this.d(g, 9, 25, 'D');
    this.outline(g); return g;
  }
}

if (typeof window !== 'undefined') window.JuleLib = { PAL, STATES, ACTIONS, ITEMS, Jule };
