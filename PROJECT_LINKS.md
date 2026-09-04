# Project Links

This is the Cowork hub bridge card for ChordVerse (Zero-Hallucination Chord Progression Analyzer).

## Control Card

| Field | Value |
|---|---|
| Project ID | `PL-20260829-chordverse` |
| Project Name | ChordVerse (Zero-Hallucination Chord Progression Analyzer) |
| Canonical Hub | `/Users/vecsatfoxmailcom/Documents/Cowork/Antigravity Cowork/26.08.29 Chord Progression Analyzer/` |
| Code Root | `/Users/vecsatfoxmailcom/Documents/A-coding/2026-08-29 chordverse/` |
| GitHub Remote | `https://github.com/vecyang1/chordverse.git` |
| Live Dashboard | `https://chord.worldinspirelab.com` (local: `http://localhost:9482`) |
| License | GNU Affero General Public License v3.0 (AGPL-3.0-or-later) |
| Init Gate | `python3 -m compileall src` in the code root |
| Operation Gate | `./bin/chord-analyzer doctor` in the code root |
| QA Gate | `python3 -m unittest discover -s tests` and `node --test 'tests/functions/*.test.mjs'` in the code root |
| Release Gate | `node tests/e2e_production_test.mjs` (Playwright, hits the live URL) |
| Deploy Path | push to `main` → GitHub Actions `deploy.yml` → Cloudflare Pages project `chordverse` (account `a92a9e5dfa2272885a0c1ac9c12085db`); domains `chordverse-c33.pages.dev`, `chord.worldinspirelab.com`. Repo secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` set 2026-09-04 (before that the publish step was skipped on every run and all deploys were manual). Manual: `npx wrangler pages deploy src/static --project-name chordverse` from the code root; preview: add `--branch <name>`. |

## Ownership & Backlinks

- **Canonical Hub**: `/Users/vecsatfoxmailcom/Documents/Cowork/Antigravity Cowork/26.08.29 Chord Progression Analyzer/`
- **Code Root Backlink**: `/Users/vecsatfoxmailcom/Documents/A-coding/2026-08-29 chordverse/PROJECT_LINKS.md`
- **GitHub Repository**: `https://github.com/vecyang1/chordverse.git`
