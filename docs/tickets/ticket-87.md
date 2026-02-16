# Ticket 87 — Onboarding & Contextual Help System

**Priority:** P1 — First-run experience
**Applies to:** ModIQ tool — pre-upload landing, mapping workspace, keyboard shortcuts
**Audit items:** No explanation of what MOD IQ does before requiring file upload; no contextual help/coach marks in the mapping workspace; file upload provides no preview of parsed models

---

## Current State

### Pre-Upload Explanation
There IS a "How It Works" 3-step explainer (`ModIQTool.tsx:668-694`) but it sits **below the fold**, beneath the source selection cards. A first-time user's eye lands on the upload zone before ever seeing what the tool does. The tool's value proposition is invisible at the moment of commitment (file upload).

### Contextual Help
The mapping workspace has zero coach marks, zero tooltips on headers, and zero progressive disclosure of features. Users are dropped into a two-panel split with no indication of what the left panel, right panel, suggestion pills, or skip buttons do.

### Keyboard Shortcuts
Shortcuts exist in `useKeyboardShortcuts.ts:13-55` (Alt+N → next unmapped, Alt+Enter → accept, Alt+S → skip, Ctrl+Z → undo) and in `PickMatchPopover.tsx:196-213` (Arrow keys, Enter, Escape). They are **completely undocumented** in the UI — no legend, no hints, no discovery path.

### Parsed Model Preview
After file upload, users see only a model *count* (`ModIQTool.tsx:1038` — `"{modelCount} models found"`), not the actual parsed model names, types, or pixel counts. Users can't verify the parser understood their file correctly before committing to the mapping workflow.

---

## Proposed Changes

### 1. Move "How It Works" Above the Fold
Reposition the 3-step explainer to appear **above** the source selection cards so it's the first content users see. Keep it concise — three steps with icons is already the right format, it just needs to be the first thing on the page.

### 2. File Upload Preview Panel
After a file is parsed, show an expandable preview list of parsed models before proceeding:
- Model name, type (Spinner, Matrix, Singing Face, etc.), pixel count
- Grouped by type with counts: "7 Spinners · 2 Matrices · 1 Singing Face"
- "Looks right? [Continue to Mapping]" confirmation button
- "Wrong file? [Upload Different File]" escape hatch

This gives users confidence the parser understood their layout before investing time in mapping.

### 3. First-Run Coach Mark Overlay
On first visit to the mapping workspace (track via `localStorage` flag), show a lightweight 3-step overlay:
1. **Left panel** highlight: "Your sequence — these are the source layers to map"
2. **Right panel** highlight: "Your display — drag or click to assign models"
3. **Suggestion pill** highlight: "Accept suggestions with one click, or skip to move on"

Dismissible with "Got it" button or clicking anywhere. Never shows again after dismissal.

### 4. Keyboard Shortcut Legend Bar
Add a persistent but dismissible shortcut hint bar at the bottom of the mapping workspace:
```
Tab → Next  |  Enter → Accept  |  S → Skip  |  Ctrl+Z → Undo  |  F → Focus Mode
```
- Compact single-line, muted styling, right-aligned dismiss "×"
- Respects `localStorage` dismissal — once hidden, stays hidden
- Accessible via a "?" button in the toolbar to re-show

---

## Files to Modify

| File | Change |
|------|--------|
| `ModIQTool.tsx` | Reorder "How It Works" above source cards; add preview panel after parse |
| `IndividualsPhase.tsx` / `FinalizePhase.tsx` | Add coach mark overlay container |
| New: `KeyboardShortcutBar.tsx` | Shortcut legend component |
| New: `CoachMarkOverlay.tsx` | First-run overlay component |

---

## Acceptance Criteria

- [ ] "How It Works" section visible without scrolling on 1080p viewport
- [ ] Parsed model preview shows all models with name, type, and pixel count
- [ ] Coach marks appear on first workspace visit, never again after dismissal
- [ ] Shortcut bar visible by default, dismissible, re-accessible via "?" button
- [ ] All new UI elements respect existing dark theme
