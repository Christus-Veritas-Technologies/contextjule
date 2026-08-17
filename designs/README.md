# ContextJule

A desktop pet that reads your AI context window.

Context length is the one number that decides whether a ChatGPT or Claude
session is going well, and nothing shows it to you. ContextJule turns it into
a character. Jule lives on your desktop, watches how much context your session
is carrying, and visibly carries the weight herself. Three thousand tokens in
she is standing tall with a small pack. A hundred and twenty thousand in she is
bent double under a tower of scrolls asking whether you want to start fresh.
Click once and she dumps the pack on the floor.

The product is a Tauri desktop agent. Everything runs locally: it reads session
length on the machine, never types into your chat, and no session text leaves
the computer. One price, no subscription, no account.

## What is in this archive

    icons/         every app, store and tray icon, all sizes, day and dark
    animations/    every sprite strip as PNG, plus manifest.json and the sheet
    screens/       the desktop app's screens as standalone HTML
    site/          the landing page as standalone HTML
    source/        jule-sprite.js, the engine every frame is generated from

Each folder has its own README with the details. Read `source/README.md` first
if you intend to add frames later: every PNG in this archive is generated from
that one file, so it is the only thing here that cannot be regenerated.

## The character

Jule is drawn on a 30x40 pixel grid at 1x. Strawberry twin tails tied with gold
scrunchies, denim jacket over a cream tank, teal eyes with a gold glint low and
right. She is always transparent-backed: only in-scene effects and props are
drawn around her, never a background.

Palette is 40 fixed entries, listed in `animations/manifest.json` under
`palette`. Do not add colours. Do not anti-alias. Scale with nearest-neighbour
only, at whole-number factors.

## The load states

    fresh      0 - 5k       green     standing tall, tails up, small pack
    loaded     5k - 32k     gold      wider stance, pack stuffed, focused
    heavy      32k - 128k   orange    knees bent, pack towering, brow down
    crashed    128k +       red       face down, pack toppled

Her pose, her pack and her face all move together, so the state reads at a
glance without anyone having to read a number.

## Design rules that hold everywhere

Silkscreen for all UI type, Space Grotesk for body copy. Gold `#f0b13f` is the
only primary; it appears once per screen. Every border is 3px solid `#17121f`
or `#221b2c`. Every shadow is a hard offset, never a blur, never a glow.
Nothing is rounded. No gradients except the sky and grass scene, which is a
fixed three-stop sky over a two-tone grass field.
