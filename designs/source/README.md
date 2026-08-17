# source

`jule-sprite.js` is the engine. Every PNG in this archive, every screen and the
site hero are all generated from this one file. It is the only thing here that
cannot be regenerated from something else, so it is the file to keep.

## What is in it

    PAL        the 40-entry palette, keyed by single characters
    STATES     the load states with their token ranges and accents
    ACTIONS    the 20 animations with frame counts, fps and loop flags
    ITEMS      the 6 accessories and which slot each occupies
    Jule       the class that draws everything

## How it works

A frame is a 2D array of single-character palette keys. `.` is transparent.
The drawing primitives are deliberately blunt:

    mk(w, h)                   a new empty grid
    r(g, x1, y1, x2, y2, c)    fill a rectangle
    d(g, x, y, c)              set one pixel
    outline(g)                 trace a 1px dark outline around the silhouette
    mirror(g)                  flip horizontally in place
    shadow(g, unit)            render as a CSS box-shadow string

Poses are composed by calling those primitives in order: pack first, then body,
then jacket, then head, then effects. Order matters — the pack shell is drawn
before the jacket so her arm covers its inner edge and it reads as worn on her
back rather than placed beside her.

## Getting frames out

    const J = new Jule();
    J.action('wave', 4, { fx: false })   // one action frame, no effects layer
    J.state('heavy', 1)                  // one load-state frame
    J.look('down-left')                  // one directional still
    J.sideView({ mouth: 'grin' })        // the side profile
    J.worn('hat-wizard', 'front', {})    // a pose with an accessory
    J.icon(32)                           // an icon master
    J.iconPlate(32, 'day')               // a plated icon
    J.balloon(34, 17, 'sw', [26, 18])    // a speech box

Each returns a grid. Walk the grid and fill one rectangle per cell to get a
PNG, or call `shadow(grid, unit)` to get a string you can drop straight into a
`box-shadow` and render in the DOM with no canvas at all.

## Adding a frame

Add an entry to `ACTIONS` with its frame count, then add a `case` to
`action()`. Keep three things true or the frame will not match the rest:

1. Nothing may touch column 0 or column 29 for more than two consecutive rows.
   `outline()` needs a free cell to write into, or the silhouette gets cut off
   at the frame edge.
2. Effects go in the `fx` callback, not the body, so they can be turned off.
3. Her feet stay on the same row as `idle` unless the pose is deliberately
   airborne, or she will appear to jump between animations.

## Regenerating the PNGs

Load the file, instantiate `Jule`, and for each entry in `ACTIONS` render its
frames left to right into one canvas at 30px intervals. That is exactly how
every strip in `animations/` was produced.
