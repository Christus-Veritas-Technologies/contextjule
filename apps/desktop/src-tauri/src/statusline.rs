//! Claude Code's status line, used as a supported data feed.
//!
//! Claude Code runs a configured command on every render and passes it the
//! session as JSON on stdin. That payload contains exactly what this product
//! is about:
//!
//!     context_window.total_input_tokens   "tokens currently in the context window"
//!     context_window.context_window_size  the window, so nothing is inferred
//!     model.display_name, session_id, session_name, cwd, cost, …
//!
//! So ContextJule registers *itself* as that command, in a mode that writes the
//! reading straight to the local database and prints a status line back. The
//! user gets a Jule-coloured context bar in their terminal, the app gets exact
//! numbers, and no internal file format is being parsed to do it.
//!
//! Two things this mode must respect, because it runs on every keystroke-ish
//! render: be fast, and never print a stack trace into someone's terminal. It
//! opens the database, writes one row, prints one line, exits. Any failure
//! degrades to printing the bar without recording it.

use std::io::Read;
use std::path::PathBuf;

use serde_json::Value;

use crate::sources::{app_data_dir, claude_config_dir, now_millis};
use crate::store::{self, SessionUpsert, Store};

/// Where we stash the command we displaced, so uninstall can put it back.
const PREVIOUS_KEY: &str = "statusline.previous";

pub fn settings_path() -> Option<PathBuf> {
    claude_config_dir().map(|dir| dir.join("settings.json"))
}

fn read_settings(path: &PathBuf) -> Value {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .unwrap_or_else(|| Value::Object(serde_json::Map::new()))
}

/// Is our command currently the configured status line?
pub fn is_installed() -> bool {
    let Some(path) = settings_path() else { return false };
    let settings = read_settings(&path);
    settings
        .get("statusLine")
        .and_then(|line| line.get("command"))
        .and_then(Value::as_str)
        .is_some_and(|command| command.contains("--statusline"))
}

/// Point Claude Code's status line at this executable.
///
/// If something is already configured we keep it rather than trampling it: the
/// displaced command is recorded, invoked on every render, and its output is
/// printed before ours. Nobody loses a status line they built.
pub fn install() -> Result<(), String> {
    let path = settings_path().ok_or("could not locate the Claude Code settings file")?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let mut settings = read_settings(&path);
    let object = settings.as_object_mut().ok_or("settings.json is not an object")?;

    let existing = object
        .get("statusLine")
        .and_then(|line| line.get("command"))
        .and_then(Value::as_str)
        .map(str::to_string)
        .filter(|command| !command.contains("--statusline"));

    if let Some(previous) = existing {
        object.insert(PREVIOUS_KEY.into(), Value::String(previous));
    }

    object.insert(
        "statusLine".into(),
        serde_json::json!({
            "type": "command",
            "command": format!("\"{}\" --statusline", exe.display()),
            "padding": 0
        }),
    );

    write_settings(&path, &settings)
}

/// Put back whatever was there before, or remove ours entirely.
pub fn uninstall() -> Result<(), String> {
    let path = settings_path().ok_or("could not locate the Claude Code settings file")?;
    let mut settings = read_settings(&path);
    let Some(object) = settings.as_object_mut() else {
        return Ok(());
    };

    match object.remove(PREVIOUS_KEY).and_then(|v| v.as_str().map(str::to_string)) {
        Some(previous) => {
            object.insert(
                "statusLine".into(),
                serde_json::json!({ "type": "command", "command": previous, "padding": 0 }),
            );
        }
        None => {
            object.remove("statusLine");
        }
    }

    write_settings(&path, &settings)
}

fn write_settings(path: &PathBuf, settings: &Value) -> Result<(), String> {
    let body = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    // Write beside it and rename, so a crash mid-write cannot leave someone
    // with a settings file Claude Code refuses to parse.
    let temporary = path.with_extension("json.contextjule-tmp");
    std::fs::write(&temporary, body).map_err(|e| e.to_string())?;
    std::fs::rename(&temporary, path).map_err(|e| e.to_string())
}

/// The `--statusline` entry point. Reads stdin, records, prints, exits.
pub fn run() {
    let mut raw = String::new();
    if std::io::stdin().read_to_string(&mut raw).is_err() {
        return;
    }
    let Ok(payload) = serde_json::from_str::<Value>(&raw) else {
        return;
    };

    // Whatever we displaced still gets to render, first.
    if let Some(previous) = displaced_command() {
        if let Some(output) = run_previous(&previous, &raw) {
            let trimmed = output.trim_end();
            if !trimmed.is_empty() {
                println!("{trimmed}");
            }
        }
    }

    let reading = extract(&payload);
    if let Some(reading) = reading.as_ref() {
        record(reading);
    }

    println!("{}", render(reading.as_ref(), &payload));
}

fn displaced_command() -> Option<String> {
    let path = settings_path()?;
    read_settings(&path)
        .get(PREVIOUS_KEY)
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn run_previous(command: &str, stdin_payload: &str) -> Option<String> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let mut child = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", command])
    } else {
        Command::new("sh").args(["-c", command])
    }
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .spawn()
    .ok()?;

    if let Some(stdin) = child.stdin.as_mut() {
        let _ = stdin.write_all(stdin_payload.as_bytes());
    }
    let output = child.wait_with_output().ok()?;
    String::from_utf8(output.stdout).ok()
}

pub struct StatusReading {
    pub session_id: String,
    pub title: Option<String>,
    pub model: Option<String>,
    pub tokens: i64,
    pub window_size: i64,
}

fn extract(payload: &Value) -> Option<StatusReading> {
    let session_id = payload.get("session_id").and_then(Value::as_str)?.to_string();
    let context = payload.get("context_window")?;

    // Null before the first API call, and again after /compact until the next
    // one. Not an error — just nothing to say yet.
    let tokens = context.get("total_input_tokens").and_then(Value::as_i64)?;
    let window_size = context
        .get("context_window_size")
        .and_then(Value::as_i64)
        .unwrap_or(200_000);

    let title = payload
        .get("session_name")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| {
            payload
                .get("workspace")
                .and_then(|w| w.get("project_dir"))
                .or_else(|| payload.get("cwd"))
                .and_then(Value::as_str)
                .map(|cwd| {
                    cwd.rsplit(['/', '\\'])
                        .find(|segment| !segment.is_empty())
                        .unwrap_or(cwd)
                        .to_string()
                })
        });

    let model = payload
        .get("model")
        .and_then(|m| m.get("display_name").or_else(|| m.get("id")))
        .and_then(Value::as_str)
        .map(str::to_string);

    Some(StatusReading { session_id, title, model, tokens, window_size })
}

/// Write straight into the same SQLite file the app reads.
///
/// WAL is on, so this short write from a second process does not block the app,
/// and the app sees it on its next poll without any IPC between us.
fn record(reading: &StatusReading) {
    let Some(path) = app_data_dir().map(|dir| dir.join("contextjule.db")) else {
        return;
    };
    let Ok(store) = Store::open(&path) else { return };

    let _ = store::session_upsert(
        &store,
        SessionUpsert {
            id: format!("claude-code:{}", reading.session_id),
            source: "claude-code".into(),
            title: reading.title.clone(),
            model: reading.model.clone(),
            window_size: Some(reading.window_size),
            tokens: reading.tokens,
        },
        now_millis(),
    );
}

/// The bar itself: her state, a fourteen-cell meter, and the count.
fn render(reading: Option<&StatusReading>, payload: &Value) -> String {
    let Some(reading) = reading else {
        return "\u{1b}[38;5;245mjule · waiting\u{1b}[0m".to_string();
    };

    let used = if reading.window_size > 0 {
        (reading.tokens as f64 / reading.window_size as f64).clamp(0.0, 1.0)
    } else {
        0.0
    };

    // The same four states and thresholds as the app, so the terminal and the
    // desktop never disagree about how she is doing.
    let (label, colour) = match reading.tokens {
        t if t >= 128_000 => ("crashed", 203),
        t if t >= 32_000 => ("heavy", 215),
        t if t >= 5_000 => ("loaded", 221),
        _ => ("fresh", 114),
    };

    const CELLS: usize = 14;
    let filled = if reading.tokens > 0 {
        ((used * CELLS as f64).round() as usize).max(1).min(CELLS)
    } else {
        0
    };
    let meter: String = (0..CELLS)
        .map(|index| if index < filled { '█' } else { '░' })
        .collect();

    let model = reading.model.as_deref().unwrap_or("");
    let branch = payload
        .get("workspace")
        .and_then(|w| w.get("git_branch"))
        .and_then(Value::as_str)
        .map(|b| format!("  \u{1b}[38;5;245m{b}\u{1b}[0m"))
        .unwrap_or_default();

    format!(
        "\u{1b}[38;5;{colour}m{meter}\u{1b}[0m  \u{1b}[38;5;{colour}m{label}\u{1b}[0m  \
         \u{1b}[38;5;250m{}k/{}k\u{1b}[0m  \u{1b}[38;5;245m{model}\u{1b}[0m{branch}",
        reading.tokens / 1000,
        reading.window_size / 1000,
    )
}
