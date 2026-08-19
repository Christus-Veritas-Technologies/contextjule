//! Reading only the new bytes of an append-only file.
//!
//! Both transcript formats are JSONL that is appended to and never rewritten,
//! so re-reading a megabyte every two seconds would be wasteful and pointless.
//! This keeps a byte offset per file and hands back only what arrived since.
//!
//! Truncation is the one case worth handling: if a file is shorter than the
//! offset we hold, something replaced it, so we start again from the top.

use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::{Path, PathBuf};

#[derive(Default)]
pub struct Tailer {
    offsets: HashMap<PathBuf, u64>,
}

impl Tailer {
    /// New complete lines since the last call. Partial trailing lines are left
    /// for next time — a half-written JSON object is not worth parsing.
    pub fn read_new(&mut self, path: &Path) -> Vec<String> {
        let Ok(metadata) = std::fs::metadata(path) else {
            return Vec::new();
        };
        let size = metadata.len();
        let offset = self.offsets.entry(path.to_path_buf()).or_insert(0);

        if size < *offset {
            *offset = 0;
        }
        if size == *offset {
            return Vec::new();
        }

        let Ok(mut file) = File::open(path) else {
            return Vec::new();
        };
        if file.seek(SeekFrom::Start(*offset)).is_err() {
            return Vec::new();
        }

        let mut reader = BufReader::new(&mut file);
        let mut lines = Vec::new();
        let mut consumed = *offset;
        let mut buffer = String::new();

        loop {
            buffer.clear();
            match reader.read_line(&mut buffer) {
                Ok(0) => break,
                Ok(bytes) => {
                    // No trailing newline means the writer is mid-append.
                    // Leave it where it is and pick it up next poll.
                    if !buffer.ends_with('\n') {
                        break;
                    }
                    consumed += bytes as u64;
                    let line = buffer.trim();
                    if !line.is_empty() {
                        lines.push(line.to_string());
                    }
                }
                Err(_) => break,
            }
        }

        *offset = consumed;
        lines
    }

    /// Treat a file as already read, so a first scan does not replay history.
    pub fn skip_to_end(&mut self, path: &Path) {
        if let Ok(metadata) = std::fs::metadata(path) {
            self.offsets.insert(path.to_path_buf(), metadata.len());
        }
    }

    pub fn seen(&self, path: &Path) -> bool {
        self.offsets.contains_key(path)
    }
}

/// Files under `root` matching an extension, at most `depth` levels down.
///
/// Hand-rolled rather than pulling in a walker: the trees here are two levels
/// deep and this keeps the dependency list honest.
pub fn find_files(root: &Path, extension: &str, depth: usize) -> Vec<PathBuf> {
    let mut found = Vec::new();
    walk(root, extension, depth, &mut found);
    found
}

fn walk(dir: &Path, extension: &str, depth: usize, out: &mut Vec<PathBuf>) {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if file_type.is_dir() {
            if depth > 0 {
                walk(&path, extension, depth - 1, out);
            }
        } else if path.extension().and_then(|e| e.to_str()) == Some(extension) {
            out.push(path);
        }
    }
}

/// Epoch millis a file was last written, or 0 if that cannot be read.
pub fn modified_millis(path: &Path) -> i64 {
    std::fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
