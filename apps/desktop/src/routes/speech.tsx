import { SPEECH_TONES, SPEECH_TONE_SPECS } from "@contextjule/core/speech";
import { SpeechBox } from "@contextjule/ui/components/speech-box";
import { Sprite } from "@contextjule/ui/components/sprite";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/speech")({ component: SpeechSheet });

/** The lines each tone is drawn with in `mini-bar-and-speech.html`. */
const SAMPLES = {
  normal: { lines: ["new chat.", "what are we", "building today?"], action: "idle", tail: "down-left" },
  warning: {
    lines: ["context is at 121k.", "my brain is melting.", "summarise and restart?"],
    action: "zap",
    tail: "down-left",
  },
  celebration: {
    lines: ["3 topics, 45k tokens.", "we crushed that one."],
    action: "cheer",
    tail: "down-right",
  },
  thinking: {
    lines: ["you were debugging", "that api yesterday…"],
    action: "think",
    tail: "down-left",
  },
} as const;

/**
 * A reference sheet, not a shipping surface — every speech tone against the
 * pose it is drawn with, so a copy change can be checked without opening the
 * design archive. Reachable at `/speech` in `pnpm dev:frontend`.
 */
function SpeechSheet() {
  return (
    <div data-band="night" className="min-h-svh bg-night p-14">
      <div className="flex flex-wrap gap-14">
        {SPEECH_TONES.map((tone) => {
          const sample = SAMPLES[tone];
          const spec = SPEECH_TONE_SPECS[tone];
          return (
            <div key={tone} className="flex w-[326px] flex-col gap-3">
              <div className="relative h-[206px] overflow-hidden bg-[#241f2f] p-4">
                <SpeechBox lines={[...sample.lines]} tone={tone} tail={sample.tail} />
                <Sprite
                  action={sample.action}
                  scale={2}
                  fx={false}
                  className={tone === "celebration" ? "absolute bottom-3 right-8" : "absolute bottom-3 left-6"}
                />
              </div>
              <span className="font-pixel text-[9px] text-gold">{tone}</span>
              <span className="text-[11px] leading-[1.5] text-[#968fa3]">{spec.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
