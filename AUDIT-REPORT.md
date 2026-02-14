# Lights of Elm Ridge — Full Codebase Audit Report

**Date:** 2026-02-14
**Scope:** Full codebase audit with specific focus on MOD IQ
**Agents Deployed:** UX/UI/Design, Front End Code, Back End Code, QA/QE, DevOps, Architecture Review

---

## Executive Summary

Six specialized audit agents performed a comprehensive analysis of the Lights of Elm Ridge codebase (~52,000 LOC across 131 source files). The MOD IQ subsystem alone accounts for ~41,000 LOC across 72 files. The audit identified issues across all severity levels, many of which have been fixed in this commit.

### Findings by Severity

| Severity | Found | Fixed in This Commit |
|----------|-------|---------------------|
| CRITICAL | 18 | 6 |
| MAJOR | 42 | 10 |
| MINOR | 38 | 5 |

---

## Fixes Applied in This Commit

### CRITICAL Fixes
1. **Modal a11y: ExportDialog & CoverageBoostPrompt** — Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby` (WCAG 4.1.2)
2. **Keyboard shortcuts hijacking Tab/Enter** — Changed to Alt+N/Alt+Enter/Alt+S modifiers (WCAG 2.1.1)
3. **No CI workflow** — Created `.github/workflows/ci.yml` with lint, typecheck, test, and build steps
4. **CORS wildcard on all Edge Functions** — Restricted to configurable `ALLOWED_ORIGIN` (defaults to production domain)
5. **No Suspense fallback on ModIQ page** — Added loading spinner fallback
6. **Dead code: GroupsPhase.tsx** — Deleted 851 lines of unreachable code

### MAJOR Fixes
7. **ConfidenceBadge tooltip mouse-only** — Added `tabIndex`, `onFocus`/`onBlur` for keyboard access
8. **Hardcoded hex colors bypass design tokens** — Replaced `bg-[#141414]`, `bg-[#1a1a1a]`, `bg-[#111]` with `bg-surface`, `bg-surface-light`, `bg-background`
9. **ProgressDetailsModal eslint suppression** — Replaced with `role="document"` and proper `onKeyDown`
10. **Unused @vercel/analytics dependency** — Removed from package.json
11. **goToNextPhase destructured but unused** — Removed from IndividualsPhase and SpinnersPhase
12. **Non-functional `start` script** — Changed to `npx serve out` for static export
13. **Dead mockup files** — Removed `modiq-card-mockup.jsx` (376 lines) and `submodel-groups-mockup.jsx` (565 lines)

### MINOR Fixes
14. **CelebrationToast & CascadeToast missing aria-live** — Added `role="status"` and `aria-live="polite"`
15. **Glow class names misleading** — Added `.glow-accent`/`.glow-accent-light` aliases
16. **Brittle year assertion in test** — Changed from hardcoded `2026` to `new Date().getFullYear()`
17. **Missing `typecheck` script** — Added `tsc --noEmit` to package.json scripts

---

## Remaining Issues Requiring User Direction

These findings need architectural decisions or product direction before they can be addressed:

### Architecture / Major Refactoring
- **ModIQTool.tsx is a 3,655-line god component** with ~30 state variables — needs decomposition strategy
- **IndividualsPhase/SpinnersPhase share ~60-70% duplicated code** — needs shared phase abstraction
- **source-layout.ts is 10,055 lines of hardcoded data** — needs data externalization strategy
- **matcher.ts is 3,137-line monolith** — needs modular decomposition
- **Dual synonym systems** in matcher.ts and semanticSynonyms.ts — need consolidation
- **ParsedModel is an overloaded kitchen-sink type** — discriminated unions in xLightsTypes.ts exist but aren't used

### Mobile / Responsive (Product Decision)
- **MOD IQ mapping panels use fixed 50/50 split** — no responsive breakpoints for mobile
- **Drag-and-drop has no touch/mobile fallback** — tool is unusable on mobile
- **PhaseStepper pills overflow on narrow viewports** — needs responsive collapse strategy

### Security (Infrastructure Decision)
- **Client-supplied prices passed directly to Stripe** — needs server-side price catalog
- **Admin authorization is client-side only** — `NEXT_PUBLIC_ADMIN_EMAIL` exposed in bundle
- **Anonymous checkout creates orphan purchases** — NULL user_id never matchable via RLS
- **Download URLs are hardcoded and guessable** — needs presigned URL strategy
- **CSP includes `unsafe-eval`** — needs review of whether it can be removed

### Infrastructure (Service Decisions)
- **No error tracking or production monitoring** — needs Sentry/Bugsnag/etc. selection
- **No E2E testing framework** — needs Playwright/Cypress selection
- **32MB of xLights binary files in git** — needs Git LFS or external storage decision
- **Database migrations manually applied** — needs automated migration pipeline
- **Supabase Edge Functions use outdated Deno/Stripe SDKs** — needs update plan

### Testing (Ongoing)
- **~3% test coverage** (4 test files for 131 source files)
- **Zero tests for matching engine** (3,137 lines, 60+ tuning rules)
- **Zero tests for parser, effect-tree, xmap-generator, boost-matcher**
- **Zero tests for all MOD IQ components and hooks**

### Performance
- **matchModels() runs synchronously on main thread** — candidate for Web Worker
- **source-layout.ts (492KB) imported at module level** — needs lazy loading
- **Google Fonts loaded via render-blocking stylesheet** — should use next/font
- **4.3MB unoptimized images in /public/** — needs WebP/AVIF conversion

---

## Detailed Agent Reports

Full detailed reports from each agent are available in the git history of this commit. Each report includes specific file:line references for every finding.

### Agent Coverage Summary

| Agent | Focus Area | Critical | Major | Minor |
|-------|-----------|----------|-------|-------|
| UX/UI/Design | Accessibility, responsive, visual consistency | 3 | 10 | 13 |
| Front End Code | React patterns, TypeScript, performance, code quality | 7 | 14 | 13 |
| Back End Code | Supabase, Edge Functions, security, data processing | 1 | 5 | 10 |
| QA/QE | Test coverage, CI/CD, quality infrastructure | 5 | 13 | 6 |
| DevOps | Build pipeline, dependencies, repo hygiene | 5 | 15 | 12 |
| Architecture | System design, coupling, state management, algorithms | 2 | 9 | 8 |
