"use client";

import { COSMETICS, type CosmeticSlot, progressToward } from "@contextjule/core";
import { Sprite } from "@contextjule/ui/components/sprite";
import { useState } from "react";

import { useWardrobe } from "../lib/data";

/**
 * The wardrobe.
 *
 * The design's growth screen listed unlocks as dead rows. They are the only
 * reward loop in the product, so they are worth being able to *wear* — the
 * sprite engine draws worn items into the pose rather than layering them on
 * top, which is why tapping one previews her actually wearing it rather than
 * showing a flat icon.
 *
 * Locked rows stay visible and dimmed, exactly as the design has them. A
 * progress bar underneath is the one addition: "150 hours" means nothing
 * without knowing you are at 92.
 */
export function Wardrobe() {
  const { equipped, earned, stats, equip } = useWardrobe();
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview ?? equipped.head ?? equipped.back ?? null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-pixel text-[10px] text-[#ffc861]">wardrobe</span>
        <span className="font-pixel text-[8px] text-[#bdb0d8]">
          {earned.size} of {COSMETICS.length}
        </span>
      </div>

      {/* She models whatever is selected. Front view: `worn()` has three, and
          front is the one every collectible is drawn for. */}
      <div
        className="flex items-center gap-3.5 border-3 border-ink p-3"
        style={{ background: "linear-gradient(#5b4a7f,#463869)" }}
      >
        <Sprite wearing={shown ?? undefined} state={shown ? undefined : "fresh"} scale={3} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="font-pixel text-[11px] text-[#fdf6ea]">
            {shown ? COSMETICS.find((c) => c.id === shown)?.name : "nothing on"}
          </span>
          <span className="text-[11px] leading-[1.5] text-[#c3b8dc]">
            {shown
              ? COSMETICS.find((c) => c.id === shown)?.note
              : "Everything she earns turns up here."}
          </span>
        </div>
      </div>

      {COSMETICS.map((cosmetic) => {
        const unlocked = earned.has(cosmetic.id);
        const worn = equipped[cosmetic.slot] === cosmetic.id;
        const progress = progressToward(cosmetic, stats);

        return (
          <button
            key={cosmetic.id}
            type="button"
            disabled={!unlocked}
            onPointerEnter={() => unlocked && setPreview(cosmetic.id)}
            onPointerLeave={() => setPreview(null)}
            onClick={() => void equip(cosmetic.slot as CosmeticSlot, worn ? null : cosmetic.id)}
            className="flex flex-col gap-2 border-2 border-ink bg-dusk px-[13px] py-[11px] text-left outline-none disabled:cursor-default"
            style={{ opacity: unlocked ? 1 : 0.62 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-[11px]">
                <span
                  className="block size-2.5 shrink-0"
                  style={{ background: worn ? "#f0b13f" : unlocked ? "#7bbf6a" : "#6a6478" }}
                />
                <span className="text-[12px] text-[#e6dff5]">{cosmetic.name}</span>
              </div>
              <span className="font-pixel text-[8px] whitespace-nowrap text-[#bdb0d8]">
                {worn ? "worn" : unlocked ? "tap to wear" : cosmetic.label}
              </span>
            </div>

            {/* Only on the locked ones. A full bar under something already
                earned is noise. */}
            {!unlocked ? (
              <div className="flex gap-[2px]">
                {Array.from({ length: 18 }, (_, index) => (
                  <span
                    key={index}
                    className="block h-[4px] flex-1"
                    style={{
                      background: index < Math.round(progress * 18) ? "#8659ad" : "#3d3150",
                    }}
                  />
                ))}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
