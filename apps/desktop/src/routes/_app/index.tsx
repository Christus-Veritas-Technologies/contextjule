import { LOAD_STATE_SPECS } from "@contextjule/core/context";
import { formatDuration, formatTokensExact } from "@contextjule/core/format";
import { Meter } from "@contextjule/ui/components/meter";
import { SpeechBox } from "@contextjule/ui/components/speech-box";
import { createFileRoute } from "@tanstack/react-router";

import { JuleStage } from "../../components/jule-stage";
import { hasHost } from "../../lib/ipc";
import { useJule } from "../../lib/jule";
import { MOCK_SESSION } from "../../lib/mock";

export const Route = createFileRoute("/_app/")({ component: Home });

/**
 * 01 home — the only screen with the outdoor scene.
 *
 * Layout values come from `designs/screens/app-screens.html`; her position and
 * the cloud's are measured from each frame's origin pixel, which is why `Scene`
 * uses `anchor="origin"`.
 *
 * She greets you once, then walks the grass and waves on a loop. Her pose is
 * only taken over when there is something to say with it — a reaction, or a
 * load state heavy enough that pacing cheerfully would be a lie.
 */
function Home() {
  const jule = useJule();
  const spec = LOAD_STATE_SPECS[jule.load];

  const sample = !jule.live && !hasHost();
  const tokens = sample ? MOCK_SESSION.tokens : jule.tokens;
  const elapsed = jule.session ? Date.now() - jule.session.startedAt : MOCK_SESSION.elapsedMs;

  // The patrol is her idle. Anything she is actively doing outranks it.
  const override =
    jule.reacting || jule.activity !== "idle" || jule.load === "heavy" || jule.load === "crashed"
      ? jule.action
      : undefined;

  return (
    <div className="cj-screen-in flex h-full flex-col">
      <JuleStage
        stageId="home"
        className="h-[352px] shrink-0"
        scale={4}
        skyStops={[52, 74]}
        grassHeight={96}
        grassShadeHeight={30}
        cloud={{ right: 34, top: 30, scale: 4 }}
        tufts={{ left: 0, bottom: 74, scale: 4 }}
        greeting={["hi. i am jule.", "i will carry the", "context for you."]}
        travel={{ from: 20, to: 268 }}
        bottom={188}
        speechAt={{ right: 14, bottom: 196 }}
        overrideAction={override}
        patrol={{ walkMs: 6_400 }}
      >
        <div
          className="absolute top-[18px] left-[18px] flex w-[212px] flex-col gap-3 border-3 border-[#12283d] bg-[#fffdf8] p-4"
          style={{ boxShadow: "5px 5px 0 rgba(18,40,61,0.32)" }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-pixel text-[9px] text-[#5b6b7c]">carrying</span>
            <span className="font-pixel text-[9px]" style={{ color: spec.labelColor }}>
              {spec.label}
            </span>
          </div>

          <span className="font-pixel text-[22px] text-[#12283d]">{formatTokensExact(tokens)}</span>

          <Meter
            tokens={tokens}
            windowSize={jule.windowSize}
            filled={sample ? MOCK_SESSION.meterFilled : undefined}
            segmentWidth={11}
            segmentHeight={16}
            gap={3}
          />

          <span className="text-[11px] leading-[1.5] text-[#5b6b7c]">
            {jule.live
              ? `of ${Math.round(jule.windowSize / 1000)}k · ${jule.session?.model ?? "unknown"}, ${formatDuration(elapsed)} in`
              : sample
                ? "sample reading · nothing connected yet"
                : "waiting for a session"}
          </span>
        </div>

        {jule.speaking ? (
          <button
            type="button"
            onClick={jule.dismissSpeech}
            className="absolute right-3 bottom-[196px] cursor-default"
          >
            <SpeechBox
              lines={jule.speaking.lines}
              tone={jule.speaking.tone}
              tail="down-right"
              width={176}
            />
          </button>
        ) : null}
      </JuleStage>

      <div className="flex flex-1 flex-col gap-3 border-t-3 border-ink bg-cream p-4">
        {/* The one beat of motion on a click: the caption pops when the
            command lands on the clipboard, so the hand-off is visible without
            anything moving while she is only reporting a number. */}
        <div
          className={[
            "flex items-center gap-2.5 border-2 border-[#d9c4a4] bg-[#fffdf8] px-3 py-2.5",
            jule.handedOver ? "cj-pop" : "",
          ].join(" ")}
        >
          <span className="block size-2 shrink-0" style={{ background: spec.accent }} />
          <span className="text-[12px] leading-[1.45] text-[#4c3f31]">
            {jule.handedOver
              ? `Pack down. ${jule.clearCommand} is on your clipboard — paste it into your session.`
              : jule.caption}
          </span>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => void jule.cleanse()}
            title={`Copies ${jule.clearCommand} to your clipboard`}
            className="cj-press flex flex-1 items-center justify-center border-3 border-ink-soft bg-gold px-2.5 py-[13px] shadow-hard hover:bg-gold-hover hover:shadow-hard-md active:shadow-hard-xs"
          >
            <span className="font-pixel text-[11px] whitespace-nowrap text-ink-soft">
              {jule.handedOver ? "copied. paste it." : "help her carry this"}
            </span>
          </button>
          <button
            type="button"
            onClick={jule.boop}
            className="cj-press flex items-center justify-center border-3 border-ink-soft bg-[#fffdf8] px-4 py-[13px] shadow-hard-soft hover:bg-[#f6ead6]"
          >
            <span className="font-pixel text-[11px] text-ink-soft">boop</span>
          </button>
        </div>
      </div>
    </div>
  );
}
