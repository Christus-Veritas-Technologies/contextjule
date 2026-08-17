# animations

Every strip is a single horizontal row of frames on a transparent background.
One frame is 30x40 at 1x. Slice at 30px intervals; the frame count for each
strip is in `manifest.json`.

    manifest.json          frame counts, fps, loop flags, palette
    animation-sheet.html   open this first: every animation playing, annotated
    actions/               20 animations
    states/                the 4 load states plus the loot chest
    looks/                 8 directional stills for cursor-follow
    profile/               5 side-profile stills
    accessories/           6 collectibles, three views each
    overlay/               pieces the desktop overlay needs

Each file also ships at 2x as `<name>-2x.png`, pre-scaled with
nearest-neighbour for retina displays. If you need 3x or 4x, scale the 1x file
by a whole number with nearest-neighbour. Never scale by a fraction and never
let a smoothing filter touch these files.

## Reading manifest.json

    actions[].frames    how many frames are in the strip
    actions[].fps       intended playback rate
    actions[].loop      true = hold the loop, false = play once and settle to idle
    actions[].use       what event triggers it in the app

`idle` is the resting loop. Every non-looping animation returns to `idle` when
it finishes.

## Origin

Frames are aligned bottom-centre. When you position her, anchor the bottom edge
of the frame to the ground line, not the top. Her feet sit on the last painted
row, so a naive top-left anchor will float her.

## The walk cycle

`jule_walk.png` is built on the side profile, not the front view: the skull
narrows to a face plane, the nose breaks the silhouette, one eye reads at the
front of the head, and both tails gather behind in two tones. Mirror the strip
horizontally for the other direction; do not draw a second one.

## Overlay pieces

The transparent desktop overlay needs four things no sheet contains:

    contact-shadow.png    a flat smear under her feet, so she sits on the
                          desktop instead of floating over it
    tail-down-left.png    stepped speech tail, 11x10
    tail-down-right.png   the same tail mirrored
    tail-thought.png      three detached squares, for remembering not speaking
    balloon-slice.png     9-slice source for the speech box

The balloon is a 9-slice: 4px corners stay fixed, the 1px edges repeat, the
interior is free. That is what lets one asset hold any length of copy without a
single soft pixel. Draw the box first, then the tail on top.
