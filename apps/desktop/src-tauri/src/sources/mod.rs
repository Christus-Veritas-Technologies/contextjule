//! Where the number comes from.
//!
//! One trait, several readers, one `Reading`. Everything above this layer — the
//! store, the behaviour engine, all five surfaces — already speaks `Reading`,
//! so adding a source changes nothing outside this directory.
//!
//! Two ways in, deliberately:
//!
//!   * The **status line** (`statusline.rs`) is Claude Code's own supported
//!     integration point. It hands us `context_window.total_input_tokens`,
//!     which its docs define as "tokens currently in the context window", plus
//!     `context_window_size`. Nothing is inferred and nothing is parsed that we
//!     were not meant to parse. It needs one click to install.
//!
//!   * The **transcript readers** here tail the JSONL files those tools write
//!     anyway. No setup at all, and they can see history, not just the live
//!     turn — but Claude Code's docs say plainly that "the entry format is
//!     internal to Claude Code and changes between versions", so this path is
//!     written to degrade rather than break: unknown lines are skipped, a
//!     missing field is a skipped reading, and nothing here can panic.
//!
//! They coexist. The transcripts give value from first launch and fill in the
//! sessions screen; the status line, once installed, reports the same sessions
//! with higher confidence and wins.

// Wired in as of `spawn_source_readers` in lib.rs: a reader thread polls every
// source and a writer thread folds each `Reading` into the same `session_upsert`
// the status line uses, then emits `session-updated` for the five windows.
//
// Before that, this module compiled, `status()` was called, and `poll_all` never
// was — so with the status line uninstalled nothing was ever read, while the
// growth screen kept showing rows already in the database.

use std::path::PathBuf;
use std::sync::mpsc::Sender;

use serde::Serialize;

pub mod claude_code;
pub mod codex;
pub mod tail;

/// One observation of a session.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Reading {
    /// Stable per conversation, prefixed by source so two cannot collide.
    pub session_key: String,
    pub source: &'static str,
    pub title: Option<String>,
    pub model: Option<String>,
    pub window_size: i64,
    /// Occupancy — what is in the window right now, not lifetime spend.
    pub tokens: i64,
    /// Epoch millis of the observation.
    pub at: i64,
    /// Higher wins when two sources describe the same session.
    pub confidence: u8,
}

/// Parsed out of a format its owners call internal.
pub const CONFIDENCE_TRANSCRIPT: u8 = 60;
/// Handed to us by the tool itself, through an interface meant for this.
///
/// No caller yet: the status line writes the same row under the same key rather
/// than competing for it, so nothing has to compare the two today. It stays
/// because the moment a source disagrees with another, something will.
#[allow(dead_code)]
pub const CONFIDENCE_EXACT: u8 = 100;

pub trait ContextSource: Send {
    fn id(&self) -> &'static str;
    fn label(&self) -> &'static str;
    fn root(&self) -> Option<PathBuf>;
    fn available(&self) -> bool {
        self.root().is_some_and(|path| path.exists())
    }
    /// Read everything new since the last call. Must be cheap when idle.
    fn poll(&mut self) -> Vec<Reading>;
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceStatus {
    pub id: &'static str,
    pub label: &'static str,
    pub available: bool,
    pub root: Option<String>,
    pub last_reading_at: Option<i64>,
}

pub fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .filter(|path| !path.as_os_str().is_empty())
}

/// `~/.claude` unless `CLAUDE_CONFIG_DIR` moves it, which the docs allow.
pub fn claude_config_dir() -> Option<PathBuf> {
    if let Some(custom) = std::env::var_os("CLAUDE_CONFIG_DIR") {
        let path = PathBuf::from(custom);
        if !path.as_os_str().is_empty() {
            return Some(path);
        }
    }
    home_dir().map(|home| home.join(".claude"))
}

/// Where the app keeps its own data, computed without a Tauri handle.
///
/// The status line runs as a bare process with no app to ask, so this has to
/// match what Tauri's `app_data_dir()` resolves to for our identifier. If that
/// identifier ever changes in `tauri.conf.json`, change it here too — the
/// status line would otherwise write to a database nothing reads.
pub fn app_data_dir() -> Option<PathBuf> {
    const IDENTIFIER: &str = "com.contextjule.app";
    if cfg!(target_os = "windows") {
        std::env::var_os("APPDATA").map(|base| PathBuf::from(base).join(IDENTIFIER))
    } else if cfg!(target_os = "macos") {
        home_dir().map(|home| home.join("Library/Application Support").join(IDENTIFIER))
    } else {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| home_dir().map(|home| home.join(".local/share")))
            .map(|base| base.join(IDENTIFIER))
    }
}

/// Context window sizes we know.
///
/// Only the transcript readers need this — the status line reports
/// `context_window_size` directly, which is one of the better reasons to
/// install it.
pub fn window_size_for(model: Option<&str>) -> i64 {
    let Some(model) = model.map(str::to_ascii_lowercase) else {
        return 200_000;
    };
    if model.contains("gemini") {
        1_000_000
    } else if model.contains("gpt-5") {
        400_000
    } else if model.contains("gpt-4o") {
        128_000
    } else {
        200_000
    }
}

pub fn now_millis() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

/// Drives every source on one thread and forwards what they find.
pub struct SourceRunner {
    sources: Vec<Box<dyn ContextSource>>,
}

impl SourceRunner {
    pub fn new() -> Self {
        Self {
            sources: vec![
                Box::new(claude_code::ClaudeCodeSource::new()),
                Box::new(codex::CodexSource::new()),
            ],
        }
    }

    pub fn status(&self) -> Vec<SourceStatus> {
        self.sources
            .iter()
            .map(|source| SourceStatus {
                id: source.id(),
                label: source.label(),
                available: source.available(),
                root: source.root().map(|path| path.display().to_string()),
                last_reading_at: None,
            })
            .collect()
    }

    /// Poll every source once. A failure in one must not silence the others.
    pub fn poll_all(&mut self) -> Vec<Reading> {
        let mut readings = Vec::new();
        for source in self.sources.iter_mut() {
            if !source.available() {
                continue;
            }
            readings.extend(source.poll());
        }
        readings
    }

    /// Run on its own thread until the receiver goes away.
    ///
    /// Polling rather than filesystem notifications, on purpose. These files
    /// are appended to several times a second while a response streams, so a
    /// debounced watcher ends up on a timer anyway — this way there is one
    /// code path, no platform-specific backend, and no dependency.
    pub fn run(mut self, tx: Sender<Reading>, interval: std::time::Duration) {
        loop {
            for reading in self.poll_all() {
                if tx.send(reading).is_err() {
                    return;
                }
            }
            std::thread::sleep(interval);
        }
    }
}

impl Default for SourceRunner {
    fn default() -> Self {
        Self::new()
    }
}
