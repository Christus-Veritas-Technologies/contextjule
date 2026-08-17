"use client";

import { Button } from "@contextjule/ui/components/button";
import { Scene } from "@contextjule/ui/components/scene";
import { useState } from "react";

import { useSources } from "../lib/data";
import * as ipc from "../lib/ipc";

/**
 * First run.
 *
 * Three steps, and the middle one is the whole product: without a source she
 * has nothing to watch, and an empty meter looks identical to a broken app.
 * So this exists to get "connect Claude Code" clicked once, and then get out of
 * the way permanently.
 */
const STEPS = 3;

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { data: sources, reload } = useSources();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const available = sources.filter((source) => source.available);

  return (
    <div className="flex h-full flex-col">
      <Scene
        className="h-[200px] shrink-0"
        scale={4}
        action={step === 0 ? "wave" : step === 1 ? "listen" : "cheer"}
        grassHeight={64}
        grassShadeHeight={20}
        showTufts={false}
        character={{ left: "center", bottom: 14 }}
      />

      <div className="flex flex-1 flex-col gap-3 border-t-3 border-ink bg-cream p-4">
        {step === 0 ? (
          <>
            <span className="font-pixel text-[12px] text-[#231b12]">this is jule</span>
            <p className="text-[12px] leading-[1.6] text-[#4c3f31]">
              She watches how much context your session is carrying and carries the weight
              herself. Three thousand tokens in she stands tall. A hundred and twenty thousand
              in she is bent double asking whether you want to start fresh.
            </p>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <span className="font-pixel text-[12px] text-[#231b12]">give her something to watch</span>
            <p className="text-[12px] leading-[1.6] text-[#4c3f31]">
              {available.length > 0
                ? `Found ${available.map((s) => s.label).join(" and ")}. She can read those already. Connecting the status line makes the numbers exact — and puts a context bar in your terminal.`
                : "Nothing found yet. She reads Claude Code and Codex sessions from your own machine — start one and she will pick it up."}
            </p>
            <Button
              size="lg"
              variant="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await ipc.statuslineInstall();
                } finally {
                  reload();
                  setBusy(false);
                  setStep(2);
                }
              }}
            >
              connect Claude Code
            </Button>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <span className="font-pixel text-[12px] text-[#231b12]">she lives in the tray</span>
            <p className="text-[12px] leading-[1.6] text-[#4c3f31]">
              Closing this window tucks her into the tray rather than quitting. Right-click the
              icon for the mini bar, or to put her on your desktop.
            </p>
          </>
        ) : null}

        <div className="mt-auto flex items-center gap-2.5">
          <div className="flex gap-1.5">
            {Array.from({ length: STEPS }, (_, index) => (
              <span
                key={index}
                className="block size-2"
                style={{ background: index <= step ? "#f0b13f" : "#d9c4a4" }}
              />
            ))}
          </div>

          <Button
            size="lg"
            variant={step === STEPS - 1 ? "primary" : "secondary"}
            className="ml-auto"
            onClick={() => (step === STEPS - 1 ? onDone() : setStep(step + 1))}
          >
            {step === STEPS - 1 ? "let her in" : "next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
