# icons

Every icon is generated from three hand-drawn masters: 16, 24 and 32 pixels.
Larger sizes are those masters scaled by whole-number factors with
nearest-neighbour, never redrawn and never resampled smoothly.

    masters/    the three source masters, transparent, plus the two plates
    app/        the application icon set for Tauri
    store/      plated square icons for stores that reject transparency
    tray/       16px monochrome-safe tray badges, one per state

## Which master feeds which size

    16          the 16 master at 1x
    24          the 24 master at 1x
    32          the 32 master at 1x
    48          the 24 master at 2x
    64, 96      the 32 master at 2x and 3x
    128 - 1024  the 32 master at 4x, 8x, 16x, 32x

The 16 master is a different drawing, not a shrunk 32. Sideburns, the centre
hair lock and the tail length are all removed so her face fills the frame at
tray size. Her eye there is one white pixel beside two teal under a lash line.

## Tauri

Point `tauri.conf.json` at `app/`:

    "icon": [
      "icons/app/32x32.png",
      "icons/app/128x128.png",
      "icons/app/128x128@2x.png",
      "icons/app/icon.png"
    ]

One rename is needed. This archive ships `app/128x128-2x.png`; Tauri expects
the filename `128x128@2x.png`. Rename it before building. The `@` could not
survive the export.

For `.ico` and `.icns`, run `tauri icon app/1024x1024.png` and let the
toolchain generate them; it produces the platform containers correctly from
the largest PNG.

## Tray

`tray/tray-idle.png` is the bare mark. The five state badges add one accent
pip in the bottom-right corner, so the tray communicates state by shape and
position as well as by colour:

    tray-fresh      green pip
    tray-loaded     gold pip
    tray-heavy      orange pip
    tray-crashed    red pip
    tray-asleep     grey pip

Ship both the 1x and the `-2x` file for each; macOS picks the retina variant
automatically when it is named `@2x` (rename as above).

## Plates

`day` is the outdoor scene behind her, matching the app's home screen and the
site hero. `dark` is the brand plate and is the one that survives at 16-32px
in a taskbar. Use `day` at 128px and above, `dark` below that.
