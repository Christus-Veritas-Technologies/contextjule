//! The tray icon.
//!
//! The tray is the app's real home: the main window hides into it, and the
//! badge is how the load state stays visible when every window is closed.
//!
//! Icons are embedded with `include_bytes!` rather than resolved from the
//! bundle at runtime. One less thing that can be missing from an install, and
//! it keeps the promise that everything lives inside the executable.

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle,
};

use crate::windows;

pub const TRAY_ID: &str = "main";

const ICON_IDLE: &[u8] = include_bytes!("../icons/tray/tray-idle.png");
const ICON_FRESH: &[u8] = include_bytes!("../icons/tray/tray-fresh.png");
const ICON_LOADED: &[u8] = include_bytes!("../icons/tray/tray-loaded.png");
const ICON_HEAVY: &[u8] = include_bytes!("../icons/tray/tray-heavy.png");
const ICON_CRASHED: &[u8] = include_bytes!("../icons/tray/tray-crashed.png");
const ICON_ASLEEP: &[u8] = include_bytes!("../icons/tray/tray-asleep.png");

/// The badge for a load state. Each adds one accent pip in the bottom-right
/// corner, so the tray reads by shape and position as well as by colour —
/// which is what makes it legible to a colourblind user and on a mono tray.
fn icon_for(state: &str) -> &'static [u8] {
    match state {
        "fresh" => ICON_FRESH,
        "loaded" => ICON_LOADED,
        "heavy" => ICON_HEAVY,
        "crashed" => ICON_CRASHED,
        "asleep" => ICON_ASLEEP,
        _ => ICON_IDLE,
    }
}

pub fn set_state(app: &AppHandle, state: &str) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_icon(Some(Image::from_bytes(icon_for(state))?))?;
        tray.set_tooltip(Some(tooltip_for(state)))?;
    }
    Ok(())
}

fn tooltip_for(state: &str) -> &'static str {
    match state {
        "fresh" => "ContextJule — fresh",
        "loaded" => "ContextJule — loaded",
        "heavy" => "ContextJule — heavy",
        "crashed" => "ContextJule — she is on the floor",
        "asleep" => "ContextJule — asleep",
        _ => "ContextJule",
    }
}

pub fn build(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open ContextJule", true, None::<&str>)?;
    let panel = MenuItem::with_id(app, "panel", "Panel", true, None::<&str>)?;
    let mini_bar = MenuItem::with_id(app, "mini-bar", "Mini bar", true, None::<&str>)?;
    let overlay = MenuItem::with_id(
        app,
        "overlay",
        "Show her on the desktop",
        true,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&open, &panel, &mini_bar, &overlay, &separator, &quit],
    )?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(ICON_IDLE)?)
        .tooltip("ContextJule")
        // macOS renders a template image as a monochrome mask that follows the
        // menu bar's own colour. The pip carries the state by position there.
        .icon_as_template(cfg!(target_os = "macos"))
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let app = app.clone();
            match event.id().as_ref() {
                "open" => {
                    let _ = windows::show(&app, windows::MAIN);
                }
                "panel" => {
                    let _ = windows::toggle(&app, windows::PANEL);
                }
                "mini-bar" => {
                    let _ = windows::toggle(&app, windows::MINI_BAR);
                }
                "overlay" => {
                    let _ = windows::toggle(&app, windows::OVERLAY);
                }
                "quit" => app.exit(0),
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            // Left click opens the flyout, which is the cheap glance. The menu
            // is on right click, where the platform convention puts it.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let _ = windows::toggle(app, windows::TRAY_FLYOUT);
            }
        })
        .build(app)?;

    Ok(())
}
