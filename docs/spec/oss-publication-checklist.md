# Open-Source Publication Checklist — prisma-ltree

**Status:** P0–P2 complete (file work landed on `chore/oss-readiness`); P3 are GitHub
Settings tasks pending the maintainer.
**Date:** 2026-06-23
**Owner:** `@slovakian`
**Goal:** Bring the `slovakian/prisma-ltree` monorepo to public-announcement readiness.
The package is already on GitHub and published to npm (`prisma-ltree@0.2.1`) but has not
been shared publicly. This checklist converts the pre-publication gap analysis into
actionable, verifiable items.

### Completion summary

- **P0 — done:** `LICENSE` (Apache-2.0) added; root `README.md` rewritten as the project
  landing page.
- **P1 — done:** `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, three issue
  templates + `config.yml`, and `PULL_REQUEST_TEMPLATE.md`.
- **P2 — done:** `.github/CODEOWNERS`, `.github/dependabot.yml`, global `.env*` gitignore
  rule, root `engines.node` → `>=24`, root `description`, README badges. `packages/utils/`
  needed no repo change (untracked/local-only — see P2.4).
- **Verified:** `pnpm run ready` green (build + check-pins + 123 tests) and repo-wide
  `vp check` green (140 files formatted, 0 lint/type errors) on `chore/oss-readiness`.
- **P3 — pending maintainer:** GitHub Settings tasks below (repo description/topics,
  Releases, enable Discussions, `good first issue` seeding, branch protection, optional
  funding). Not announcement blockers.

## Binding decisions

1. **License = Apache-2.0.** Already declared in `packages/extension-ltree/package.json`;
   the repo needs the actual license text at root.
2. **Node = `>=24` everywhere.** The publishable package and CI already require `>=24`;
   the root `package.json` lags at `>=22.12.0` and must be aligned.
3. **Community posture = inviting & transparent.** Contributor Covenant CoC, transparent
   CODEOWNERS (auto-routes review — does not change who can merge), GitHub Discussions,
   `good first issue` labels, welcoming tone. The maintainer still approves every PR.
4. **This artifact lives at** `docs/spec/oss-publication-checklist.md` (sibling to the
   other specs).

## How to read this

Items are grouped P0 (announcement blockers) → P3 (post-launch polish). Each carries a
one-line **Rationale**, the exact **Files/commands**, and **Acceptance** criteria. File
work happens on `chore/oss-readiness`; **do not touch `examples/family-tree/`** (concurrent
agent work). Run `vp check` after editing repo files and `vp run ready` before declaring
the gate green. Reference existing artifacts rather than restating them: contributor
release flow is `docs/CHANGESETS.md`, conventions live in `AGENTS.md`, prior decisions in
`docs/decisions/ADR-00{1..4}-*.md`.

---

## P0 — Announcement blockers

### P0.1 — Add `LICENSE` at repo root

- **Rationale:** Apache-2.0 is declared in the package but no license text exists in the
  repo → legally ambiguous and GitHub shows no license badge.
- **Files:** `LICENSE` (full Apache-2.0 text, `[yyyy]`→`2026`, `[name]`→`Jason Procka`).
- **Acceptance:** `git ls-files | grep -x LICENSE` returns `LICENSE`; first line is
  `                                 Apache License`; GitHub repo page shows an
  "Apache-2.0" license badge after push.

### P0.2 — Rewrite root `README.md` as the project landing page

- **Rationale:** It is still the generic "Vite+ Monorepo Starter" — the first thing repo
  visitors see. (The _package_ README at `packages/extension-ltree/README.md` is already
  strong; model the tone on it but keep this one repo-scoped.)
- **Files:** `README.md` — pitch, what `ltree`/this pack is, install
  (`pnpm add prisma-ltree`), 30-second quickstart, links to: npm package, docs site
  (`https://prisma-ltree.procka.org`), package README, `CONTRIBUTING.md`, license.
- **Acceptance:** `grep -c "Vite+ Monorepo Starter" README.md` → `0`; README names
  `prisma-ltree`, links the docs site and npm, and points to CONTRIBUTING + LICENSE.

---

## P1 — Expected by serious consumers

### P1.1 — `CONTRIBUTING.md` (root)

- **Rationale:** Contributors need the local dev contract in one place.
- **Files:** `CONTRIBUTING.md` — prerequisites (Node `>=24`, pnpm `11.7.0` / Vite+ `vp`),
  clone → `pnpm install` → `pnpm run sync-docs` (prisma-next reference into `.sync/`),
  validation via `vp run ready`, the changeset requirement (`pnpm run changeset`, see
  `docs/CHANGESETS.md`) and `[skip-version]` doc-only convention, branch model (PR to
  `main`), pointers to `AGENTS.md` and the skills system, and a note that
  `@prisma-next/*` pins are exact by design (`docs/prisma-next/versioning-and-compatibility.md`).
- **Acceptance:** File exists; references `vp run ready`, `pnpm run sync-docs`,
  `docs/CHANGESETS.md`, and `AGENTS.md`; commands match actual `package.json` scripts.

### P1.2 — `CODE_OF_CONDUCT.md` (root)

- **Rationale:** Inviting-posture decision; signals a safe community.
- **Files:** `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1, contact = maintainer email.
- **Acceptance:** File exists; contains "Contributor Covenant" and a working contact;
  CONTRIBUTING links to it.

### P1.3 — `SECURITY.md` (root)

- **Rationale:** A DB/ORM extension warrants a private vulnerability-reporting policy, not
  public issues.
- **Files:** `SECURITY.md` — supported versions, private reporting via GitHub Security
  Advisories, response expectations.
- **Acceptance:** File exists; points to private advisory reporting (not public issues);
  GitHub "Security policy" shows as defined after push.

### P1.4 — Issue templates

- **Rationale:** Triage-ready reports; routes Q&A to Discussions.
- **Files:** `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`,
  `documentation.md`, and `config.yml` (disable blank issues, link Discussions + docs).
- **Acceptance:** Files exist and are valid YAML/front-matter; GitHub "New issue" shows
  the three templates plus the Discussions link.

### P1.5 — Pull request template

- **Rationale:** Reminds contributors of changeset/tests/docs before review.
- **Files:** `.github/PULL_REQUEST_TEMPLATE.md` — checklist (changeset added or
  `[skip-version]`, `vp run ready` green, docs updated).
- **Acceptance:** File exists; new PRs are pre-filled with the checklist.

---

## P2 — Polish & contributor experience

### P2.1 — `.github/CODEOWNERS`

- **Rationale:** Transparent review routing (does not change merge rights).
- **Files:** `.github/CODEOWNERS` — `* @slovakian`.
- **Acceptance:** File exists; GitHub auto-requests `@slovakian` on new PRs.

### P2.2 — `.github/dependabot.yml`

- **Rationale:** Automated dependency upkeep — but `@prisma-next/*` pins are exact by
  design and must be excluded.
- **Files:** `.github/dependabot.yml` — `npm` (root) weekly + `github-actions` weekly,
  with an `ignore` for `@prisma-next/*`.
- **Acceptance:** Valid YAML; ignores `@prisma-next/*`; Dependabot "last checked" populates
  after push.

### P2.3 — Global `.env*` rule in root `.gitignore`

- **Rationale:** Belt-and-suspenders against committing secrets repo-wide.
- **Files:** `.gitignore` — add `.env`, `.env.*`, with `!.env.example` un-ignored.
- **Acceptance:** `git check-ignore examples/family-tree/.env` exits 0; `.env.example`
  files remain tracked.

### P2.4 — Orphan `packages/utils/` (local-only — no repo change)

- **Rationale:** Directory holds only `dist/` + `node_modules/`, no `package.json` — clutter
  that the `packages/*` workspace glob tries to include.
- **Finding:** `packages/utils/` is **not tracked by git on `main`** (`git ls-tree -r main`
  shows nothing under it) and contains only gitignored artifacts. It exists solely as
  untracked files in a local working copy, so there is nothing to remove from the repo.
  Whoever owns that working copy can `rm -rf packages/utils/` locally if desired.
- **Acceptance:** `git ls-tree -r main --name-only | grep packages/utils` → empty (✓).

### P2.5 — Align root `engines.node` to `>=24`

- **Rationale:** Consistency with package + CI (decision #2).
- **Files:** root `package.json` `engines.node` → `>=24`.
- **Acceptance:** `grep '"node"' package.json` shows `>=24`; `vp run ready` green.

### P2.6 — Add `description` to root `package.json`

- **Rationale:** Aids GitHub repo metadata even though the root is `private`.
- **Files:** root `package.json` `description`.
- **Acceptance:** Field present and non-empty.

### P2.7 — README badges

- **Rationale:** Conventional at-a-glance status (npm version, license, CI, docs).
- **Files:** badges in `README.md` (npm, license, CI workflow status, docs URL).
- **Acceptance:** Badges render on GitHub after push (no broken images).

---

## P3 — Post-launch (mostly GitHub Settings, not files)

These are tracked here but are configured in the GitHub UI/API, not via repo files. They
are **not** announcement blockers.

- **P3.1 — Repo description + topics:** prisma, postgresql, ltree, orm, extension,
  prisma-next, hierarchical-data. _Acceptance:_ visible on repo home.
- **P3.2 — GitHub Releases:** mirror npm publishes (changesets handles npm; Releases is a
  separate surface). _Acceptance:_ a `v0.2.1` (or next) release exists.
- **P3.3 — Enable GitHub Discussions** (per posture decision). _Acceptance:_ Discussions
  tab live; issue-template `config.yml` link resolves.
- **P3.4 — `good first issue` label** seeded on a few starter issues.
- **P3.5 — Branch protection on `main`:** require PR review + required status checks (CI).
  _Acceptance:_ direct pushes to `main` rejected.
- **P3.6 — `.github/funding.yml`** if/when accepting sponsorship (optional).

---

## Out of scope / do not touch

- `examples/family-tree/**` — concurrent agent work.
- `@prisma-next/*` version pins — exact by design; use the `check-pins` script and the
  `prisma-next-extension-upgrade` skill only when a deliberate bump is requested.
- Generated `contract.json` / `contract.d.ts` / migration JSON — emitted, not hand-edited.
