//! Window orchestration.
//!
//! Five windows are declared in `tauri.conf.json` and only `main` starts
//! visible. The rest are created hidden at launch rather than on demand: a
//! webview takes a beat to boot, and a tray flyout that appears half a second
//! after the click feels broken. They are shown and hidden, never created and
//! destroyed.
//!
//! Positions are remembered in the local store, because a mini bar that forgets
//! where it was parked is worse than no mini bar.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

use crate::store::{self, Store};

pub const MAIN: &str = "main";
pub const PANEL: &str = "panel";
pub const MINI_BAR: &str = "mini-bar";
pub const TRAY_FLYOUT: &str = "tray-flyout";
pub const OVERLAY: &str = "overlay";

pub const ALL: [&str; 5] = [MAIN, PANEL, MINI_BAR, TRAY_FLYOUT, OVERLAY];

#[derive(Debug, Serialize, Deserialize)]
struct SavedPosition {
    x: i32,
    y: i32,
}

fn position_key(label: &str) -> String {
    format!("window.{label}.position")
}

pub fn get(app: &AppHandle, label: &str) -> Option<WebviewWindow> {
    app.get_webview_window(label)
}

pub fn show(app: &AppHandle, label: &str) -> tauri::Result<()> {
    if let Some(window) = get(app, label) {
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

pub fn hide(app: &AppHandle, label: &str) -> tauri::Result<()> {
    if let Some(window) = get(app, label) {
        window.hide()?;
    }
    Ok(())
}

pub fn toggle(app: &AppHandle, label: &str) -> tauri::Result<bool> {
    let Some(window) = get(app, label) else { return Ok(false) };
    if window.is_visible().unwrap_or(false) {
        window.hide()?;
        Ok(false)
    } else {
        window.show()?;
        window.set_focus()?;
        Ok(true)
    }
}

/// Remember where a window was left.
pub fn remember_position(store: &Store, label: &str, x: i32, y: i32) {
    let value = serde_json::to_string(&SavedPosition { x, y }).unwrap_or_default();
    let _ = store::settings_set(store, &position_key(label), &value);
}

/// Put every window back where it was. Called once, at startup.
pub fn restore_positions(app: &AppHandle, store: &Store) {
    for label in ALL {
        let Ok(Some(raw)) = store::settings_get(store, &position_key(label)) else { continue };
        let Ok(saved) = serde_json::from_str::<SavedPosition>(&raw) else { continue };
        if let Some(window) = get(app, label) {
            // If the monitor it was on has since been unplugged, Tauri clamps
            // it back onto a real screen rather than stranding it off-canvas.
            let _ = window.set_position(PhysicalPosition::new(saved.x, saved.y));
        }
    }
}

/// The overlay is click-through everywhere except her body.
///
/// The window is transparent and covers a rectangle much larger than she is, so
/// leaving it clickable would eat clicks on whatever is behind it. The frontend
/// releases this on pointer-enter over her sprite and sets it again on leave.
pub fn set_click_through(app: &AppHandle, label: &str, ignore: bool) -> tauri::Result<()> {
    if let Some(window) = get(app, label) {
        window.set_ignore_cursor_events(ignore)?;
    }
    Ok(())
}

/// Park a window against the nearest screen edge, the way the mini bar snaps.
pub fn snap_to_edge(window: &WebviewWindow, threshold: i32) -> tauri::Result<()> {
    let Ok(Some(monitor)) = window.current_monitor() else { return Ok(()) };
    let screen = monitor.size();
    let position = window.outer_position()?;
    let size = window.outer_size()?;

    let mut x = position.x;
    let mut y = position.y;

    if x < threshold {
        x = 0;
    } else if (screen.width as i32 - (x + size.width as i32)) < threshold {
        x = screen.width as i32 - size.width as i32;
    }
    if y < threshold {
        y = 0;
    } else if (screen.height as i32 - (y + size.height as i32)) < threshold {
        y = screen.height as i32 - size.height as i32;
    }

    if x != position.x || y != position.y {
        window.set_position(PhysicalPosition::new(x, y))?;
    }
    Ok(())
}
