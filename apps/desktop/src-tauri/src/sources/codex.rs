//! Codex session rollouts.
//!
//! `~/.codex/sessions/`, with events carrying a `token_count` whose totals are
//! **cumulative for the session**. That distinction is the whole of this file:
//! the running total is lifetime spend, not window occupancy. What we want is
//! the size of the most recent request, which is the difference between the
//! last two cumulative readings.
//!
//! Less certain than the Claude Code reader — the shape here is described in
//! community write-ups rather than documentation — so it is conservative:
//! anything that does not look like a strictly increasing counter is ignored,
//! and a negative delta resets the baseline instead of reporting nonsense.

use std::collections::HashMap;
use std::path::PathBuf;

use serde_json::Value;

use super::tail::{find_files, modified_millis, Tailer};
use super::{now_millis, window_size_for, ContextSource, Reading, CONFIDENCE_TRANSCRIPT};

const ACTIVE_WINDOW_MS: i64 = 6 * 60 * 60 * 1_000;

pub struct CodexSource {
    tailer: Tailer,
    latest: HashMap<String, Reading>,
    /// Last cumulative input total seen per session, for the delta.
    cumulative: HashMap<String, i64>,
    primed: bool,
}

impl CodexSource {
    pub fn new() -> Self {
        Self {
            tailer: Tailer::default(),
            latest: HashMap::new(),
            cumulative: HashMap::new(),
            primed: false,
        }
    }
}

impl Default for CodexSource {
    fn default() -> Self {
        Self::new()
    }
}

impl ContextSource for CodexSource {
    fn id(&self) -> &'static str {
        "codex"
    }

    fn label(&self) -> &'static str {
        "Codex"
    }

    fn root(&self) -> Option<PathBuf> {
        super::home_dir().map(|home| home.join(".codex").join("sessions"))
    }

    fn poll(&mut self) -> Vec<Reading> {
        let Some(root) = self.root() else {
            return Vec::new();
        };

        let now = now_millis();
        let mut readings = Vec::new();

        for path in find_files(&root, "jsonl", 3) {
            let modified = modified_millis(&path);
            if !self.primed && now - modified > ACTIVE_WINDOW_MS {
                self.tailer.skip_to_end(&path);
                continue;
            }
            if self.primed && self.tailer.seen(&path) && now - modified > ACTIVE_WINDOW_MS {
                continue;
            }

            let Some(session_id) = path.file_stem().and_then(|s| s.to_str()) else {
                continue;
            };

            let mut state = self.latest.get(session_id).cloned().unwrap_or(Reading {
                session_key: format!("codex:{session_id}"),
                source: "codex",
                title: None,
                model: None,
                window_size: 400_000,
                tokens: 0,
                at: modified,
                confidence: CONFIDENCE_TRANSCRIPT,
            });

            let mut changed = false;

            for line in self.tailer.read_new(&path) {
                let Ok(entry) = serde_json::from_str::<Value>(&line) else {
                    continue;
                };

                if state.model.is_none() {
                    if let Some(model) = find_str(&entry, "model") {
                        state.window_size = window_size_for(Some(&model));
                        state.model = Some(model);
                    }
                }
                if state.title.is_none() {
                    if let Some(cwd) = find_str(&entry, "cwd") {
                        state.title = Some(
                            cwd.rsplit(['/', '\\'])
                                .find(|segment| !segment.is_empty())
                                .unwrap_or(&cwd)
                                .to_string(),
                        );
                    }
                }

                let Some(counts) = find_object(&entry, "token_count") else {
                    continue;
                };

                let field = |name: &str| counts.get(name).and_then(Value::as_i64).unwrap_or(0);
                let total = field("input_tokens") + field("cached_input_tokens");
                if total <= 0 {
                    continue;
                }

                let previous = self.cumulative.insert(session_id.to_string(), total);
                match previous {
                    // The delta between two cumulative readings is the size of
                    // the request between them — which is the context.
                    Some(before) if total > before => {
                        state.tokens = total - before;
                        changed = true;
                    }
                    // First reading, or the counter went backwards because the
                    // session was cleared. Take it as the baseline and wait.
                    _ => {}
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

/// Pull a string field from anywhere in a shallow event, since the rollout
/// format nests differently across versions.
fn find_str(value: &Value, key: &str) -> Option<String> {
    if let Some(found) = value.get(key).and_then(Value::as_str) {
        return Some(found.to_string());
    }
    value
        .as_object()?
        .values()
        .filter_map(Value::as_object)
        .find_map(|nested| nested.get(key).and_then(Value::as_str).map(str::to_string))
}

fn find_object<'a>(value: &'a Value, key: &str) -> Option<&'a serde_json::Map<String, Value>> {
    if let Some(found) = value.get(key).and_then(Value::as_object) {
        return Some(found);
    }
    value
        .as_object()?
        .values()
        .filter_map(Value::as_object)
        .find_map(|nested| nested.get(key).and_then(Value::as_object))
}
