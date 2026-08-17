//! The local database.
//!
//! Everything the app knows about the user's sessions lives here, on their
//! machine, in a single SQLite file inside the app's own data directory. SQLite
//! is compiled into the binary (`rusqlite/bundled`), so there is nothing to
//! install and nothing to find at runtime.
//!
//! SQL never crosses the IPC boundary. The webview calls typed commands and
//! gets typed rows back — which means the frontend cannot be tricked into
//! running a query, and the schema can change without touching TypeScript.

use std::sync::Mutex;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("database: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("{0}")]
    Other(String),
}

impl serde::Serialize for StoreError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, StoreError>;

/// Guarded by a mutex rather than a pool: this is one desktop app talking to a
/// local file, and contention is a handful of writes a minute at most.
pub struct Store(pub Mutex<Connection>);

/// Every migration ever applied, in order. Append only — never edit one that
/// has shipped, or an existing install will skip it and drift.
const MIGRATIONS: &[&str] = &[
    // 0001 — the initial schema.
    r#"
    CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id           TEXT PRIMARY KEY,
        source       TEXT NOT NULL,
        title        TEXT,
        model        TEXT,
        window_size  INTEGER NOT NULL DEFAULT 200000,
        started_at   INTEGER NOT NULL,
        ended_at     INTEGER,
        last_tokens  INTEGER NOT NULL DEFAULT 0,
        peak_tokens  INTEGER NOT NULL DEFAULT 0,
        cleanses     INTEGER NOT NULL DEFAULT 0,
        collapses    INTEGER NOT NULL DEFAULT 0,
        updated_at   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_started_at ON sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        at         INTEGER NOT NULL,
        kind       TEXT NOT NULL,
        session_id TEXT,
        tokens     INTEGER
    );
    CREATE INDEX IF NOT EXISTS events_at ON events(at DESC);

    CREATE TABLE IF NOT EXISTS unlocks (
        id          TEXT PRIMARY KEY,
        unlocked_at INTEGER NOT NULL
    );

    -- Singleton. The license the app is running under, cached so it keeps
    -- working with no network.
    CREATE TABLE IF NOT EXISTS license (
        id               INTEGER PRIMARY KEY CHECK (id = 1),
        key              TEXT,
        instance_id      TEXT,
        status           TEXT NOT NULL DEFAULT 'unlicensed',
        email            TEXT,
        activations_used INTEGER,
        activations_limit INTEGER,
        expires_at       INTEGER,
        last_validated_at INTEGER
    );
    INSERT OR IGNORE INTO license (id, status) VALUES (1, 'unlicensed');
    "#,
];

impl Store {
    pub fn open(path: &std::path::Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| StoreError::Other(e.to_string()))?;
        }
        let conn = Connection::open(path)?;

        // WAL keeps a read during a write from blocking the UI thread, and
        // survives an ungraceful shutdown — which a desktop pet will get.
        conn.pragma_update(None, "journal_mode", "WAL")?;
        conn.pragma_update(None, "foreign_keys", "ON")?;
        conn.pragma_update(None, "synchronous", "NORMAL")?;

        let store = Store(Mutex::new(conn));
        store.migrate()?;
        Ok(store)
    }

    fn migrate(&self) -> Result<()> {
        let conn = self.0.lock().unwrap();
        let applied: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
        for (index, sql) in MIGRATIONS.iter().enumerate() {
            let version = index as i64 + 1;
            if version <= applied {
                continue;
            }
            conn.execute_batch(sql)?;
            conn.pragma_update(None, "user_version", version)?;
        }
        Ok(())
    }
}

// ── settings ────────────────────────────────────────────────────────────────

pub fn settings_get(store: &Store, key: &str) -> Result<Option<String>> {
    let conn = store.0.lock().unwrap();
    Ok(conn
        .query_row("SELECT value FROM settings WHERE key = ?1", params![key], |r| r.get(0))
        .optional()?)
}

pub fn settings_set(store: &Store, key: &str, value: &str) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn settings_all(store: &Store) -> Result<std::collections::HashMap<String, String>> {
    let conn = store.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    let mut out = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row?;
        out.insert(k, v);
    }
    Ok(out)
}

// ── sessions ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub source: String,
    pub title: Option<String>,
    pub model: Option<String>,
    pub window_size: i64,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub last_tokens: i64,
    pub peak_tokens: i64,
    pub cleanses: i64,
    pub collapses: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUpsert {
    pub id: String,
    pub source: String,
    pub title: Option<String>,
    pub model: Option<String>,
    pub window_size: Option<i64>,
    pub tokens: i64,
}

/// Insert or update in one statement.
///
/// `peak_tokens` only ever climbs: a cleanse drops the live count to nothing,
/// and the growth screen is about what she carried, not where she ended up.
pub fn session_upsert(store: &Store, input: SessionUpsert, now: i64) -> Result<Session> {
    {
        let conn = store.0.lock().unwrap();
        conn.execute(
            "INSERT INTO sessions (id, source, title, model, window_size, started_at, last_tokens, peak_tokens, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7, ?6)
             ON CONFLICT(id) DO UPDATE SET
                title       = COALESCE(excluded.title, sessions.title),
                model       = COALESCE(excluded.model, sessions.model),
                window_size = excluded.window_size,
                last_tokens = excluded.last_tokens,
                peak_tokens = MAX(sessions.peak_tokens, excluded.last_tokens),
                updated_at  = ?8",
            params![
                input.id,
                input.source,
                input.title,
                input.model,
                input.window_size.unwrap_or(200_000),
                now,
                input.tokens,
                now
            ],
        )?;
    }
    session_get(store, &input.id)?.ok_or_else(|| StoreError::Other("session vanished".into()))
}

fn map_session(row: &rusqlite::Row<'_>) -> rusqlite::Result<Session> {
    Ok(Session {
        id: row.get(0)?,
        source: row.get(1)?,
        title: row.get(2)?,
        model: row.get(3)?,
        window_size: row.get(4)?,
        started_at: row.get(5)?,
        ended_at: row.get(6)?,
        last_tokens: row.get(7)?,
        peak_tokens: row.get(8)?,
        cleanses: row.get(9)?,
        collapses: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

const SESSION_COLUMNS: &str = "id, source, title, model, window_size, started_at, ended_at, \
                               last_tokens, peak_tokens, cleanses, collapses, updated_at";

pub fn session_get(store: &Store, id: &str) -> Result<Option<Session>> {
    let conn = store.0.lock().unwrap();
    let sql = format!("SELECT {SESSION_COLUMNS} FROM sessions WHERE id = ?1");
    Ok(conn.query_row(&sql, params![id], map_session).optional()?)
}

pub fn sessions_list(store: &Store, since: Option<i64>, limit: i64) -> Result<Vec<Session>> {
    let conn = store.0.lock().unwrap();
    let sql = format!(
        "SELECT {SESSION_COLUMNS} FROM sessions
         WHERE (?1 IS NULL OR started_at >= ?1)
         ORDER BY started_at DESC LIMIT ?2"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![since, limit], map_session)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn session_end(store: &Store, id: &str, now: i64) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute("UPDATE sessions SET ended_at = ?2, updated_at = ?2 WHERE id = ?1", params![id, now])?;
    Ok(())
}

/// A cleanse: her pack hits the floor and the live count restarts.
pub fn session_cleanse(store: &Store, id: &str, now: i64) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "UPDATE sessions SET cleanses = cleanses + 1, last_tokens = 0, updated_at = ?2 WHERE id = ?1",
        params![id, now],
    )?;
    conn.execute(
        "INSERT INTO events (at, kind, session_id, tokens) VALUES (?1, 'cleanse', ?2, 0)",
        params![now, id],
    )?;
    Ok(())
}

// ── events and stats ────────────────────────────────────────────────────────

pub fn event_record(store: &Store, kind: &str, session_id: Option<&str>, tokens: Option<i64>, now: i64) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "INSERT INTO events (at, kind, session_id, tokens) VALUES (?1, ?2, ?3, ?4)",
        params![now, kind, session_id, tokens],
    )?;
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub sessions: i64,
    /// Summed peaks, not summed last-readings — this is what she carried.
    pub tokens_carried: i64,
    pub cleanses: i64,
    pub collapses: i64,
    /// Total time across every session that has ended, in milliseconds.
    pub time_together_ms: i64,
}

pub fn stats(store: &Store) -> Result<Stats> {
    let conn = store.0.lock().unwrap();
    conn.query_row(
        "SELECT
            COUNT(*),
            COALESCE(SUM(peak_tokens), 0),
            COALESCE(SUM(cleanses), 0),
            COALESCE(SUM(collapses), 0),
            COALESCE(SUM(COALESCE(ended_at, updated_at) - started_at), 0)
         FROM sessions",
        [],
        |row| {
            Ok(Stats {
                sessions: row.get(0)?,
                tokens_carried: row.get(1)?,
                cleanses: row.get(2)?,
                collapses: row.get(3)?,
                time_together_ms: row.get(4)?,
            })
        },
    )
    .map_err(Into::into)
}

// ── unlocks ─────────────────────────────────────────────────────────────────

pub fn unlocks_list(store: &Store) -> Result<Vec<String>> {
    let conn = store.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT id FROM unlocks ORDER BY unlocked_at")?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

pub fn unlock_grant(store: &Store, id: &str, now: i64) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "INSERT OR IGNORE INTO unlocks (id, unlocked_at) VALUES (?1, ?2)",
        params![id, now],
    )?;
    Ok(())
}
