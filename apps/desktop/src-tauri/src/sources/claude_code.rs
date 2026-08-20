//! Claude Code transcripts.
//!
//! `~/.claude/projects/<project>/<session-id>.jsonl`, where `<project>` is the
//! working directory with non-alphanumeric characters replaced by `-`, and
//! `CLAUDE_CONFIG_DIR` moves the root. Every assistant entry carries
//! `message.usage`.
//!
//! Occupancy is `input_tokens + cache_creation_input_tokens +
//! cache_read_input_tokens`. Output tokens are deliberately excluded: Claude
//! Code's own status line defines `total_input_tokens` as "tokens currently in
//! the context window" from exactly those three, and computes its percentage
//! from input alone. Matching that means our meter and its status bar agree,
//! which matters more than being marginally more literal.
//!
//! Claude Code's docs state the entry format is internal and changes between
//! versions. Everything below therefore skips what it does not recognise and
//! never fails the whole poll for one bad line.

use std::path::PathBuf;

use serde_json::Value;

use super::tail::{find_files, modified_millis, Tailer};
use super::{now_millis, window_size_for, ContextSource, Reading, CONFIDENCE_TRANSCRIPT};

/// Files untouched for longer than this are not worth reopening every poll.
const ACTIVE_WINDOW_MS: i64 = 6 * 60 * 60 * 1_000;

pub struct ClaudeCodeSource {
    tailer: Tailer,
    /// Latest state per session, so a poll with no new lines still reports.
    latest: std::collections::HashMap<String, Reading>,
    primed: bool,
}

impl ClaudeCodeSource {
    pub fn new() -> Self {
        Self { tailer: Tailer::default(), latest: std::collections::HashMap::new(), primed: false }
    }
}

impl Default for ClaudeCodeSource {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextSource for ClaudeCodeSource {
    fn id(&self) -> &'static str {
        "claude-code"
    }

    fn label(&self) -> &'static str {
        "Claude Code"
    }

    /// The first place that exists, for the settings card to name.
    ///
    /// `poll` reads every root, not just this one — see
    /// `claude_transcript_roots`. This is a label, not the source of truth.
    fn root(&self) -> Option<PathBuf> {
        super::claude_transcript_roots()
            .into_iter()
            .next()
            .or_else(|| super::claude_config_dir().map(|dir| dir.join("projects")))
    }

    /// Any root at all, rather than just the canonical one.
    fn available(&self) -> bool {
        !super::claude_transcript_roots().is_empty()
    }

    fn poll(&mut self) -> Vec<Reading> {
        let now = now_millis();
        let mut readings = Vec::new();

        // Every known root, not just the terminal's. A session id is unique
        // across them, and `latest` is keyed by it, so the same conversation
        // reached from two directories still resolves to one row.
        let roots = super::claude_transcript_roots();
        for path in roots.iter().flat_map(|root| find_files(root, "jsonl", 3)) {
            let modified = modified_millis(&path);

            // On the very first poll, read recent transcripts in full so the
            // sessions screen has history, and skip the rest. Without this the
            // app would look empty until the user's next turn.
            if !self.primed && now - modified > ACTIVE_WINDOW_MS {
                self.tailer.skip_to_end(&path);
                continue;
            }

            // Afterwards, a file nobody has touched cannot have anything new.
            if self.primed && self.tailer.seen(&path) && now - modified > ACTIVE_WINDOW_MS {
                continue;
            }

            let Some(session_id) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };

            let mut state =
                self.latest.get(session_id).cloned().unwrap_or_else(|| blank(session_id, modified));

            let mut changed = false;

            for line in self.tailer.read_new(&path) {
                let Ok(entry) = serde_json::from_str::<Value>(&line) else {
                    continue; // A line we cannot parse is a line we ignore.
                };
                if apply(&mut state, &entry) {
                    changed = true;
                }
            }

            if changed {
                state.at = now;
                self.latest.insert(session_id.to_string(), state.clone());
                readings.push(state);
            }
        }

        self.primed = true;
        readings
    }
}

fn blank(session_id: &str, at: i64) -> Reading {
    Reading {
        session_key: format!("claude-code:{session_id}"),
        source: "claude-code",
        title: None,
        model: None,
        window_size: 200_000,
        tokens: 0,
        at,
        confidence: CONFIDENCE_TRANSCRIPT,
    }
}

/// Fold one transcript entry into the session's state. Returns whether
/// anything worth reporting changed.
fn apply(state: &mut Reading, entry: &Value) -> bool {
    // A title can arrive on several entry shapes across versions. Take
    // whichever turns up and prefer a real name over a derived one.
    if state.title.is_none() {
        if let Some(name) = entry
            .get("sessionName")
            .and_then(Value::as_str)
            .or_else(|| entry.get("summary").and_then(Value::as_str))
        {
            state.title = Some(name.to_string());
        } else if let Some(cwd) = entry.get("cwd").and_then(Value::as_str) {
            state.title = Some(project_name(cwd));
        }
    }

    if entry.get("type").and_then(Value::as_str) != Some("assistant") {
        return false;
    }

    let Some(message) = entry.get("message") else {
        return false;
    };

    if let Some(model) = message.get("model").and_then(Value::as_str) {
        if state.model.as_deref() != Some(model) {
            state.model = Some(model.to_string());
            state.window_size = window_size_for(Some(model));
        }
    }

    let Some(usage) = message.get("usage") else {
        return false;
    };

    let field = |name: &str| usage.get(name).and_then(Value::as_i64).unwrap_or(0);
    let tokens = field("input_tokens")
        + field("cache_creation_input_tokens")
        + field("cache_read_input_tokens");

    // Zero means the entry had no usable usage block, not an empty window.
    if tokens <= 0 {
        return false;
    }

    state.tokens = tokens;
    true
}

/// The last path segment, which is what a person calls the project.
fn project_name(cwd: &str) -> String {
    cwd.rsplit(['/', '\\']).find(|segment| !segment.is_empty()).unwrap_or(cwd).to_string()
}
