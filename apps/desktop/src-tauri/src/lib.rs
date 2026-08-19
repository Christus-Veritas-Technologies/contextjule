//! ContextJule's Tauri host.
//!
//! The rule this crate exists to enforce: session text never leaves the
//! machine. Sessions, token counts, settings and unlocks live in a local
//! SQLite file. The only outbound requests the app makes at all are licence
//! checks, which send a key, a machine id and a device name — never anything
//! read from a session. Grep this crate for `reqwest`: `license.rs` is the only
//! file that has it, and that is deliberate.

mod license;
mod sources;
mod statusline;
mod store;
mod tray;
mod windows;

use serde::Serialize;
use std::sync::mpsc;
use store::{Session, SessionUpsert, Stats, Store};

use sources::{Reading, SourceRunner, SourceStatus};
use tauri::{Emitter, Manager, WindowEvent};

// ── identity ────────────────────────────────────────────────────────────────

/// A stable per-machine identifier so a reinstall reuses its activation slot
/// instead of burning a new one.
///
/// Generated locally and stored beside the database. It is not a fingerprint —
/// nothing about the hardware goes into it — and it leaves the machine only as
/// part of a licence activation the user themselves started.
#[tauri::command]
fn machine_id(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_config_dir().map_err(|e| format!("no config dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("machine-id");

    if let Ok(existing) = std::fs::read_to_string(&path) {
        let trimmed = existing.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(trimmed);
        }
    }

    let generated = uuid_v4();
    std::fs::write(&path, &generated).map_err(|e| e.to_string())?;
    Ok(generated)
}

/// A v4 UUID without pulling in a crate for sixteen random bytes.
fn uuid_v4() -> String {
    let mut bytes = [0u8; 16];
    fill_random(&mut bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex: Vec<String> = bytes.iter().map(|b| format!("{b:02x}")).collect();
    format!(
        "{}-{}-{}-{}-{}",
        hex[0..4].join(""),
        hex[4..6].join(""),
        hex[6..8].join(""),
        hex[8..10].join(""),
        hex[10..16].join("")
    )
}

fn fill_random(buf: &mut [u8]) {
    use std::time::{SystemTime, UNIX_EPOCH};
    // Seeded from the clock and the pid. Adequate for an identifier that only
    // has to be unique across one person's machines — it guards nothing.
    let seed =
        SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(0)
            ^ ((std::process::id() as u64) << 32);
    let mut state = seed | 1;
    for byte in buf.iter_mut() {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        *byte = (state >> 24) as u8;
    }
}

#[tauri::command]
fn platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppInfo {
    version: &'static str,
    platform: &'static str,
    machine_id: String,
    device_name: String,
}

#[tauri::command]
fn app_info(app: tauri::AppHandle) -> Result<AppInfo, String> {
    Ok(AppInfo {
        version: env!("CARGO_PKG_VERSION"),
        platform: platform(),
        machine_id: machine_id(app)?,
        device_name: device_name(),
    })
}

/// Shown in the customer's Dodo dashboard so they can tell machines apart.
fn device_name() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "This computer".into())
}

// ── store commands ──────────────────────────────────────────────────────────

fn now() -> i64 {
    license::now_millis()
}

#[tauri::command]
fn settings_get(store: tauri::State<'_, Store>, key: String) -> store::Result<Option<String>> {
    store::settings_get(&store, &key)
}

#[tauri::command]
fn settings_set(store: tauri::State<'_, Store>, key: String, value: String) -> store::Result<()> {
    store::settings_set(&store, &key, &value)
}

#[tauri::command]
fn settings_all(
    store: tauri::State<'_, Store>,
) -> store::Result<std::collections::HashMap<String, String>> {
    store::settings_all(&store)
}

#[tauri::command]
fn session_upsert(store: tauri::State<'_, Store>, input: SessionUpsert) -> store::Result<Session> {
    store::session_upsert(&store, input, now())
}

#[tauri::command]
fn sessions_list(
    store: tauri::State<'_, Store>,
    since: Option<i64>,
    limit: Option<i64>,
) -> store::Result<Vec<Session>> {
    store::sessions_list(&store, since, limit.unwrap_or(50))
}

#[tauri::command]
fn session_end(store: tauri::State<'_, Store>, id: String) -> store::Result<()> {
    store::session_end(&store, &id, now())
}

#[tauri::command]
fn session_cleanse(store: tauri::State<'_, Store>, id: String) -> store::Result<()> {
    store::session_cleanse(&store, &id, now())
}

#[tauri::command]
fn event_record(
    store: tauri::State<'_, Store>,
    kind: String,
    session_id: Option<String>,
    tokens: Option<i64>,
) -> store::Result<()> {
    store::event_record(&store, &kind, session_id.as_deref(), tokens, now())
}

#[tauri::command]
fn stats(store: tauri::State<'_, Store>) -> store::Result<Stats> {
    store::stats(&store)
}

#[tauri::command]
fn unlocks_list(store: tauri::State<'_, Store>) -> store::Result<Vec<String>> {
    store::unlocks_list(&store)
}

#[tauri::command]
fn unlock_grant(store: tauri::State<'_, Store>, id: String) -> store::Result<()> {
    store::unlock_grant(&store, &id, now())
}

// ── licence commands ────────────────────────────────────────────────────────

#[tauri::command]
fn license_get(store: tauri::State<'_, Store>) -> license::Result<license::LicenseState> {
    license::load(&store)
}

#[tauri::command]
async fn license_activate(
    app: tauri::AppHandle,
    store: tauri::State<'_, Store>,
    license_key: String,
) -> license::Result<license::LicenseState> {
    let machine = machine_id(app).map_err(license::LicenseError::Rejected)?;
    license::activate(&store, &license_key, &device_name(), &machine, platform()).await
}

#[tauri::command]
async fn license_validate(
    store: tauri::State<'_, Store>,
) -> license::Result<license::LicenseState> {
    license::validate(&store).await
}

#[tauri::command]
async fn license_deactivate(
    store: tauri::State<'_, Store>,
) -> license::Result<license::LicenseState> {
    license::deactivate(&store).await
}

// ── sources ─────────────────────────────────────────────────────────────────

/// Which readers are present, and where they are looking.
///
/// This doubles as the honest answer to "it is not working": the settings
/// screen lists every source and whether its directory exists, so nobody has to
/// guess why she is not watching anything.
#[tauri::command]
fn sources_status() -> Vec<SourceStatus> {
    SourceRunner::new().status()
}

/// Whether ContextJule is currently Claude Code's status line command.
#[tauri::command]
fn statusline_installed() -> bool {
    statusline::is_installed()
}

#[tauri::command]
fn statusline_install() -> Result<(), String> {
    statusline::install()
}

#[tauri::command]
fn statusline_uninstall() -> Result<(), String> {
    statusline::uninstall()
}

/// The `--statusline` process mode. See `statusline.rs`.
pub fn run_statusline() {
    statusline::run();
}

// ── window commands ─────────────────────────────────────────────────────────

#[tauri::command]
fn surface_show(app: tauri::AppHandle, label: String) -> tauri::Result<()> {
    windows::show(&app, &label)
}

#[tauri::command]
fn surface_hide(app: tauri::AppHandle, label: String) -> tauri::Result<()> {
    windows::hide(&app, &label)
}

#[tauri::command]
fn surface_toggle(app: tauri::AppHandle, label: String) -> tauri::Result<bool> {
    windows::toggle(&app, &label)
}

#[tauri::command]
fn surface_click_through(app: tauri::AppHandle, label: String, ignore: bool) -> tauri::Result<()> {
    windows::set_click_through(&app, &label, ignore)
}

/// Where the cursor is, in physical screen coordinates.
///
/// Only used by the overlay's cursor-follow, which is off by default. It is a
/// position and nothing else — no window titles, no contents, and it is never
/// written down or sent anywhere.
#[tauri::command]
fn cursor_position(app: tauri::AppHandle) -> Result<(f64, f64), String> {
    app.cursor_position().map(|p| (p.x, p.y)).map_err(|e| e.to_string())
}

/// Where a window currently sits, so the overlay can work out which way she is
/// facing relative to the cursor.
#[tauri::command]
fn surface_position(app: tauri::AppHandle, label: String) -> Result<(i32, i32, u32, u32), String> {
    let window = windows::get(&app, &label).ok_or_else(|| "no such window".to_string())?;
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.outer_size().map_err(|e| e.to_string())?;
    Ok((position.x, position.y, size.width, size.height))
}

/// Tell the tray which load state to wear, and let every window know so the
/// mini bar and the overlay stay in step without polling each other.
#[tauri::command]
fn set_load_state(app: tauri::AppHandle, state: String) -> tauri::Result<()> {
    tray::set_state(&app, &state)?;
    let _ = app.emit("load-state", state);
    Ok(())
}

/// She went down. The caller owns the edge detection, because only the frontend
/// knows what the previous load state was.
#[tauri::command]
fn session_collapse(store: tauri::State<'_, Store>, id: String, tokens: i64) -> store::Result<()> {
    store::session_collapse(&store, &id, tokens, now())
}

#[tauri::command]
fn sessions_close_stale(store: tauri::State<'_, Store>, idle_for_ms: i64) -> store::Result<usize> {
    store::end_stale_sessions(&store, idle_for_ms, now())
}

#[tauri::command]
fn surface_visible(app: tauri::AppHandle, label: String) -> bool {
    windows::is_visible(&app, &label)
}

/// Show or hide a surface and remember the choice for next launch.
#[tauri::command]
fn surface_set_visible(
    app: tauri::AppHandle,
    store: tauri::State<'_, Store>,
    label: String,
    visible: bool,
) -> tauri::Result<()> {
    if visible {
        windows::show(&app, &label)?;
    } else {
        windows::hide(&app, &label)?;
    }
    windows::remember_visible(&store, &label, visible);
    Ok(())
}

/// Park a window against the nearest screen edge.
#[tauri::command]
fn surface_snap(app: tauri::AppHandle, label: String, threshold: i32) -> tauri::Result<()> {
    if let Some(window) = windows::get(&app, &label) {
        windows::snap_to_edge(&window, threshold)?;
    }
    Ok(())
}

/// Start with the machine.
///
/// Read through the plugin rather than mirrored into our settings table: the
/// operating system is the source of truth here, and a user who turns it off in
/// their own login items should see that reflected.
#[tauri::command]
fn autostart_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn autostart_set(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let manager = app.autolaunch();
    if enabled {
        manager.enable().map_err(|e| e.to_string())
    } else {
        manager.disable().map_err(|e| e.to_string())
    }
}

// ── context readers ─────────────────────────────────────────────

/// How often the transcript readers look for new bytes.
///
/// Short enough that the meter moves while a reply is still streaming, long
/// enough that one directory walk per tick costs nothing anyone can feel.
const POLL_INTERVAL: std::time::Duration = std::time::Duration::from_secs(2);

/// Start the transcript readers and write what they find into the store.
///
/// Until this existed, `sources/` compiled and was never run: the only thing
/// that ever wrote a reading was `statusline.rs`, so with the status line
/// uninstalled she watched nothing at all. Old sessions still showed on the
/// growth screen, because those rows were already in the database — which is
/// exactly the shape of bug that looks like it is working.
///
/// Two threads on purpose. The reader does blocking file I/O and never touches
/// SQLite; this one owns every write and every event, so a poll in which five
/// sessions moved wakes the windows once, not five times.
fn spawn_source_readers(handle: tauri::AppHandle) {
    let (tx, rx) = mpsc::channel::<Reading>();

    std::thread::spawn(move || SourceRunner::new().run(tx, POLL_INTERVAL));

    std::thread::spawn(move || {
        // Block for the first reading, then take the rest of that poll's batch.
        while let Ok(first) = rx.recv() {
            let mut batch = vec![first];
            batch.extend(rx.try_iter());

            let Some(store) = handle.try_state::<Store>() else {
                continue;
            };

            let mut wrote = false;
            for reading in batch {
                // The key is already source-prefixed, and the status line writes
                // the same key for the same conversation — so the two paths
                // converge on one row instead of racing for two.
                let upsert = SessionUpsert {
                    id: reading.session_key,
                    source: reading.source.to_string(),
                    title: reading.title,
                    model: reading.model,
                    window_size: Some(reading.window_size),
                    tokens: reading.tokens,
                };
                // One bad row must not stop the others or kill the thread.
                if store::session_upsert(&store, upsert, now()).is_ok() {
                    wrote = true;
                }
            }

            if wrote {
                let _ = handle.emit("session-updated", ());
            }
        }
    });
}

// ── entry point ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        // MacosLauncher is ignored off macOS. No extra args: the app decides
        // for itself whether to show a window on a login start.
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            app_info,
            machine_id,
            platform,
            settings_get,
            settings_set,
            settings_all,
            session_upsert,
            sessions_list,
            session_end,
            session_cleanse,
            session_collapse,
            sessions_close_stale,
            event_record,
            stats,
            unlocks_list,
            unlock_grant,
            license_get,
            license_activate,
            license_validate,
            license_deactivate,
            surface_show,
            surface_hide,
            surface_toggle,
            surface_click_through,
            surface_position,
            surface_visible,
            surface_set_visible,
            surface_snap,
            cursor_position,
            set_load_state,
            autostart_enabled,
            autostart_set,
            sources_status,
            statusline_installed,
            statusline_install,
            statusline_uninstall,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            let db_path = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("no data dir: {e}"))?
                .join("contextjule.db");
            let store = Store::open(&db_path)?;
            windows::restore_positions(&handle, &store);
            app.manage(store);

            tray::build(&handle)?;

            // Reopen whatever was open last time, then start the janitor that
            // closes sessions nothing has written to. Without it `ended_at`
            // stays null forever and "time together" counts every abandoned
            // session as still running.
            if let Some(store) = handle.try_state::<Store>() {
                windows::restore_visibility(&handle, &store);
            }

            // The transcript readers, which need the store managed above.
            spawn_source_readers(handle.clone());

            let janitor = handle.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(std::time::Duration::from_secs(60));
                if let Some(store) = janitor.try_state::<Store>() {
                    // Thirty minutes with no new tokens means the session is over.
                    let _ = store::end_stale_sessions(&store, 30 * 60 * 1000, now());
                }
            });

            // The overlay is a transparent rectangle much larger than she is.
            // It starts click-through so it never eats a click meant for the
            // desktop; the frontend releases it while the cursor is over her.
            let _ = windows::set_click_through(&handle, windows::OVERLAY, true);

            Ok(())
        })
        .on_window_event(|window, event| match event {
            // Closing the main window hides it into the tray rather than
            // quitting. Every other surface is genuinely dismissible.
            WindowEvent::CloseRequested { api, .. } if window.label() == windows::MAIN => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::CloseRequested { api, .. } if window.label() != windows::MAIN => {
                // Dismissing a compact surface is a preference, not a crash.
                api.prevent_close();
                let _ = window.hide();
                if let Some(store) = window.app_handle().try_state::<Store>() {
                    windows::remember_visible(&store, window.label(), false);
                }
            }
            WindowEvent::Moved(position) => {
                if let Some(store) = window.app_handle().try_state::<Store>() {
                    windows::remember_position(&store, window.label(), position.x, position.y);
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
