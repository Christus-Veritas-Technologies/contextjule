/**
 * The wardrobe.
 *
 * Six collectibles, drawn by the sprite engine's `worn()` and slotted head,
 * back or scene. They are the only reward loop in the product, so the
 * requirements matter: each one has to be reachable by someone who actually
 * uses the thing, and none of them may be buyable.
 */
import type { Stats } from "./stats";

export const COSMETIC_SLOTS = ["head", "back", "scene"] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export interface Requirement {
  /** Hours she has been carrying for. */
  readonly hours?: number;
  /** Lifetime tokens carried. */
  readonly tokens?: number;
  readonly cleanses?: number;
  readonly sessions?: number;
}

export interface Cosmetic {
  readonly id: string;
  readonly name: string;
  readonly slot: CosmeticSlot;
  readonly requirement: Requirement;
  /** How the requirement reads on the growth screen. */
  readonly label: string;
  readonly note: string;
}

export const COSMETICS: readonly Cosmetic[] = [
  {
    id: "hat-wizard",
    name: "Wizard hat",
    slot: "head",
    requirement: { hours: 50 },
    label: "50 hours",
    note: "The first one, and deliberately cheap — nobody sticks around for a locked cabinet.",
  },
  {
    id: "pack-battery",
    name: "Battery pack",
    slot: "back",
    requirement: { sessions: 50 },
    label: "50 sessions",
    note: "Rewards breadth rather than one very long conversation.",
  },
  {
    id: "hat-cowboy",
    name: "Cowboy hat",
    slot: "head",
    requirement: { cleanses: 100 },
    label: "100 cleanses",
    note: "The only one earned by using the button the product is built around.",
  },
  {
    id: "campfire",
    name: "Campfire",
    slot: "scene",
    requirement: { hours: 150 },
    label: "150 hours",
    note: "A scene prop rather than something worn. It sits beside her on the home screen.",
  },
  {
    id: "pack-vault",
    name: "Bank vault",
    slot: "back",
    requirement: { tokens: 2_000_000 },
    label: "2M tokens",
    note: "For the people who really do carry that much.",
  },
  {
    id: "crown",
    name: "Royal crown",
    slot: "head",
    requirement: { tokens: 5_000_000 },
    label: "5M tokens",
    note: "The long one. There has to be something still out of reach.",
  },
];

export function cosmeticById(id: string): Cosmetic | undefined {
  return COSMETICS.find((cosmetic) => cosmetic.id === id);
}

/** 0..1 — how close the stats are to earning this. */
export function progressToward(cosmetic: Cosmetic, stats: Stats): number {
  const { requirement } = cosmetic;
  const ratios: number[] = [];

  if (requirement.hours !== undefined) {
    ratios.push(stats.timeTogetherMs / 3_600_000 / requirement.hours);
  }
  if (requirement.tokens !== undefined) {
    ratios.push(stats.tokensCarried / requirement.tokens);
  }
  if (requirement.cleanses !== undefined) {
    ratios.push(stats.cleanses / requirement.cleanses);
  }
  if (requirement.sessions !== undefined) {
    ratios.push(stats.sessions / requirement.sessions);
  }

  if (ratios.length === 0) return 1;
  // Every clause has to be met, so the slowest one is the real progress.
  return Math.min(1, Math.max(0, Math.min(...ratios)));
}

export function isEarned(cosmetic: Cosmetic, stats: Stats): boolean {
  return progressToward(cosmetic, stats) >= 1;
}

/** Everything the stats have earned, whether or not it has been granted yet. */
export function earnedCosmetics(stats: Stats): string[] {
  return COSMETICS.filter((cosmetic) => isEarned(cosmetic, stats)).map((c) => c.id);
}

/** One id per slot. What she is actually wearing. */
export type Equipped = Partial<Record<CosmeticSlot, string>>;

export function equippedFromSettings(settings: Record<string, string>): Equipped {
  const equipped: Equipped = {};
  for (const slot of COSMETIC_SLOTS) {
    const id = settings[`wardrobe.${slot}`];
    if (id && cosmeticById(id)?.slot === slot) equipped[slot] = id;
  }
  return equipped;
}

/** The settings key a slot writes to. Empty string means nothing worn. */
export function wardrobeKey(slot: CosmeticSlot): string {
  return `wardrobe.${slot}`;
}
