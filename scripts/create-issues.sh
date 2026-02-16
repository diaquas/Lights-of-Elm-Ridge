#!/usr/bin/env bash
# Auto-generated script to create GitHub issues from docs/tickets/
# Run: gh auth login   (first, if not already authenticated)
# Then: bash scripts/create-issues.sh

set -euo pipefail

REPO="diaquas/Lights-of-Elm-Ridge"

# Create labels if they don't exist
echo "Ensuring labels exist..."
gh label create "modiq" --repo "$REPO" --color "0075ca" --description "ModIQ mapping tool" 2>/dev/null || true
gh label create "ux-audit" --repo "$REPO" --color "e4e669" --description "From UX/accessibility audit" 2>/dev/null || true
gh label create "done" --repo "$REPO" --color "0e8a16" --description "Implemented" 2>/dev/null || true
echo "Labels ready."
echo ""

echo "Creating GitHub issues from docs/tickets/..."
echo ""

# Ticket 12: Fix Scrolling & Button Placement
echo "Creating issue for Ticket 12..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 12: Fix Scrolling & Button Placement" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-12-fix-scrolling-buttons.md" \
  2>&1) || echo "  Failed to create issue for Ticket 12"
echo "  Created: $ISSUE_URL"

# Ticket 13: Flatten High Density Phase (Remove Wizard-in-Wizard)
echo "Creating issue for Ticket 13..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 13: Flatten High Density Phase (Remove Wizard-in-Wizard)" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-13-flatten-high-density.md" \
  2>&1) || echo "  Failed to create issue for Ticket 13"
echo "  Created: $ISSUE_URL"

# Ticket 14: Fix Counters and Confidence Display
echo "Creating issue for Ticket 14..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 14: Fix Counters and Confidence Display" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-14-fix-counters.md" \
  2>&1) || echo "  Failed to create issue for Ticket 14"
echo "  Created: $ISSUE_URL"

# Ticket 15: Exclude Matched Items from Future Suggestions
echo "Creating issue for Ticket 15..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 15: Exclude Matched Items from Future Suggestions" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-15-exclude-matched-items.md" \
  2>&1) || echo "  Failed to create issue for Ticket 15"
echo "  Created: $ISSUE_URL"

# Ticket 16: Alphabetical Sort for Left Panel
echo "Creating issue for Ticket 16..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 16: Alphabetical Sort for Left Panel" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-16-alphabetical-sort.md" \
  2>&1) || echo "  Failed to create issue for Ticket 16"
echo "  Created: $ISSUE_URL"

# Ticket 17: Auto-Advance After Match
echo "Creating issue for Ticket 17..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 17: Auto-Advance After Match" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-17-auto-advance.md" \
  2>&1) || echo "  Failed to create issue for Ticket 17"
echo "  Created: $ISSUE_URL"

# Ticket 18: Bulk Inference from User Patterns
echo "Creating issue for Ticket 18..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 18: Bulk Inference from User Patterns" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-18-bulk-inference.md" \
  2>&1) || echo "  Failed to create issue for Ticket 18"
echo "  Created: $ISSUE_URL"

# Ticket 19: Positive Completion Messaging
echo "Creating issue for Ticket 19..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 19: Positive Completion Messaging" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-19-positive-messaging.md" \
  2>&1) || echo "  Failed to create issue for Ticket 19"
echo "  Created: $ISSUE_URL"

# Ticket 20: Remove Unnecessary Type Labels
echo "Creating issue for Ticket 20..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 20: Remove Unnecessary Type Labels" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-20-remove-type-labels.md" \
  2>&1) || echo "  Failed to create issue for Ticket 20"
echo "  Created: $ISSUE_URL"

# Ticket 21: Collapse Similar Items (Accordion Groups)
echo "Creating issue for Ticket 21..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 21: Collapse Similar Items (Accordion Groups)" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-21-collapse-similar.md" \
  2>&1) || echo "  Failed to create issue for Ticket 21"
echo "  Created: $ISSUE_URL"

# Ticket 22: Consistent Search & Scroll on All Mapping Screens
echo "Creating issue for Ticket 22..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 22: Consistent Search & Scroll on All Mapping Screens" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-22-search-scroll-consistency.md" \
  2>&1) || echo "  Failed to create issue for Ticket 22"
echo "  Created: $ISSUE_URL"

# Ticket 23: Auto-Match Screen Overhaul
echo "Creating issue for Ticket 23..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 23: Auto-Match Screen Overhaul" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-23-automatch-overhaul.md" \
  2>&1) || echo "  Failed to create issue for Ticket 23"
echo "  Created: $ISSUE_URL"

# Ticket 24: UI/UX Alignment & Polish
echo "Creating issue for Ticket 24..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 24: UI/UX Alignment & Polish" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-24-ui-alignment-polish.md" \
  2>&1) || echo "  Failed to create issue for Ticket 24"
echo "  Created: $ISSUE_URL"

# Ticket 25: ModIQ Landing Page Redesign
echo "Creating issue for Ticket 25..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 25: ModIQ Landing Page Redesign" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-25-landing-page-redesign.md" \
  2>&1) || echo "  Failed to create issue for Ticket 25"
echo "  Created: $ISSUE_URL"

# Ticket 27: Save States & Session Recovery (with User Accounts)
echo "Creating issue for Ticket 27..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 27: Save States & Session Recovery (with User Accounts)" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-27-save-states-recovery.md" \
  2>&1) || echo "  Failed to create issue for Ticket 27"
echo "  Created: $ISSUE_URL"

# Ticket 28: Enhanced Processing Screen ("ModIQ is Working")
echo "Creating issue for Ticket 28..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title 'Ticket 28: Enhanced Processing Screen ("ModIQ is Working")' \
  --label "modiq" \
  --body-file "docs/tickets/ticket-28-enhanced-processing-screen.md" \
  2>&1) || echo "  Failed to create issue for Ticket 28"
echo "  Created: $ISSUE_URL"

# Ticket 29: Metadata Display & Sorting on Mapping Screens
echo "Creating issue for Ticket 29..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 29: Metadata Display & Sorting on Mapping Screens" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-29-metadata-sorting.md" \
  2>&1) || echo "  Failed to create issue for Ticket 29"
echo "  Created: $ISSUE_URL"

# Ticket 30: User Account Page - ModIQ Section
echo "Creating issue for Ticket 30..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 30: User Account Page - ModIQ Section" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-30-user-account-modiq-page.md" \
  2>&1) || echo "  Failed to create issue for Ticket 30"
echo "  Created: $ISSUE_URL"

# Ticket 31: Matching Algorithm Improvements & Tuning
echo "Creating issue for Ticket 31..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 31: Matching Algorithm Improvements & Tuning" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-31-matching-algorithm-improvements.md" \
  2>&1) || echo "  Failed to create issue for Ticket 31"
echo "  Created: $ISSUE_URL"

# Ticket 32: Metadata Display Improvements - Effects as Hero Metric
echo "Creating issue for Ticket 32..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 32: Metadata Display Improvements - Effects as Hero Metric" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-32-metadata-display-improvements.md" \
  2>&1) || echo "  Failed to create issue for Ticket 32"
echo "  Created: $ISSUE_URL"

# Ticket 33: Filter Out Zero-Effect Models
echo "Creating issue for Ticket 33..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 33: Filter Out Zero-Effect Models" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-33-filter-zero-effects.md" \
  2>&1) || echo "  Failed to create issue for Ticket 33"
echo "  Created: $ISSUE_URL"

# Ticket 34: Collapse Repeated Items on Right Panel + Bulk Skip
echo "Creating issue for Ticket 34..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 34: Collapse Repeated Items on Right Panel + Bulk Skip" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-34-collapse-right-panel-groups.md" \
  2>&1) || echo "  Failed to create issue for Ticket 34"
echo "  Created: $ISSUE_URL"

# Ticket 35: Hide Zero-Effect Models Completely
echo "Creating issue for Ticket 35..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 35: Hide Zero-Effect Models Completely" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-35-hide-zero-effects-completely.md" \
  2>&1) || echo "  Failed to create issue for Ticket 35"
echo "  Created: $ISSUE_URL"

# Ticket 36: Enhanced "IN USE" Indicator with Mapping Details & Inline De-map
echo "Creating issue for Ticket 36..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title 'Ticket 36: Enhanced "IN USE" Indicator with Mapping Details & Inline De-map' \
  --label "modiq" \
  --body-file "docs/tickets/ticket-36-enhanced-in-use-indicator.md" \
  2>&1) || echo "  Failed to create issue for Ticket 36"
echo "  Created: $ISSUE_URL"

# Ticket 37: Universal Skip Functionality
echo "Creating issue for Ticket 37..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 37: Universal Skip Functionality" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-37-universal-skip.md" \
  2>&1) || echo "  Failed to create issue for Ticket 37"
echo "  Created: $ISSUE_URL"

# Ticket 38: Matching Algorithm Recommendations - Path to 65-80% Auto-Match Rate
echo "Creating issue for Ticket 38..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 38: Matching Algorithm Recommendations - Path to 65-80% Auto-Match Rate" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-38-matching-algorithm-recommendations.md" \
  2>&1) || echo "  Failed to create issue for Ticket 38"
echo "  Created: $ISSUE_URL"

# Ticket 39: Progress Tracking Redesign - Effects Coverage as Primary Metric
echo "Creating issue for Ticket 39..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 39: Progress Tracking Redesign - Effects Coverage as Primary Metric" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-39-progress-tracking-redesign.md" \
  2>&1) || echo "  Failed to create issue for Ticket 39"
echo "  Created: $ISSUE_URL"

# Ticket 40: Review Screen Redesign - User-Centric Success Metrics
echo "Creating issue for Ticket 40..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 40: Review Screen Redesign - User-Centric Success Metrics" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-40-review-screen-redesign.md" \
  2>&1) || echo "  Failed to create issue for Ticket 40"
echo "  Created: $ISSUE_URL"

# Ticket 42: Auto-Match Review Screen - Dual Coverage Metrics
echo "Creating issue for Ticket 42..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 42: Auto-Match Review Screen - Dual Coverage Metrics" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-42-auto-match-dual-metrics.md" \
  2>&1) || echo "  Failed to create issue for Ticket 42"
echo "  Created: $ISSUE_URL"

# Ticket 46: Effect-Based Matching Rules - Validated from 17 Real Sequences
echo "Creating issue for Ticket 46..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 46: Effect-Based Matching Rules - Validated from 17 Real Sequences" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-46-effect-based-matching-rules.md" \
  2>&1) || echo "  Failed to create issue for Ticket 46"
echo "  Created: $ISSUE_URL"

# Ticket 48: Persistent Animated Progress Tracker
echo "Creating issue for Ticket 48..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 48: Persistent Animated Progress Tracker" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-48-persistent-progress-tracker.md" \
  2>&1) || echo "  Failed to create issue for Ticket 48"
echo "  Created: $ISSUE_URL"

# Ticket 49: Auto-Match Duplicate Prevention & Optimal Assignment
echo "Creating issue for Ticket 49..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 49: Auto-Match Duplicate Prevention & Optimal Assignment" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-49-duplicate-prevention.md" \
  2>&1) || echo "  Failed to create issue for Ticket 49"
echo "  Created: $ISSUE_URL"

# Ticket 50: Auto-Match Review Layout - Maximize Viewport Usage
echo "Creating issue for Ticket 50..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 50: Auto-Match Review Layout - Maximize Viewport Usage" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-50-auto-match-layout.md" \
  2>&1) || echo "  Failed to create issue for Ticket 50"
echo "  Created: $ISSUE_URL"

# Ticket 51: Auto-Match Quick Filter Buttons
echo "Creating issue for Ticket 51..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 51: Auto-Match Quick Filter Buttons" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-51-quick-filter-buttons.md" \
  2>&1) || echo "  Failed to create issue for Ticket 51"
echo "  Created: $ISSUE_URL"

# Ticket 52: Right Panel: Sort by Mapped Status + Collapsible Sections
echo "Creating issue for Ticket 52..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 52: Right Panel: Sort by Mapped Status + Collapsible Sections" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-52.md" \
  2>&1) || echo "  Failed to create issue for Ticket 52"
echo "  Created: $ISSUE_URL"

# Ticket 54: Stepper Bar Redesign
echo "Creating issue for Ticket 54..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 54: Stepper Bar Redesign" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-54.md" \
  2>&1) || echo "  Failed to create issue for Ticket 54"
echo "  Created: $ISSUE_URL"

# Ticket 55: Left Panel: Model Grouping Visual Hierarchy & Sorting
echo "Creating issue for Ticket 55..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 55: Left Panel: Model Grouping Visual Hierarchy & Sorting" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-55.md" \
  2>&1) || echo "  Failed to create issue for Ticket 55"
echo "  Created: $ISSUE_URL"

# Ticket 56: Rethinking the End Game: New "Finalize" Phase + Review Overhaul
echo "Creating issue for Ticket 56..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title 'Ticket 56: Rethinking the End Game: New "Finalize" Phase + Review Overhaul' \
  --label "modiq" \
  --body-file "docs/tickets/ticket-56.md" \
  2>&1) || echo "  Failed to create issue for Ticket 56"
echo "  Created: $ISSUE_URL"

# Ticket 58: Finalize Phase V2: Redesign Recommendations
echo "Creating issue for Ticket 58..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 58: Finalize Phase V2: Redesign Recommendations" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-58.md" \
  2>&1) || echo "  Failed to create issue for Ticket 58"
echo "  Created: $ISSUE_URL"

# Ticket 59: Add Grid View Toggle to Finalize Phase
echo "Creating issue for Ticket 59..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 59: Add Grid View Toggle to Finalize Phase" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-59.md" \
  2>&1) || echo "  Failed to create issue for Ticket 59"
echo "  Created: $ISSUE_URL"

# Ticket 60: Bidirectional Perspective Switching (Both Views)
echo "Creating issue for Ticket 60..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 60: Bidirectional Perspective Switching (Both Views)" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-60.md" \
  2>&1) || echo "  Failed to create issue for Ticket 60"
echo "  Created: $ISSUE_URL"

# Ticket 61: Finalize Phase: UI Fixes & Enhancements
echo "Creating issue for Ticket 61..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 61: Finalize Phase: UI Fixes & Enhancements" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-61.md" \
  2>&1) || echo "  Failed to create issue for Ticket 61"
echo "  Created: $ISSUE_URL"

# Ticket 62: Finalize Phase: Filters & Sorts
echo "Creating issue for Ticket 62..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 62: Finalize Phase: Filters & Sorts" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-62.md" \
  2>&1) || echo "  Failed to create issue for Ticket 62"
echo "  Created: $ISSUE_URL"

# Ticket 63: Finalize: Ignore/Dismiss Models + Remove Card View
echo "Creating issue for Ticket 63..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 63: Finalize: Ignore/Dismiss Models + Remove Card View" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-63.md" \
  2>&1) || echo "  Failed to create issue for Ticket 63"
echo "  Created: $ISSUE_URL"

# Ticket 64: Finalize Grid: Row Density, Multi-Map Pills & Focus Mode
echo "Creating issue for Ticket 64..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 64: Finalize Grid: Row Density, Multi-Map Pills & Focus Mode" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-64.md" \
  2>&1) || echo "  Failed to create issue for Ticket 64"
echo "  Created: $ISSUE_URL"

# Ticket 65: Unify Grouping: Use xLights Groups as Single Source of Truth
echo "Creating issue for Ticket 65..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 65: Unify Grouping: Use xLights Groups as Single Source of Truth" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-65.md" \
  2>&1) || echo "  Failed to create issue for Ticket 65"
echo "  Created: $ISSUE_URL"

# Ticket 66: Finalize: Default Sort/Filter & Stable Row Behavior
echo "Creating issue for Ticket 66..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 66: Finalize: Default Sort/Filter & Stable Row Behavior" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-66.md" \
  2>&1) || echo "  Failed to create issue for Ticket 66"
echo "  Created: $ISSUE_URL"

# Ticket 67: Auto-Match Review Screen Overhaul
echo "Creating issue for Ticket 67..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 67: Auto-Match Review Screen Overhaul" \
  --label "modiq" \
  --body-file "docs/tickets/ticket-67.md" \
  2>&1) || echo "  Failed to create issue for Ticket 67"
echo "  Created: $ISSUE_URL"

# Ticket 68: Groups & Models Mapping Screen Improvements
echo "Creating issue for Ticket 68..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 68: Groups & Models Mapping Screen Improvements" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-68.md" \
  2>&1) || echo "  Failed to create issue for Ticket 68"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 69: Remove Auto-Match Phase, Integrate Into Subsequent Phases
echo "Creating issue for Ticket 69..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 69: Remove Auto-Match Phase, Integrate Into Subsequent Phases" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-69.md" \
  2>&1) || echo "  Failed to create issue for Ticket 69"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 70: Super Group Detection & Handling
echo "Creating issue for Ticket 70..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 70: Super Group Detection & Handling" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-70.md" \
  2>&1) || echo "  Failed to create issue for Ticket 70"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 71: Groups & Models Phase: UI Cleanup & Filter Overhaul
echo "Creating issue for Ticket 71..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 71: Groups & Models Phase: UI Cleanup & Filter Overhaul" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-71.md" \
  2>&1) || echo "  Failed to create issue for Ticket 71"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 73: Finalize Phase: Critical Fixes
echo "Creating issue for Ticket 73..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 73: Finalize Phase: Critical Fixes" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-73.md" \
  2>&1) || echo "  Failed to create issue for Ticket 73"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 75: Separate Skip (Dismiss) from Unlink (Remove Mapping)
echo "Creating issue for Ticket 75..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 75: Separate Skip (Dismiss) from Unlink (Remove Mapping)" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-75.md" \
  2>&1) || echo "  Failed to create issue for Ticket 75"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 76: Model & Group Card Redesign
echo "Creating issue for Ticket 76..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 76: Model & Group Card Redesign" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-76.md" \
  2>&1) || echo "  Failed to create issue for Ticket 76"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 77: Group Card: Health Bar, Model Counts & Accept Suggestion Redesign
echo "Creating issue for Ticket 77..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 77: Group Card: Health Bar, Model Counts & Accept Suggestion Redesign" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-77.md" \
  2>&1) || echo "  Failed to create issue for Ticket 77"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 78: Merge Submodel Groups Into Unified "Map Your Display" Step
echo "Creating issue for Ticket 78..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title 'Ticket 78: Merge Submodel Groups Into Unified "Map Your Display" Step' \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-78.md" \
  2>&1) || echo "  Failed to create issue for Ticket 78"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 79: Spinner Monogamy: One Source Per Destination HD Prop
echo "Creating issue for Ticket 79..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 79: Spinner Monogamy: One Source Per Destination HD Prop" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-79.md" \
  2>&1) || echo "  Failed to create issue for Ticket 79"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 80: Fix Mapping Panel States, Covered-by-Group Logic & Suggestion Hierarchy
echo "Creating issue for Ticket 80..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 80: Fix Mapping Panel States, Covered-by-Group Logic & Suggestion Hierarchy" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-80.md" \
  2>&1) || echo "  Failed to create issue for Ticket 80"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 81: Rebuild Submodel Groups Phase: Mirror Groups & Models UX
echo "Creating issue for Ticket 81..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 81: Rebuild Submodel Groups Phase: Mirror Groups & Models UX" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-81.md" \
  2>&1) || echo "  Failed to create issue for Ticket 81"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 85: Redesign Sequence Product Page Info Cards
echo "Creating issue for Ticket 85..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 85: Redesign Sequence Product Page Info Cards" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-85.md" \
  2>&1) || echo "  Failed to create issue for Ticket 85"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 86: Submodel Group Auto-Matching: Algorithm Fixes
echo "Creating issue for Ticket 86..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 86: Submodel Group Auto-Matching: Algorithm Fixes" \
  --label "modiq,done" \
  --body-file "docs/tickets/ticket-86.md" \
  2>&1) || echo "  Failed to create issue for Ticket 86"
echo "  Created: $ISSUE_URL"
# Mark as closed (implemented)
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP "\d+$")
if [ -n "$ISSUE_NUM" ]; then
  gh issue close "$ISSUE_NUM" --repo "$REPO" --reason completed 2>&1 || true
  echo "  Closed issue #$ISSUE_NUM (implemented)"
fi

# Ticket 87: Onboarding & Contextual Help System
echo "Creating issue for Ticket 87..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 87: Onboarding & Contextual Help System" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-87.md" \
  2>&1) || echo "  Failed to create issue for Ticket 87"
echo "  Created: $ISSUE_URL"

# Ticket 88: File Upload Error Recovery & Export Error Handling
echo "Creating issue for Ticket 88..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 88: File Upload Error Recovery & Export Error Handling" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-88.md" \
  2>&1) || echo "  Failed to create issue for Ticket 88"
echo "  Created: $ISSUE_URL"

# Ticket 89: Skip-to-Export Shortcut on High Auto-Match Coverage
echo "Creating issue for Ticket 89..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 89: Skip-to-Export Shortcut on High Auto-Match Coverage" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-89.md" \
  2>&1) || echo "  Failed to create issue for Ticket 89"
echo "  Created: $ISSUE_URL"

# Ticket 90: Minimum Text Size & Readability
echo "Creating issue for Ticket 90..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 90: Minimum Text Size & Readability" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-90.md" \
  2>&1) || echo "  Failed to create issue for Ticket 90"
echo "  Created: $ISSUE_URL"

# Ticket 91: Interaction Mode Clarity & Visual Affordance
echo "Creating issue for Ticket 91..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 91: Interaction Mode Clarity & Visual Affordance" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-91.md" \
  2>&1) || echo "  Failed to create issue for Ticket 91"
echo "  Created: $ISSUE_URL"

# Ticket 92: Keyboard Navigation for Mapping Actions
echo "Creating issue for Ticket 92..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 92: Keyboard Navigation for Mapping Actions" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-92.md" \
  2>&1) || echo "  Failed to create issue for Ticket 92"
echo "  Created: $ISSUE_URL"

# Ticket 93: Destructive Action Confirmation for Family Skip
echo "Creating issue for Ticket 93..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 93: Destructive Action Confirmation for Family Skip" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-93.md" \
  2>&1) || echo "  Failed to create issue for Ticket 93"
echo "  Created: $ISSUE_URL"

# Ticket 94: ARIA Roles, Focus Trap & Keyboard Accessibility
echo "Creating issue for Ticket 94..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 94: ARIA Roles, Focus Trap & Keyboard Accessibility" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-94.md" \
  2>&1) || echo "  Failed to create issue for Ticket 94"
echo "  Created: $ISSUE_URL"

# Ticket 95: Responsive Layout & Touch Targets
echo "Creating issue for Ticket 95..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 95: Responsive Layout & Touch Targets" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-95.md" \
  2>&1) || echo "  Failed to create issue for Ticket 95"
echo "  Created: $ISSUE_URL"

# Ticket 96: List Virtualization for Large Model Sets
echo "Creating issue for Ticket 96..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 96: List Virtualization for Large Model Sets" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-96.md" \
  2>&1) || echo "  Failed to create issue for Ticket 96"
echo "  Created: $ISSUE_URL"

# Ticket 97: Batch Multi-Select for Manual Assignment
echo "Creating issue for Ticket 97..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 97: Batch Multi-Select for Manual Assignment" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-97.md" \
  2>&1) || echo "  Failed to create issue for Ticket 97"
echo "  Created: $ISSUE_URL"

# Ticket 98: Surface CoverageBoostPrompt Earlier in Workflow
echo "Creating issue for Ticket 98..."
ISSUE_URL=$(gh issue create \
  --repo "$REPO" \
  --title "Ticket 98: Surface CoverageBoostPrompt Earlier in Workflow" \
  --label "modiq,ux-audit" \
  --body-file "docs/tickets/ticket-98.md" \
  2>&1) || echo "  Failed to create issue for Ticket 98"
echo "  Created: $ISSUE_URL"

echo ""
echo "Done! All issues created."
echo "Tickets marked as done (closed): [68, 69, 70, 71, 73, 75, 76, 77, 78, 79, 80, 81, 85, 86]"