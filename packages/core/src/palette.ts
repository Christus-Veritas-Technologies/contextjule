/**
 * The forty fixed palette entries the sprite engine draws from, keyed by the
 * single characters `designs/source/jule-sprite.js` uses in its frame grids.
 *
 * Do not add colours. Do not anti-alias. Scale with nearest-neighbour only, at
 * whole-number factors. See `designs/README.md`.
 */
export const PALETTE = {
  o: "#221b2c",
  h: "#b0523c",
  l: "#d1795a",
  s: "#f6ceac",
  S: "#dda87f",
  k: "#ec8f96",
  w: "#3f5a7a",
  W: "#2c4059",
  t: "#e8e2d6",
  T: "#c2bbad",
  r: "#3a4a63",
  R: "#2a3648",
  b: "#e8e2d6",
  B: "#c2bbad",
  e: "#2f8f8f",
  E: "#1c5a5a",
  u: "#fff9f2",
  i: "#f0b13f",
  c: "#7ecad6",
  C: "#4a93a8",
  x: "#e04a4a",
  g: "#7bbf6a",
  n: "#6a6478",
  N: "#928ba6",
  d: "#a3814f",
  D: "#6d5433",
  f: "#4a4458",
  m: "#8f5f3f",
  p: "#b58ad6",
  P: "#8659ad",
  y: "#f5e07a",
  z: "#c9a227",
  q: "#9aa3b5",
  Q: "#5d6675",
  A: "#4fb3e8",
  a: "#2f7fb8",
  G: "#5aa84f",
  V: "#33683a",
  J: "#2a2136",
  j: "#3d3150",
  H: "#8a3f2e",
  L: "#ffb066",
  M: "#c96a2e",
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** The transparent cell marker used inside sprite grids. */
export const TRANSPARENT = "." as const;

/**
 * Named colours the chrome is built from. Every one of these is either a
 * palette entry or a shade the screens in `designs/screens` use directly.
 */
export const INK = {
  /** Every border. The darker of the two. */
  border: "#17121f",
  /** Every border on light chrome, and the title bar fill. */
  borderSoft: "#221b2c",
  /** The one primary. It appears once per screen. */
  gold: "#f0b13f",
  goldHover: "#ffd07a",
  goldBright: "#ffc861",
  goldDeep: "#c9a227",
} as const;

/**
 * Surface bands. Each screen sits on exactly one, so scrolling and tabbing
 * read as moving through daylight rather than through one flat page.
 */
export const BAND = {
  /** App chrome and the sessions screen. */
  cream: "#fdf6ea",
  /** Cards sitting on cream. */
  creamRaised: "#fffdf8",
  /** The speech box interior. */
  creamSpeech: "#fff9f2",
  /** Rules and inactive meter segments on cream. */
  creamRule: "#e4d3b8",
  creamBorder: "#d9c4a4",
  /** The nudges screen. */
  sky: "#dff2fb",
  skyDeep: "#b9e4f6",
  skyInk: "#12283d",
  skyInkSoft: "#5b6b7c",
  /** The growth screen. */
  dusk: "#2b2242",
  duskTop: "#3a2f56",
  duskBottom: "#241d38",
  duskCard: "#5b4a7f",
  duskCardEnd: "#463869",
  /** The page the design sheets themselves sit on. */
  night: "#141119",
  nightRaised: "#1c1924",
  nightRule: "#2c2736",
} as const;

/** The three-stop sky and two-tone grass the home scene is built from. */
export const SCENE = {
  skyTop: "#3d8fc4",
  skyMid: "#5fbcec",
  skyLow: "#9adcf3",
  grass: "#5aa84f",
  grassLip: "#6dbd5e",
  grassShade: "#4f9846",
  tuftLight: "#5aa84f",
  tuftDark: "#33683a",
  cloud: "#fff9f2",
  cloudShade: "#9aa3b5",
} as const;

/** Text shades, by the surface the text sits on. */
export const TEXT = {
  onCream: "#231b12",
  onCreamMuted: "#6b5b48",
  onCreamFaint: "#8a7660",
  onCreamBody: "#4c3f31",
  onSky: "#12283d",
  onSkyMuted: "#5b6b7c",
  onDusk: "#e6dff5",
  onDuskMuted: "#c3b8dc",
  onDuskFaint: "#bdb0d8",
  onNight: "#f4efe9",
  onNightMuted: "#a8a2b4",
  onNightFaint: "#968fa3",
  onDark: "#e8e2d6",
} as const;
