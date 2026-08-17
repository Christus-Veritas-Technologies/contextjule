"use client";

import { Button } from "@contextjule/ui/components/button";
import { KeyInput } from "@contextjule/ui/components/input";
import { useState } from "react";

import { JuleStage } from "./jule-stage";
import { licenseMessage, useLicense } from "../lib/license";

/**
 * The key screen.
 *
 * One field and one button, on the same scene as the home screen — the first
 * thing someone sees after paying should be her, not a form. She introduces
 * herself once, then walks the band and waves, which is the site hero's routine
 * and the first thing that tells you this is a pet rather than a gauge.
 */
export function Activate() {
  const { state, activate, error } = useLicense();
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);

  const message = error ?? licenseMessage(state.status);
  const failed = Boolean(error) || (state.status !== "unlicensed" && state.status !== "active");

  return (
    <div className="flex h-full flex-col">
      <JuleStage
        stageId="activate"
        className="h-[224px] shrink-0"
        scale={4}
        grassHeight={70}
        grassShadeHeight={22}
        showTufts={false}
        greeting={["hello. i am jule.", "paste your key and", "i will get to work."]}
        travel={{ from: 24, to: 268 }}
        bottom={112}
        speechAt={{ left: 14, bottom: 118 }}
        // Standing still and thinking reads better than pacing while something
        // is wrong. She resumes the walk the moment it clears.
        overrideAction={failed ? "think" : pending ? "listen" : undefined}
        patrol={{ walkMs: 5_200 }}
      />

      <form
        className="flex flex-1 flex-col gap-3 border-t-3 border-ink bg-cream p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!key.trim() || pending) return;
          setPending(true);
          await activate(key.trim());
          setPending(false);
        }}
      >
        <span className="font-pixel text-[10px] text-[#8a7660]">your license key</span>

        <KeyInput
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="PRO-XXXX-XXXX-XXXX"
          aria-invalid={failed || undefined}
          autoFocus
          data-selectable
        />

        <span className="text-[11px] leading-[1.5]" style={{ color: failed ? "#8f2018" : "#6b5b48" }}>
          {message}
        </span>

        <Button
          type="submit"
          size="lg"
          variant="primary"
          disabled={pending || !key.trim()}
          className="mt-auto"
        >
          {pending ? "checking…" : "unlock her"}
        </Button>

        <span className="text-center text-[10px] leading-[1.5] text-[#8a7660]">
          It arrived with your purchase. It does not expire, and it works offline for a week at a
          time.
        </span>
      </form>
    </div>
  );
}
