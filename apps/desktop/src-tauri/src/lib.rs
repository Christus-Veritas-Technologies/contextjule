// ContextJule's Tauri host.
//
// The rule this file exists to enforce: session text never leaves the machine.
// Nothing here uploads, and the only outbound request the app makes at all is
// license validation against Dodo's public endpoint, which sends a key and a
// machine name — never anything read from a session.

use tauri::Manager;

/// A stable per-machine identifier, used so a reinstall reuses its activation
/// slot instead of burning a new one. Derived locally; it is not a fingerprint
/// and is not sent anywhere except with a license activation the user started.
#[tauri::command]
fn machine_id(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("no config dir: {e}"))?;
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
    getrandom(&mut bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let h: Vec<String> = bytes.iter().map(|b| format!("{b:02x}")).collect();
    format!(
        "{}-{}-{}-{}-{}",
        h[0..4].join(""),
        h[4..6].join(""),
        h[6..8].join(""),
        h[8..10].join(""),
        h[10..16].join("")
    )
}

fn getrandom(buf: &mut [u8]) {
    use std::time::{SystemTime, UNIX_EPOCH};
    // Seeded from the clock and the process id. Adequate for an identifier that
    // only has to be unique across one person's machines.
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(0)
        ^ (std::process::id() as u64) << 32;
    let mut state = seed | 1;
    for byte in buf.iter_mut() {
        state ^= state << 13;
        state ^= state >> 7;
        state ^= state << 17;
        *byte = (state >> 24) as u8;
    }
}

/// Which platform the frontend is running on, for the license activation record.
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![machine_id, platform])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
