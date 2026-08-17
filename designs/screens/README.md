# screens

The desktop app, as standalone HTML. Every file here opens in a browser with no
server, no build step and no network: the sprite engine, fonts and all frames
are inlined. These are the reference for what to build, not shippable app code.

    app-screens.html            the four main screens at 420x600
    mini-bar-and-speech.html    every mini-bar state, and the speech box
    widget-layouts.html         the four window layouts at real pixel sizes
    on-desktop-mockup.html      a 1440x900 Mac with three surfaces live

## The four screens

    01 home        the only screen with the outdoor scene. She stands on the
                   grass, the meter card floats over the sky, and the cleanse
                   button is the one gold thing on the page.
    02 sessions    what she remembers. One row per conversation, a pixel bar
                   for its share of the window.
    03 nudges      five switches for when she speaks up. The privacy line is
                   pinned to the bottom because that is what people check.
    04 growth      hours, tokens and locked unlocks. The only screen that
                   looks backwards instead of at right now.

All four share the same chrome: a 3px border, a dark title bar with three square
window buttons, and a four-tab strip along the bottom with the active tab in
gold.

## The mini bar

300x86 is the shipping size and the surface people look at most.
`mini-bar-and-speech.html` draws every state it can hold: four load states
that set the meter colour and her pose, six activity types that swap her frame,
her panel colour and her caption, and three sizes. The expanded 380x116 size
appears only at heavy and crashed, and puts the cleanse button inline so the
fix is one click away.

## The speech box

Four tones and no more: normal cream, warning with a red rule, celebration on
gold, thinking in grey with a detached dotted tail. Copy is Silkscreen 10-11px,
three lines maximum. Anything longer opens the panel instead of a balloon.

The box sits above her head by default and flips below when she is near the top
of the screen. It never crosses the window she is talking about.
