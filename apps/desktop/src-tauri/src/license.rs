//! Licensing.
//!
//! What Dodo actually gives us, which shapes everything below:
//!
//!   POST /licenses/activate   public, no key. 201 returns the instance:
//!                             { id, business_id, name, license_key_id,
//!                               created_at, product{...}, customer{...} }.
//!                             403 = key inactive, 404 = unknown key,
//!                             422 = activation limit reached.
//!
//!   POST /licenses/validate   public, no key. Returns `{ "valid": bool }`.
//!                             That is the entire response body.
//!
//! So activate tells us *why* something failed and validate does not. That
//! asymmetry is the reason this talks to our own API first: the backend holds a
//! mirrored `LicenseKey` row fed by Dodo's webhooks, so it can answer with the
//! expiry, the activation count and a real reason, while still deferring to
//! Dodo's `valid` as the verdict. Dodo remains the authority; our API is the
//! part that can explain itself.
//!
//! If our API is unreachable the app falls back to Dodo directly and then to
//! the cached row, in that order. A paid customer on a plane keeps working.

use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use time::{format_description::well_known::Rfc3339, OffsetDateTime};

use crate::store::{Store, StoreError};

/// Baked in at build time so a release points at production without a config
/// file the user could break. Override for local work with
/// `CONTEXTJULE_API_URL=http://localhost:3000 pnpm dev`.
fn api_base() -> String {
    option_env!("CONTEXTJULE_API_URL")
        .unwrap_or("https://api.contextjule.com")
        .trim_end_matches('/')
        .to_string()
}

/// Dodo's public endpoints, used only when our own API cannot be reached.
fn dodo_base() -> String {
    option_env!("CONTEXTJULE_DODO_URL")
        .unwrap_or("https://live.dodopayments.com")
        .trim_end_matches('/')
        .to_string()
}

/// Seven days. Long enough to survive a flight and bad hotel wifi, short enough
/// that a refund takes effect within a working week. Mirrors OFFLINE_GRACE_MS
/// in @contextjule/core — keep the two in step.
const OFFLINE_GRACE_MS: i64 = 7 * 24 * 60 * 60 * 1_000;

#[derive(Debug, thiserror::Error)]
pub enum LicenseError {
    #[error("{0}")]
    Store(#[from] StoreError),
    #[error("network: {0}")]
    Network(String),
    #[error("{0}")]
    Rejected(String),
}

impl serde::Serialize for LicenseError {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, LicenseError>;

/// Mirrors `LicenseState` in @contextjule/core.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LicenseState {
    pub status: String,
    pub license_key: Option<String>,
    pub license_key_instance_id: Option<String>,
    pub email: Option<String>,
    pub activations_used: Option<i64>,
    pub activations_limit: Option<i64>,
    pub expires_at: Option<String>,
    pub last_validated_at: Option<String>,
}

impl LicenseState {
    fn unlicensed() -> Self {
        Self { status: "unlicensed".into(), ..Default::default() }
    }
}

// ── local cache ─────────────────────────────────────────────────────────────

pub fn load(store: &Store) -> Result<LicenseState> {
    let conn = store.0.lock().unwrap();
    let row = conn
        .query_row(
            "SELECT key, instance_id, status, email, activations_used, activations_limit,
                    expires_at, last_validated_at
             FROM license WHERE id = 1",
            [],
            |r| {
                Ok(LicenseState {
                    license_key: r.get(0)?,
                    license_key_instance_id: r.get(1)?,
                    status: r.get(2)?,
                    email: r.get(3)?,
                    activations_used: r.get(4)?,
                    activations_limit: r.get(5)?,
                    expires_at: r.get::<_, Option<i64>>(6)?.and_then(millis_to_rfc3339),
                    last_validated_at: r.get::<_, Option<i64>>(7)?.and_then(millis_to_rfc3339),
                })
            },
        )
        .optional()
        .map_err(StoreError::from)?;

    Ok(row.unwrap_or_else(LicenseState::unlicensed))
}

fn save(store: &Store, state: &LicenseState) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "UPDATE license SET key = ?1, instance_id = ?2, status = ?3, email = ?4,
                            activations_used = ?5, activations_limit = ?6,
                            expires_at = ?7, last_validated_at = ?8
         WHERE id = 1",
        params![
            state.license_key,
            state.license_key_instance_id,
            state.status,
            state.email,
            state.activations_used,
            state.activations_limit,
            state.expires_at.as_deref().and_then(rfc3339_to_millis),
            state.last_validated_at.as_deref().and_then(rfc3339_to_millis),
        ],
    )
    .map_err(StoreError::from)?;
    Ok(())
}

pub fn clear(store: &Store) -> Result<()> {
    let conn = store.0.lock().unwrap();
    conn.execute(
        "UPDATE license SET key = NULL, instance_id = NULL, status = 'unlicensed', email = NULL,
                            activations_used = NULL, activations_limit = NULL,
                            expires_at = NULL, last_validated_at = NULL
         WHERE id = 1",
        [],
    )
    .map_err(StoreError::from)?;
    Ok(())
}

// ── the network calls ───────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ActivateBody<'a> {
    license_key: &'a str,
    device_name: &'a str,
    machine_id: &'a str,
    platform: &'a str,
    app_version: &'a str,
}

fn client() -> reqwest::Client {
    reqwest::Client::builder()
        // A licence check must never be the reason the app feels frozen.
        .timeout(std::time::Duration::from_secs(12))
        .user_agent(concat!("ContextJule/", env!("CARGO_PKG_VERSION")))
        .build()
        .unwrap_or_default()
}

/// Activate a key on this machine.
///
/// Our API first, because it records the activation so support can free a slot
/// later. If it is unreachable we go straight to Dodo — the app must be usable
/// the moment someone pays, even if our own box is down.
pub async fn activate(
    store: &Store,
    license_key: &str,
    device_name: &str,
    machine_id: &str,
    platform: &str,
) -> Result<LicenseState> {
    let key = license_key.trim().to_uppercase();
    let body = ActivateBody {
        license_key: &key,
        device_name,
        machine_id,
        platform,
        app_version: env!("CARGO_PKG_VERSION"),
    };

    let via_api = client()
        .post(format!("{}/api/licenses/activate", api_base()))
        .json(&body)
        .send()
        .await;

    let state = match via_api {
        Ok(response) if response.status().is_success() => {
            let parsed: ApiActivateResponse =
                response.json().await.map_err(|e| LicenseError::Network(e.to_string()))?;
            LicenseState {
                status: "active".into(),
                license_key: Some(key.clone()),
                license_key_instance_id: Some(parsed.license_key_instance_id),
                email: parsed.email,
                activations_used: parsed.activations_used,
                activations_limit: parsed.activations_limit,
                expires_at: parsed.expires_at,
                last_validated_at: Some(now_rfc3339()),
            }
        }
        Ok(response) => {
            // Our API forwards Dodo's status, so the reason survives the hop.
            return Err(LicenseError::Rejected(reason_for(response.status().as_u16())));
        }
        Err(_) => activate_via_dodo(&key, device_name).await?,
    };

    save(store, &state)?;
    Ok(state)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiActivateResponse {
    license_key_instance_id: String,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    activations_used: Option<i64>,
    #[serde(default)]
    activations_limit: Option<i64>,
    #[serde(default)]
    expires_at: Option<String>,
}

#[derive(Deserialize)]
struct DodoActivateResponse {
    /// The license key instance id.
    id: String,
    #[serde(default)]
    customer: Option<DodoCustomer>,
}

#[derive(Deserialize)]
struct DodoCustomer {
    #[serde(default)]
    email: Option<String>,
}

async fn activate_via_dodo(key: &str, device_name: &str) -> Result<LicenseState> {
    let response = client()
        .post(format!("{}/licenses/activate", dodo_base()))
        .json(&serde_json::json!({ "license_key": key, "name": device_name }))
        .send()
        .await
        .map_err(|e| LicenseError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(LicenseError::Rejected(reason_for(response.status().as_u16())));
    }

    let parsed: DodoActivateResponse =
        response.json().await.map_err(|e| LicenseError::Network(e.to_string()))?;

    // Dodo's activate response carries no activation counts or expiry — only
    // the instance and the customer. That is all we can know on this path.
    Ok(LicenseState {
        status: "active".into(),
        license_key: Some(key.to_string()),
        license_key_instance_id: Some(parsed.id),
        email: parsed.customer.and_then(|c| c.email),
        activations_used: None,
        activations_limit: None,
        expires_at: None,
        last_validated_at: Some(now_rfc3339()),
    })
}

/// Dodo's own status codes, in the words the customer should read.
fn reason_for(status: u16) -> String {
    match status {
        403 => "This key is no longer active — a refund or chargeback, usually.".into(),
        404 => "That key was not recognised. Check it against your purchase email.".into(),
        422 => "Every activation on this key is in use. Free one up first.".into(),
        429 => "Too many attempts. Give it a minute.".into(),
        _ => "The licence server could not be reached. Try again shortly.".into(),
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiValidateResponse {
    valid: bool,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    activations_used: Option<i64>,
    #[serde(default)]
    activations_limit: Option<i64>,
    #[serde(default)]
    expires_at: Option<String>,
}

#[derive(Deserialize)]
struct DodoValidateResponse {
    valid: bool,
}

/// Re-check the cached licence.
///
/// Three tiers, and the app stays usable through all of them: our API (rich
/// answer), Dodo direct (`valid` only), then the cached row inside its grace
/// window. Only a definitive `valid: false` locks the app.
pub async fn validate(store: &Store) -> Result<LicenseState> {
    let mut state = load(store)?;
    let Some(key) = state.license_key.clone() else {
        return Ok(LicenseState::unlicensed());
    };

    let body = serde_json::json!({
        "licenseKey": key,
        "licenseKeyInstanceId": state.license_key_instance_id,
    });

    match client()
        .post(format!("{}/api/licenses/validate", api_base()))
        .json(&body)
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            if let Ok(parsed) = response.json::<ApiValidateResponse>().await {
                state.status = if parsed.valid {
                    "active".into()
                } else {
                    parsed.status.unwrap_or_else(|| "invalid".into())
                };
                if parsed.valid {
                    state.last_validated_at = Some(now_rfc3339());
                }
                state.email = parsed.email.or(state.email);
                state.activations_used = parsed.activations_used.or(state.activations_used);
                state.activations_limit = parsed.activations_limit.or(state.activations_limit);
                state.expires_at = parsed.expires_at.or(state.expires_at);
                save(store, &state)?;
                return Ok(state);
            }
        }
        _ => {}
    }

    // Our API is down or answered badly. Ask Dodo, which is the authority.
    let dodo = client()
        .post(format!("{}/licenses/validate", dodo_base()))
        .json(&serde_json::json!({
            "license_key": key,
            "license_key_instance_id": state.license_key_instance_id,
        }))
        .send()
        .await;

    if let Ok(response) = dodo {
        if response.status().is_success() {
            if let Ok(parsed) = response.json::<DodoValidateResponse>().await {
                state.status = if parsed.valid { "active".into() } else { "invalid".into() };
                if parsed.valid {
                    state.last_validated_at = Some(now_rfc3339());
                }
                save(store, &state)?;
                return Ok(state);
            }
        }
    }

    // Nothing answered. Fall back to the cache and let the grace window decide.
    state.status = if within_grace(&state) { "offline_grace".into() } else { "expired".into() };
    save(store, &state)?;
    Ok(state)
}

fn within_grace(state: &LicenseState) -> bool {
    let Some(last) = state.last_validated_at.as_deref().and_then(rfc3339_to_millis) else {
        return false;
    };
    now_millis() - last < OFFLINE_GRACE_MS
}

/// Release this machine's activation so the slot can be used elsewhere.
pub async fn deactivate(store: &Store) -> Result<LicenseState> {
    let state = load(store)?;
    if let (Some(key), Some(instance)) = (&state.license_key, &state.license_key_instance_id) {
        let body = serde_json::json!({
            "licenseKey": key,
            "licenseKeyInstanceId": instance,
        });
        // Best effort. If it fails the slot frees on our side anyway once the
        // customer asks support, and refusing to sign out locally would be worse.
        let _ = client()
            .post(format!("{}/api/licenses/deactivate", api_base()))
            .json(&body)
            .send()
            .await;
    }
    clear(store)?;
    Ok(LicenseState::unlicensed())
}

// ── time helpers ────────────────────────────────────────────────────────────

pub fn now_millis() -> i64 {
    (OffsetDateTime::now_utc().unix_timestamp_nanos() / 1_000_000) as i64
}

fn now_rfc3339() -> String {
    OffsetDateTime::now_utc().format(&Rfc3339).unwrap_or_default()
}

fn millis_to_rfc3339(millis: i64) -> Option<String> {
    OffsetDateTime::from_unix_timestamp_nanos(millis as i128 * 1_000_000)
        .ok()
        .and_then(|dt| dt.format(&Rfc3339).ok())
}

fn rfc3339_to_millis(value: &str) -> Option<i64> {
    OffsetDateTime::parse(value, &Rfc3339)
        .ok()
        .map(|dt| (dt.unix_timestamp_nanos() / 1_000_000) as i64)
}
