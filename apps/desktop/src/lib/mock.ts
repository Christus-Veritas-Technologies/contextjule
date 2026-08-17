/**
 * Placeholder data for the screens.
 *
 * Every value here is the one `designs/screens/app-screens.html` draws, so the
 * built screens can be compared against the sheet directly. It is all replaced
 * by the Rust side once session reading lands — nothing in the app should
 * import from here except a route's default state.
 */
export const MOCK_SESSION = {
  tokens: 42_180,
  windowSize: 200_000,
  model: "claude",
  elapsedMs: 72 * 60_000,
  /** The sheet draws four segments here rather than the three 42,180 computes to. */
  meterFilled: 4,
  state: "loaded" as const,
  note: "She is fine. Ask her again in twenty thousand tokens.",
  notePip: "#7bbf6a",
};

export const MOCK_SESSIONS = [
  {
    name: "API auth refactor",
    tokens: 52_000,
    label: "52k",
    fraction: 0.72,
    accent: "#e08a3a",
    note: "Heavy. She suggested a summary twice.",
  },
  {
    name: "Tauri tray icons",
    tokens: 31_000,
    label: "31k",
    fraction: 0.44,
    accent: "#f0b13f",
    note: "Loaded. Steady the whole way.",
  },
  {
    name: "Landing page copy",
    tokens: 24_000,
    label: "24k",
    fraction: 0.34,
    accent: "#f0b13f",
    note: "Loaded. Two cleanses.",
  },
  {
    name: "Standup notes",
    tokens: 11_000,
    label: "11k",
    fraction: 0.15,
    accent: "#7bbf6a",
    note: "Fresh. She napped through it.",
  },
];

export const MOCK_SESSIONS_SUMMARY = {
  heading: "today",
  count: "4 sessions · 118k",
  carryOver: "Yesterday you were debugging that API. Want calm mode while you finish?",
};

export const MOCK_NUDGES = [
  { id: "warnings", name: "Context warnings", note: "At 60% and 90% of the window", on: true },
  { id: "hydration", name: "Hydration breaks", note: "After two hours in one session", on: true },
  { id: "rituals", name: "Open and close rituals", note: "She waves in, debriefs out", on: true },
  { id: "cursor", name: "Follow the cursor", note: "She looks where you point", on: false },
  { id: "sleep", name: "Overnight sleep", note: "Curls up after 30 idle minutes", on: true },
];

export const MOCK_GROWTH = {
  headline: "104 hours together",
  subhead: "1.4M tokens carried. She has started leaving notes.",
  stats: [
    { value: "1.4M", label: "tokens carried" },
    { value: "312", label: "cleanses" },
    { value: "17", label: "collapses" },
  ],
  unlocks: [
    { name: "Wizard hat", requirement: "unlocked", unlocked: true },
    { name: "Campfire idle", requirement: "150 hours", unlocked: false },
    { name: "Second outfit", requirement: "2M tokens", unlocked: false },
  ],
};

/** What the compact surfaces show. From `designs/screens/widget-layouts.html`. */
export const MOCK_SURFACE = {
  stateLabel: "Loaded",
  tokenText: "48.2k",
  tokens: 48_200,
  meterFilled: 4,
  meterColor: "#f0b13f",
  caption: "Streaming response",
};
