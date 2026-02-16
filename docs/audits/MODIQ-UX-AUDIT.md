# MOD IQ UX/UI Comprehensive Audit Report

## System Overview

MOD IQ is a multi-phase wizard that maps xLights models from a vendor's source show layout to a user's destination layout, generating an `.xmap` file. The user journey flows through these stages:

1. **Landing / Upload** — File upload (user's `.xrgb` layout) and sequence selection
2. **Processing** — Auto-matching engine runs, loading screen shown
3. **Phase 1: Groups & Models** — Map groups and individual models (left=source layers, right=user models)
4. **Phase 2: Submodels** — Map submodel groups (spinners, wreaths, HD props)
5. **Phase 3: Display Coverage** — Fill coverage gaps (shows all items)
6. **Phase 4: Review** — Review metrics, advisor, export
7. **Export** — `.xmap` download with coverage boost prompt option
8. **Post-Export** — Success screen with survey, download-again, map-another

---

## 1. First-Run Experience / Onboarding

### 1.1 No explanation of what MOD IQ does before requiring file upload

- **What**: The landing screen jumps straight to "Upload your layout file" and "Choose a sequence" without explaining what MOD IQ is, what an xmap file is, or why the user needs one. The page title says "Intelligent Sequence Mapping" but the body never expands on this.
- **Where**: `src/components/ModIQTool.tsx`, lines ~2790-2860 (the landing/input step)
- **Why**: First-time users arriving from a link or search will not understand the value proposition or prerequisites. They may not know they need their `.xrgb` file ready.
- **How**: Add a brief "How it Works" section above the upload area with 3 steps: (1) Upload your xLights layout, (2) Pick a sequence to map, (3) Get your .xmap file. Consider a 30-second animation or diagram showing the concept of mapping source models to destination models. Also add a "What you'll need" checklist (your .xrgb layout file from xLights, a purchased sequence).
- **Priority**: P1

### 1.2 No contextual help or tooltips during the mapping phases

- **What**: When users first enter the mapping workspace (the two-panel layout with source layers on the left and user models on the right), there is no guided introduction explaining the interaction model: click a source layer to select it, then drag or click a user model to assign it, or click the green suggestion pill to accept an auto-match.
- **Where**: `src/components/modiq/phases/IndividualsPhase.tsx`, `src/components/modiq/UniversalSourcePanel.tsx`
- **Why**: The dual-panel, drag-and-drop, click-to-assign interaction model is not self-evident. Users new to mapping tools will wonder what to do.
- **How**: Implement a one-time onboarding overlay or coach marks for first-time users. Show: (a) "These are source layers from the sequence" (left panel), (b) "These are your models" (right panel), (c) "Click the green pill to accept a match, or drag a model to assign manually." Dismiss permanently with a "Got it" button, stored in localStorage.
- **Priority**: P1

### 1.3 File upload provides no preview/validation feedback

- **What**: After uploading an `.xrgb` file, the user sees their model count but no preview of what was parsed (model names, groups, pixel counts). If the file is invalid or empty, error handling exists but the error message ("Could not parse any models...") is generic.
- **Where**: `src/components/ModIQTool.tsx`, lines ~735-820 (file handling logic)
- **Why**: Users need confidence that the right file was uploaded and it was parsed correctly before proceeding.
- **How**: After successful parse, show a summary card: "Found X models, Y groups, Z total pixels" with an expandable list showing the first 10 model names. For errors, provide specific guidance: "This doesn't look like an xLights layout file. Expected .xrgb format — make sure you export from xLights > File > Export Layout."
- **Priority**: P1

---

## 2. Information Architecture

### 2.1 Phase stepper labels are ambiguous for non-experts

- **What**: The phases are labeled "Groups & Models," "Submodels," "Coverage," "Review." The term "Submodels" is xLights jargon that many users won't understand. "Coverage" is vague — coverage of what?
- **Where**: `src/types/mappingPhases.ts`, lines 35-71; `src/components/modiq/PhaseStepper.tsx`
- **Why**: Users need to understand at a glance what each step involves and what is expected of them.
- **How**: Rename to more descriptive labels: "Match Models" (Phase 1), "Match Spinners & Props" (Phase 2), "Fill Gaps" (Phase 3), "Review & Export" (Phase 4). Each stepper pill should have a subtitle on hover explaining the purpose.
- **Priority**: P2

### 2.2 No "skip to export" shortcut for users who trust auto-matching

- **What**: Users must click through all 4 phases sequentially even if auto-matching achieved 95%+ coverage. There is no "Looks good, skip to export" fast-path.
- **Where**: `src/components/modiq/PhaseNavigation.tsx`
- **Why**: Power users who trust the auto-matcher should not be forced through a 4-phase wizard when the engine achieved excellent coverage. This wastes time and reduces perceived value.
- **How**: In the PhaseNavigation or PhaseStepper, if overall coverage exceeds 85%, show a prominent "Auto-matching looks great! Skip to Review" button. This would jump directly to the Review phase. The stepper pills should remain clickable for users who want to inspect specific phases.
- **Priority**: P1

### 2.3 Phase progression does not visually indicate completion state

- **What**: The stepper shows active phase highlighted but does not show completed phases with a green checkmark or filled state. All non-active phases look the same whether they are completed or upcoming.
- **Where**: `src/components/modiq/PhaseStepper.tsx`, lines ~1-120
- **Why**: Users cannot tell at a glance which phases they have already addressed and which remain.
- **How**: Add a `completed` visual state to each stepper pill: green checkmark icon, filled background in green/accent, and a subtle "done" indicator. Track completion per-phase (e.g., all items in phase mapped = completed).
- **Priority**: P2

---

## 3. Visual Design & Hierarchy

### 3.1 The 3,655-line ModIQTool.tsx is a "God component" that renders all states

- **What**: This single file handles the landing page, file upload, sequence selection, loading screen, all mapping phases, export dialogs, boost prompts, and post-export screen. While the mapping phases are delegated to child components via `PhaseContainer`, the orchestrator's render function (lines ~2790-3655) contains extensive conditional rendering for ~8 different application states.
- **Where**: `src/components/ModIQTool.tsx`
- **Why**: From a UX perspective, this monolith makes it harder to optimize individual screens because transitions between states are managed through complex conditional logic. It increases the risk of visual inconsistency between screens.
- **How**: Extract each step into its own top-level component: `<LandingStep>`, `<ProcessingStep>`, `<MappingWorkspace>`, `<PostExportScreen>`. Use a state machine (XState or useReducer) to manage transitions. This would make each screen's layout independently optimizable.
- **Priority**: P2 (architecture, not user-facing)

### 3.2 The source panel (left) and user panel (right) have inconsistent visual weight

- **What**: The left panel (`SourceLayerRow` items) has dense information per row (name, GRP badge, effect count, effect context badge, suggestion pill, skip button, expand chevron). The right panel (`DraggableUserCard` items) is comparatively sparse (name, type badge, pixel count, assignment badge). The left panel feels heavier and more complex.
- **Where**: `src/components/modiq/phases/IndividualsPhase.tsx`, lines ~200-430 (the two-column layout); `src/components/modiq/UniversalSourcePanel.tsx`
- **Why**: The asymmetric information density creates cognitive imbalance. The user's eye is drawn to the left panel but they also need to reference the right panel frequently. The source panel's rows pack 6-8 pieces of metadata into a single line.
- **How**: (a) Consider a progressive disclosure approach for the left panel: show name + top suggestion only by default, with a "more details" expansion revealing effect counts, badges, and scenario labels. (b) Add a subtle visual connector between selected source and its suggested match on the right panel (a horizontal line or highlighted row). (c) Reduce badge count on the default row state — the GRP, effect count, effect context, and suggestion pill all compete for attention.
- **Priority**: P2

### 3.3 Text sizes are extremely small throughout the mapping workspace

- **What**: The predominant text sizes are 9px, 10px, 11px, and 12px. Card titles are 13px. Panel header subtitles are 11px. Badge text is 9-10px. Effect count badges are 10px. This is below WCAG recommended minimum of 12px for body text.
- **Where**: `src/components/modiq/panelStyles.ts`, lines 7-26; multiple components using `text-[10px]`, `text-[11px]`, `text-[9px]`
- **Why**: Small text strains eyes, especially during extended mapping sessions. Many xLights enthusiasts are middle-aged or older hobbyists who may have reduced visual acuity.
- **How**: Establish a minimum text size of 12px for any readable content. Increase card titles to 14px, subtitles to 12px, and badges to 11px minimum. The `text-[9px]` used for GRP/SUB/MODEL badges in `panelStyles.ts` should be 10px minimum. Consider a zoom/scale control in the workspace header.
- **Priority**: P1

### 3.4 Hard-coded dark color values bypass theme system

- **What**: Multiple components use hard-coded zinc/gray colors and hex values instead of semantic theme tokens (`bg-surface`, `bg-background`, `border-border`, `text-foreground`).
- **Where**: `src/components/modiq/PickMatchPopover.tsx` (lines using `bg-zinc-800`, `border-zinc-700`, `text-zinc-200`); `src/components/modiq/CoverageProgressBar.tsx` (line 117: `bg-[#222]`)
- **Why**: These values will break if a light theme is ever introduced and create visual inconsistencies between themed and non-themed components.
- **How**: Replace all hard-coded color values with semantic tokens. `bg-zinc-800` should be `bg-surface` or `bg-background`. `text-zinc-200` should be `text-foreground`. `border-zinc-700` should be `border-border`. Do a project-wide audit of `zinc-`, `#1`, `#2`, `#3` color values in the modiq directory.
- **Priority**: P2

---

## 4. Interaction Design

### 4.1 Click-to-assign vs. drag-and-drop ambiguity on right panel

- **What**: User model cards in the right panel support both click-to-assign (when a source layer is selected) and drag-to-assign. The visual affordance changes: with a selected source, cards show a `+` icon and use `cursor-pointer`; without, they show a drag handle and use `cursor-grab`. This dual-mode is smart but the transition between modes is not visually communicated.
- **Where**: `src/components/modiq/DraggableUserCard.tsx`, lines 92-102; `src/components/modiq/UniversalSourcePanel.tsx`
- **Why**: Users may try to drag when they should click, or click when they should drag. The mode switch depends on whether a source layer is focused on the left panel, which is not always obvious.
- **How**: (a) When a source layer is selected, add a subtle top banner to the right panel: "Click a model below to map it to [Source Name]". (b) When no source is selected, add: "Select a source layer on the left, or drag a model to a source." (c) Add a brief pulse animation to the right panel cards when a source is first selected to draw attention.
- **Priority**: P1

### 4.2 The suggestion pill on SourceLayerRow is the primary CTA but looks like a badge

- **What**: The best-match suggestion appears as a small green pill (`rounded-full bg-green-500/10 border border-green-500/25`) with the model name and score. It is clickable (one-click accept) but visually reads as a passive badge rather than an interactive button.
- **Where**: `src/components/modiq/SourceLayerRow.tsx`, lines 423-472
- **Why**: This is the highest-value interaction in the entire wizard — one click maps a model. But its small size, low-contrast green, and badge-like appearance undermine discoverability. Users may not realize it is clickable.
- **How**: (a) Make the suggestion pill slightly larger with a hover state that clearly indicates interactivity (e.g., `hover:scale-105`, underline on hover). (b) Add a small checkmark or "+" icon to the left of the name to signify "click to accept". (c) Consider adding a subtle pulsing animation for unaddressed items to draw attention. (d) On first visit, highlight this with the onboarding coach mark.
- **Priority**: P1

### 4.3 Skip button is hidden behind hover state, invisible on touch devices

- **What**: The skip button on each source layer row uses `opacity-0 group-hover:opacity-100` — it is completely invisible until the user hovers over the row. On touch devices (tablets, phones) there is no hover event, making the skip action undiscoverable.
- **Where**: `src/components/modiq/SourceLayerRow.tsx`, lines 482-501
- **Why**: Users on touch devices cannot access the skip functionality at all. Even on desktop, hidden controls reduce discoverability for first-time users.
- **How**: (a) Always show the skip button at reduced opacity (e.g., `opacity-40 group-hover:opacity-100`) so it is discoverable without hover. (b) On mobile viewports, always show action buttons. (c) Alternatively, add a long-press context menu or swipe-to-skip gesture for touch.
- **Priority**: P1

### 4.4 No keyboard shortcuts for accept/skip during mapping workflow

- **What**: Users must click (or drag) for every mapping action. The `useKeyboardShortcuts` hook exists but uses Alt+modifier combos that are not discoverable.
- **Where**: `src/hooks/useKeyboardShortcuts.ts`; throughout the mapping phases
- **Why**: Power users mapping 100+ models will fatigue from repetitive clicking. Keyboard shortcuts dramatically accelerate workflow.
- **How**: Add a global keyboard handler in the mapping workspace: `Enter` = accept top suggestion for focused item, `S` or `Delete` = skip focused item, `Ctrl+Z` = undo, `N` = focus next unmapped, `P` = open PickMatchPopover for focused item. Show a "Keyboard shortcuts" tooltip accessible via `?` key.
- **Priority**: P1

### 4.5 PickMatchPopover traps Tab key, preventing normal keyboard navigation

- **What**: The popover adds a global `keydown` listener that prevents default on both Escape AND Tab (`if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); onClose(); }`). Tab should cycle focus within the popover (focus trap), not close it.
- **Where**: `src/components/modiq/PickMatchPopover.tsx`, lines 109-118
- **Why**: Preventing Tab breaks standard keyboard navigation expectations. Users expect Tab to cycle through interactive elements within a dialog.
- **How**: Implement a proper focus trap: Tab should cycle between the search input and the list items within the popover. Only Escape should close. Use a focus-trap library or implement tabindex management manually.
- **Priority**: P0

---

## 5. Feedback & Communication

### 5.1 Loading/processing screen lacks progress granularity

- **What**: During the auto-matching phase, the user sees a generic spinner with "Analyzing your models..." or similar text. There is no progress bar, no indication of how many models have been processed, and no estimated time remaining.
- **Where**: `src/components/ModIQTool.tsx`, lines ~2880-2960 (the processing step)
- **Why**: For large layouts (100+ models), the processing step can take several seconds. Users may think the app is frozen.
- **How**: Add a multi-step progress indicator: "Step 1/3: Parsing layout... Step 2/3: Building effect tree... Step 3/3: Running auto-matcher (45/120 models)". Show a determinate progress bar when the number of models is known.
- **Priority**: P2

### 5.2 CelebrationToast auto-dismisses too quickly

- **What**: The celebration toast (shown when a phase completes) auto-dismisses after 2000ms (2 seconds). It uses `pointer-events-none` so users cannot interact with it.
- **Where**: `src/components/modiq/CelebrationToast.tsx`, line 18
- **Why**: 2 seconds is barely enough time to read the message, especially if the user's attention was on a different part of the screen.
- **How**: (a) Increase duration to 3500ms. (b) Add `pointer-events-auto` with a click-to-dismiss. (c) Consider a toast notification system (e.g., sonner or react-hot-toast) that stacks and allows manual dismissal.
- **Priority**: P3

### 5.3 No confirmation before destructive actions

- **What**: "Skip all X in [family]" immediately skips all items in a family group with no confirmation dialog. Clearing a mapping is also immediate. There is an undo stack, but users are not told they can undo.
- **Where**: Skip family action in `src/components/modiq/FamilyAccordionHeader.tsx` (line 42: `onSkipFamily`); clear mapping in `SourceLayerRow` expand section
- **Why**: Accidentally skipping an entire family (e.g., "Skip all 12 in Mini Trees") is a significant action that is difficult to recover from manually, even with undo.
- **How**: (a) For "skip family" actions affecting more than 3 items, show a confirmation: "Skip all 12 Mini Trees? You can undo this." (b) After any destructive action, show an inline "Undo" notification near the action area (snackbar pattern) for 5 seconds. (c) Make the undo button in the toolbar more prominent with a count: "Undo (3 actions)".
- **Priority**: P1

### 5.4 The "Undo" capability exists but has no visible affordance

- **What**: There is a full undo stack supporting v2 and v3 actions. However, there is no visible undo button anywhere in the mapping workspace UI — no component renders an undo button.
- **Where**: The `canUndo` boolean and `undo` function in `src/hooks/useInteractiveMapping.ts`, lines 500, 614-710
- **Why**: Users have no way to discover or invoke undo, despite the implementation being complete.
- **How**: Add an undo button to the workspace header or phase navigation bar. Show it when `canUndo` is true: a subtle icon button with "Undo" label and Ctrl+Z shortcut hint. Badge it with the action that would be undone (e.g., "Undo: Map Arch 3").
- **Priority**: P0

---

## 6. Accessibility

### 6.1 SourceLayerRow and DraggableUserCard lack proper ARIA roles

- **What**: Source layer rows and user model cards are interactive (clickable, draggable, expandable) but have no ARIA roles. They are rendered as plain `<div>` elements with `onClick` handlers. There are no `role="listitem"`, `role="button"`, `aria-expanded`, `aria-pressed`, or `aria-selected` attributes.
- **Where**: `src/components/modiq/SourceLayerRow.tsx`; `src/components/modiq/DraggableUserCard.tsx`
- **Why**: Screen reader users cannot navigate the mapping interface. The interactive elements are invisible to assistive technology.
- **How**: (a) Wrap source layer lists in `<div role="listbox">` with `aria-label="Source layers to map"`. (b) Each row should be `role="option"` with `aria-selected={isFocused}`. (c) Expandable rows need `aria-expanded={isExpanded}`. (d) The suggestion pill button should have `aria-label="Accept suggestion: map to [model name] (85% match)"`. (e) The skip button needs `aria-label="Skip [model name]"`.
- **Priority**: P1

### 6.2 Drag-and-drop has no keyboard alternative

- **What**: The drag-and-drop mapping interaction uses HTML5 drag events exclusively. There is no keyboard-based alternative for assigning a user model to a source layer via keyboard.
- **Where**: `src/hooks/useDragAndDrop.ts`; `src/components/modiq/DraggableUserCard.tsx`
- **Why**: Users who cannot use a mouse (motor impairments, screen reader users) cannot perform manual mapping assignments via drag-and-drop.
- **How**: The click-to-assign mode partially addresses this, but: (a) Source layer focus must be achievable via keyboard (Tab + Enter on a source row). (b) User cards must be focusable and activatable via Enter/Space. (c) Add `aria-live="polite"` announcements for mapping changes: "Arch 3 mapped to your Mini Tree 3."
- **Priority**: P1

### 6.3 Color alone used to communicate status in progress bars

- **What**: Progress bars use color transitions (red/orange/yellow/emerald/green) to communicate coverage status. No textual or pattern-based alternatives are provided for colorblind users.
- **Where**: `src/components/modiq/CoverageProgressBar.tsx`; `src/components/modiq/PersistentProgressTracker.tsx`
- **Why**: Users with color vision deficiencies (8% of males) cannot distinguish between red, orange, yellow, and green progress states.
- **How**: (a) Always pair color with a text label or icon: < 50% = "Low" with warning icon, 50-70% = "Fair", 70-90% = "Good" with checkmark, 90%+ = "Excellent" with star. (b) Add patterns to progress bar fills (stripes for low, solid for good) to supplement color. (c) Ensure the percentage number is always visible (it already is — good).
- **Priority**: P2

### 6.4 Export dialog has incomplete focus trap

- **What**: The export dialog calls `dialogRef.current?.focus()` on mount and listens for Escape, but does not implement a proper focus trap. Tab can escape the dialog to the background page. There is no `aria-describedby` linking to the description text.
- **Where**: `src/components/modiq/ExportDialog.tsx`, lines 20-28
- **Why**: Modal dialogs must trap focus within them per WCAG 2.1 SC 2.4.3. Users can Tab out of the dialog to invisible background elements.
- **How**: (a) Use a focus trap library (e.g., `focus-trap-react`) or implement manual focus cycling between the three buttons. (b) Add `aria-describedby` pointing to the description paragraph. (c) Return focus to the triggering element when the dialog closes.
- **Priority**: P1

---

## 7. Responsive & Mobile

### 7.1 Two-panel layout collapses badly on mobile viewports

- **What**: The mapping workspace uses a CSS grid with two columns (source panel and user model panel). On mobile viewports (< 768px), the grid does not collapse to a single-column layout. Both panels try to render side-by-side at reduced widths, making content unreadable.
- **Where**: `src/components/modiq/phases/IndividualsPhase.tsx`, lines ~200-250 (the grid layout)
- **Why**: Many xLights enthusiasts use tablets or even phones to manage their shows. The mapping interface must be usable on a 768px-wide iPad at minimum.
- **How**: (a) At viewports below 768px, switch to a stacked layout with tabs: "Source Layers" tab and "Your Models" tab. (b) Use a bottom sheet for the user model panel on mobile: select a source layer, swipe up the bottom sheet to see and pick from your models. (c) At tablet widths (768-1024px), reduce the right panel to a compact list mode.
- **Priority**: P1

### 7.2 Touch targets are below 44x44px minimum

- **What**: Multiple interactive elements are smaller than the 44x44px minimum touch target recommended by WCAG 2.5.5. The skip button is 28x28px. Remove-link buttons are 20x20px.
- **Where**: Skip button in `src/components/modiq/SourceLayerRow.tsx` (line 486: `w-7 h-7` = 28x28px); remove-link button (`w-5 h-5` = 20x20px, line 285); suggestion pill (varies, often ~30px tall)
- **Why**: Small touch targets cause mis-taps, especially on mobile/tablet where fingers are less precise than a mouse cursor.
- **How**: Increase the hitbox using padding: skip button should be `min-w-[44px] min-h-[44px]` with the visual icon remaining at its current size. Remove-link buttons should have at least `p-2` padding bringing them to 36px+. Use the `touch-action` CSS property to prevent scroll interference.
- **Priority**: P1

### 7.3 Portaled popovers do not account for mobile viewports

- **What**: Portaled popovers use fixed positioning with manual viewport-edge calculations. They do not handle the iOS safe area, virtual keyboard, or landscape orientation changes. The PickMatchPopover has a hardcoded `maxHeight: 420` that may exceed mobile viewport height.
- **Where**: `src/components/modiq/PickMatchPopover.tsx`; `src/components/modiq/UsageBadge.tsx`; `src/components/modiq/ConfidenceBadge.tsx`
- **Why**: On mobile, these popovers may render off-screen, be covered by the virtual keyboard, or overlap with navigation chrome.
- **How**: (a) On mobile viewports, convert PickMatchPopover to a full-screen bottom sheet with `100dvh` height and a pull-to-dismiss gesture. (b) For UsageBadge and ConfidenceBadge, use a bottom-anchored popover on mobile. (c) Use `visualViewport` API to account for virtual keyboard.
- **Priority**: P2

---

## 8. Performance UX

### 8.1 No virtualization for large model lists

- **What**: Both panels render ALL items in the list with no virtualization. For a layout with 200+ models and 150+ source layers, this means 350+ React components rendered simultaneously, each with state, callbacks, and effect computations.
- **Where**: `src/components/modiq/UniversalSourcePanel.tsx` (renders all user cards in a scrollable list); `src/components/modiq/phases/IndividualsPhase.tsx` (renders all source layer rows)
- **Why**: Large layouts will cause noticeable jank when scrolling and when state changes trigger re-renders across the entire list.
- **How**: Implement virtual scrolling using `@tanstack/react-virtual` or `react-window`. Both panels should only render the visible items plus a small overscan buffer.
- **Priority**: P1

### 8.2 Suggestion cache uses permanent ref that never clears

- **What**: The suggestion cache (`fullSuggestionCacheRef`) is a ref that accumulates scored suggestions and never clears. For repeated sessions or large layouts, this grows unbounded in memory.
- **Where**: `src/hooks/useInteractiveMapping.ts`, lines 1398-1442 (fullSuggestionCacheRef)
- **Why**: Memory accumulation could cause performance degradation over long sessions.
- **How**: (a) Clear the cache when the user starts mapping a new sequence. (b) Consider using a WeakMap or LRU cache with a size limit (e.g., 500 entries).
- **Priority**: P3

### 8.3 Auto-apply effect runs as side effect with no visual progress

- **What**: The auto-apply runs in a `useEffect` that iterates over all eligible items, computes suggestions, and applies assignments synchronously. For large layouts, this blocks the main thread without any progress feedback.
- **Where**: `src/contexts/MappingPhaseContext.tsx`, lines 245-307 (the useEffect auto-apply)
- **Why**: During auto-apply, the UI may appear frozen. The user sees the workspace render with items, then items suddenly jump to "mapped" state without visual explanation.
- **How**: (a) Show a brief "Auto-matching in progress..." overlay during the auto-apply phase. (b) Consider using `requestIdleCallback` or chunked processing to avoid blocking the main thread. (c) After auto-apply completes, show a summary toast: "Auto-matched 45 of 67 items (67%). Review the results below."
- **Priority**: P2

---

## 9. Error Handling & Recovery

### 9.1 File upload errors are caught but recovery path is unclear

- **What**: The file parsing wraps operations in try-catch and sets `parseError` state. However, the error UI is a simple red text message. There is no "Try again" button, no guidance on how to fix the issue, and no way to clear the error without reloading.
- **Where**: `src/components/ModIQTool.tsx`, lines ~735-820
- **Why**: Users who upload the wrong file type or a corrupted file have no clear recovery path.
- **How**: (a) Show the error in a card with a red border and icon. (b) Add a "Try Different File" button that clears the error and reopens the file picker. (c) Add specific error messages for common issues: wrong file extension, empty file, XML parse failure, no models found. (d) Provide a link to a help article about exporting from xLights.
- **Priority**: P1

### 9.2 No session persistence or recovery for in-progress mappings

- **What**: The hook exposes `getSerializedState()` which can serialize assignments, skipped items, overrides, and source-dest links. However, this is never saved to localStorage, sessionStorage, or IndexedDB. If the user accidentally closes the tab or the browser crashes, all mapping work is lost.
- **Where**: The `getSerializedState` function exists in `src/hooks/useInteractiveMapping.ts` (lines 1554-1567) but is never called for persistence
- **Why**: Mapping 100+ models can take 10-20 minutes. Losing that work to an accidental tab close is devastating to user experience.
- **How**: (a) Auto-save the serialized state to localStorage every 30 seconds and after each mapping action. (b) On page load, check for saved state and offer to restore: "You have an unfinished mapping session from [timestamp]. Resume or start fresh?" (c) Add a manual "Save Progress" button in the workspace header.
- **Priority**: P0

### 9.3 Export failure has no error handling

- **What**: The xmap generation and download trigger (via Blob + URL.createObjectURL + anchor click) has no try-catch. If xmap generation throws, the user sees an unhandled JavaScript error.
- **Where**: `src/components/ModIQTool.tsx`, the export handler function
- **Why**: Silent failures during export are the worst possible outcome — the user thinks the mapping is complete but has no file.
- **How**: Wrap the export logic in try-catch. On failure, show an error dialog: "Export failed. Your mapping data is still intact. Try again or save a diagnostic report." Include a "Copy diagnostic info" button that copies the error message and serialized state to clipboard for support.
- **Priority**: P1

---

## 10. Advanced/Power User Features

### 10.1 No batch/multi-select for manual assignment

- **What**: Users cannot select multiple source layers and map them all to the same user model group simultaneously. The BulkInferenceBanner detects number-family patterns but only after a mapping is made.
- **Where**: The phases render one-at-a-time interactions; `src/components/modiq/BulkActionBar.tsx` exists but is only used for bulk-approve in auto-match review
- **Why**: Users with 20 identical "Mini Tree" items want to select them all and batch-map rather than clicking 20 times.
- **How**: (a) Add checkboxes to source layer rows for multi-select. (b) When multiple source layers are selected, show a batch action bar: "Map selected (5) to..." with a dropdown of user models. (c) Support Shift+Click for range selection and Ctrl+Click for individual selection. (d) Make the existing BulkInferenceBanner appear proactively before the first manual map when obvious patterns are detected.
- **Priority**: P1

### 10.2 No search/filter on the source layer list

- **What**: The right panel (user models) has a search bar in `UniversalSourcePanel`. The left panel (source layers) has a sort dropdown but no search/filter input. Users must scroll through potentially 100+ source layers to find a specific one.
- **Where**: `src/components/modiq/phases/IndividualsPhase.tsx`
- **Why**: When users want to find a specific source layer (e.g., "Mega Tree"), they must scroll through the entire list.
- **How**: Add a search input at the top of the source layer list that filters by name. Also add filter buttons: "Show: All | Unmapped | Mapped | Groups only". The SortDropdown already exists and is well-designed — combine it with a search field in the same header area.
- **Priority**: P1

### 10.3 No way to export/import mapping as JSON for sharing between users

- **What**: There is no way to export the mapping configuration itself (the assignments, not the xmap output) as a portable format that another user with the same layout could reuse.
- **Where**: Export currently only generates `.xmap` (XML format for xLights import)
- **Why**: In the xLights community, users share layouts and sequences. If User A with a common layout creates a mapping, User B with a similar layout would benefit from importing User A's mapping as a starting point.
- **How**: (a) Add an "Export Mapping Config" option in the Review phase that saves a JSON file containing the source-to-dest links. (b) Add an "Import Mapping Config" option on the landing page that pre-populates assignments. (c) Store the `getSerializedState()` output with metadata (source sequence name, user layout hash).
- **Priority**: P3

---

## 11. Micro-interactions & Polish

### 11.1 Drop success flash on SourceLayerRow is too brief and jarring

- **What**: After a successful drop, `showDropSuccess` is set to true and cleared after 400ms via `setTimeout`. The visual effect is `bg-green-500/20 ring-2 ring-green-500/50` — a bright green flash that appears and disappears in under half a second.
- **Where**: `src/components/modiq/SourceLayerRow.tsx`, lines 138-146
- **Why**: The flash is too brief to register and the sudden color change is jarring. It does not smoothly animate.
- **How**: (a) Extend to 800ms with a CSS `transition` on opacity for a smooth fade-out. (b) Add a subtle scale animation: the row slightly enlarges (1.01x) and then settles back. (c) Consider a checkmark animation that draws in rather than a background flash.
- **Priority**: P3

### 11.2 Phase transition has no animation

- **What**: Switching between phases (clicking "Next" or a stepper pill) instantly swaps the phase component. There is no transition animation.
- **Where**: `src/components/modiq/PhaseContainer.tsx`
- **Why**: Instant content swaps feel abrupt and can disorient users. They lose their sense of position in the workflow.
- **How**: Add a horizontal slide transition: new phase slides in from the right (going forward) or left (going back). Use `framer-motion` `AnimatePresence` with `mode="wait"` and `variants` for slide-in/slide-out. Keep duration short (200-300ms).
- **Priority**: P3

### 11.3 Empty states for phases with zero items are functional but uninspiring

- **What**: The empty state shows an icon (emoji), title, description, and optional action button. It is centered and clean but generic.
- **Where**: `src/components/modiq/PhaseEmptyState.tsx`
- **Why**: Empty states are an opportunity to educate and delight. A more thoughtful empty state could explain why the phase has no items.
- **How**: (a) For the Spinners phase empty state: "Your source sequence doesn't use any spinner/wreath effects. This phase has nothing to map. You can skip to the next phase." (b) For Display Coverage when coverage is high: "Your display is fully covered! Nothing more to do here." with a celebratory illustration. (c) Replace emoji icons with purpose-built SVG illustrations.
- **Priority**: P3

### 11.4 CascadeToast stacks could overflow the viewport

- **What**: The toast container is `fixed bottom-6 right-6` with `flex-col gap-2`. If multiple group mappings happen in quick succession, toasts stack vertically with no limit.
- **Where**: `src/components/modiq/CascadeToast.tsx`, lines 82-95
- **Why**: Five or more toasts could push the stack above the viewport or overlap with workspace content.
- **How**: Limit visible toasts to 3 maximum. When a 4th arrives, collapse older toasts into a count: "... and 2 more groups mapped". Alternatively, use a single updating toast that shows the latest cascade and a running total.
- **Priority**: P3

---

## 12. Workflow Optimization

### 12.1 The "Display Coverage" phase (Phase 3) is conceptually redundant with "Groups & Models" (Phase 1)

- **What**: Phase 3 shows ALL non-skipped source layers — the same items from Phases 1 and 2 combined. Its purpose is to "fill coverage gaps," but it presents the same items the user has already seen and acted on, just in a unified list.
- **Where**: `src/components/modiq/phases/FinalizePhase.tsx`; `src/types/mappingPhases.ts` (phase config)
- **Why**: Users may feel confused about why they are seeing the same items again.
- **How**: (a) Rename and reframe Phase 3 as a "Coverage Dashboard" rather than a mapping phase. Show only unmapped items prominently, with mapped items collapsed. (b) Add the CoverageBoostPrompt logic here instead of only at export time. (c) Consider making this phase optional or auto-skipping it when coverage exceeds 85%.
- **Priority**: P2

### 12.2 "Approve All" for auto-matched items requires going through each phase

- **What**: The `approveAllReviewItems` function exists to batch-approve auto-matched items, but users must navigate to each phase to trigger approval of items within that phase.
- **Where**: `src/contexts/MappingPhaseContext.tsx`, lines 333-342 (approveAllReviewItems)
- **Why**: If auto-matching achieved 90%+ accuracy, users should be able to approve all auto-matches globally with one click rather than phase-by-phase.
- **How**: Add a "Trust All Auto-Matches" button on the processing-complete screen. This would call `approveAllReviewItems` and `setCurrentPhase("review")` to skip directly to review.
- **Priority**: P2

### 12.3 The CoverageBoostPrompt appears only at export time, not during the workflow

- **What**: The coverage boost suggestions (mapping unmapped user groups to similar source groups) only appear when the user clicks "Export." This is a powerful feature that comes as a surprise at the last moment.
- **Where**: `src/components/modiq/CoverageBoostPrompt.tsx`; called from the export flow in `ModIQTool.tsx`
- **Why**: By the time users reach the export dialog, they have mentally committed to being "done." Presenting new mapping suggestions at this point creates decision fatigue.
- **How**: (a) Move the boost suggestions into the Display Coverage phase (Phase 3) as the primary content. Rename it "Coverage Boost." (b) Show the projected coverage improvement inline as users check/uncheck suggestions. (c) At export time, if coverage is below a threshold, show a simpler "Your coverage is at 67%. Go back to improve?" rather than the full suggestion dialog.
- **Priority**: P1

### 12.4 Post-export survey is disconnected — data goes nowhere

- **What**: The survey rating handler (`handleSurveySubmit`) sets local state and has a comment `// Future: send to telemetry endpoint`. The "Share anonymous mapping data" checkbox similarly does nothing.
- **Where**: `src/components/modiq/PostExportScreen.tsx`, lines 62-66
- **Why**: Collecting user feedback that goes nowhere creates a broken promise. If the survey is shown, it should function or not be shown at all.
- **How**: Either (a) implement the telemetry endpoint to capture survey responses and mapping data, or (b) remove the survey and sharing checkbox until the backend is ready. Showing non-functional data collection UI undermines trust.
- **Priority**: P2

---

## Summary by Priority

### P0 — Critical (UX is broken): 3 items

| # | Recommendation | Category |
|---|----------------|----------|
| 1 | 5.4 — Undo exists in code but no visible button anywhere in UI | Feedback |
| 2 | 4.5 — PickMatchPopover traps Tab key breaking keyboard nav | Interaction |
| 3 | 9.2 — No session persistence; tab close destroys all work | Error Recovery |

### P1 — Significant improvement: 21 items

| # | Recommendation | Category |
|---|----------------|----------|
| 4 | 1.1 — No explanation of what MOD IQ does before file upload | Onboarding |
| 5 | 1.2 — No contextual help or coach marks in mapping workspace | Onboarding |
| 6 | 1.3 — File upload provides no preview/validation feedback | Onboarding |
| 7 | 2.2 — No "skip to export" shortcut for high-coverage auto-match | Info Architecture |
| 8 | 3.3 — Text sizes (9-11px) below readable minimum throughout | Visual Design |
| 9 | 4.1 — Click vs. drag mode ambiguity on right panel | Interaction |
| 10 | 4.2 — Suggestion pill looks like badge, not clickable CTA | Interaction |
| 11 | 4.3 — Skip button invisible on touch devices (hover-only) | Interaction |
| 12 | 4.4 — No keyboard shortcuts for accept/skip/undo | Interaction |
| 13 | 5.3 — No confirmation before destructive batch actions | Feedback |
| 14 | 6.1 — Source rows and user cards lack ARIA roles | Accessibility |
| 15 | 6.2 — Drag-and-drop has no keyboard alternative | Accessibility |
| 16 | 6.4 — Export dialog has incomplete focus trap | Accessibility |
| 17 | 7.1 — Two-panel layout unusable on mobile/tablet | Responsive |
| 18 | 7.2 — Touch targets below 44x44px minimum | Responsive |
| 19 | 8.1 — No list virtualization for large layouts (200+ items) | Performance |
| 20 | 9.1 — File upload errors have no clear recovery path | Error Handling |
| 21 | 9.3 — Export failure has no error handling | Error Handling |
| 22 | 10.1 — No batch/multi-select for manual assignment | Power User |
| 23 | 10.2 — No search/filter on source layer list | Power User |
| 24 | 12.3 — Coverage boost appears only at export, not during workflow | Workflow |

### P2 — Nice polish: 12 items

| # | Recommendation | Category |
|---|----------------|----------|
| 25 | 2.1 — Phase stepper labels ambiguous for non-experts | Info Architecture |
| 26 | 2.3 — Stepper does not show completion state | Info Architecture |
| 27 | 3.1 — God component (3655 lines) makes screens hard to optimize | Visual Design |
| 28 | 3.2 — Source/user panels have inconsistent visual weight | Visual Design |
| 29 | 3.4 — Hard-coded dark colors bypass theme system | Visual Design |
| 30 | 5.1 — Loading screen lacks progress granularity | Feedback |
| 31 | 6.3 — Color alone communicates status in progress bars | Accessibility |
| 32 | 7.3 — Portaled popovers not adapted for mobile | Responsive |
| 33 | 8.3 — Auto-apply blocks main thread with no visual progress | Performance |
| 34 | 12.1 — Phase 3 conceptually redundant with Phase 1 | Workflow |
| 35 | 12.2 — "Approve All" requires navigating through each phase | Workflow |
| 36 | 12.4 — Post-export survey data goes nowhere | Workflow |

### P3 — Future enhancement: 7 items

| # | Recommendation | Category |
|---|----------------|----------|
| 37 | 5.2 — CelebrationToast auto-dismisses too quickly (2s) | Feedback |
| 38 | 8.2 — Suggestion cache grows unbounded in memory | Performance |
| 39 | 10.3 — No JSON export/import for mapping sharing | Power User |
| 40 | 11.1 — Drop success flash too brief and jarring | Polish |
| 41 | 11.2 — Phase transition has no animation | Polish |
| 42 | 11.3 — Empty states functional but uninspiring | Polish |
| 43 | 11.4 — CascadeToast stacks could overflow viewport | Polish |

---

*Audit covered 46 component files, 1,570 lines of hooks, 481 lines of context, 88 lines of types, and 3,655 lines of the main orchestrator. Generated 2026-02-16.*
