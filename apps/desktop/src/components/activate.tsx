"use client";

import { Button } from "@contextjule/ui/components/button";
import { KeyInput } from "@contextjule/ui/components/input";
import { Scene } from "@contextjule/ui/components/scene";
import { useState } from "react";

import { licenseMessage, useLicense } from "../lib/license";

/**
 * The key screen.
 *
 * One field and one button, on the same scene as the home screen — the first
 * thing someone sees after paying should be her, not a form. The key came in
 * an email they already have open, so there is nothing to look up and no
 * account to make.
 */
export function Activate() {
  const { state, activate, error } = useLicense();
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);

  const message = error ?? licenseMessage(state.status);
  const failed = Boolean(error) || (state.status !== "unlicensed" && state.status !== "active");

  return (
    <div className="flex h-full flex-col">
      <Scene
        className="h-[220px] shrink-0"
        scale={4}
        action={failed ? "think" : "wave"}
        grassHeight={70}
        grassShadeHeight={22}
        showTufts={false}
        character={{ left: "center", bottom: 18 }}
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

        <span
          className="text-[11px] leading-[1.5]"
          style={{ color: failed ? "#8f2018" : "#6b5b48" }}
        >
          {message}
        </span>

        <Button type="submit" size="lg" variant="primary" disabled={pending || !key.trim()} className="mt-auto">
          {pending ? "checking…" : "unlock her"}
        </Button>

        <span className="text-center text-[10px] leading-[1.5] text-[#8a7660]">
          It arrived with your purchase. It does not expire, and it works offline for a week at a time.
        </span>
      </form>
    </div>
  );
}
