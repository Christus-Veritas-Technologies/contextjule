# Roadmap

Plan files by area. `[x]` carries the short SHA; unticked means **not honestly
verifiable**, not forgotten.

| Plan | Area | State |
|---|---|---|
| `01-foundation.md` | Monorepo, design system, tokens | done |
| `02-desktop-screens.md` | All screens from `designs/screens/` | done |
| `03-context-sources.md` | Transcripts, status line, Codex | done |
| `04-desktop-features.md` | Patrol, wardrobe, cosmetics, windows, tray | built, **never run on a host** |
| `05-backend.md` | Dodo, licensing, releases, email | running in production |
| `06-promotions.md` | Three-phase launch, live counter | running; needs the $0 product price |
| `07-site.md` | Landing, thanks, download | deployed; **not re-audited since the copy rewrite** |
| `08-distribution.md` | Installers, updater, R2 | **never run** |
| `09-analytics.md` | GA4 + events | deployed; no event observed yet |
| `10-consent.md` | Consent Mode v2 | not started |

## Done when — the ones that cannot yet be ticked

- `04` "works on Windows and macOS" — no macOS machine has ever run this.
- `08` "a release produces installers" — the pipeline has never executed.
- `09` "events arrive in GA4" — nothing has been observed in the property.

These stay unticked until someone can honestly tick them. That is the contract.
