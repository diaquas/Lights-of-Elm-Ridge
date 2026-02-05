# ModIQ Implementation Tickets

> **For Claude Code**: This document contains prioritized implementation tickets for improving the ModIQ mapping interface. Each ticket includes context, acceptance criteria, and implementation hints. Work through P0 tickets first, then P1, then P2.

---

## Context

ModIQ is a sequence mapping tool for xLights (Christmas light show software). Users upload their layout file, select a source sequence, and ModIQ generates a mapping file (.xmap) that tells xLights how to translate effects from the source layout to the user's layout.

The current implementation works but has UX gaps. The core algorithms (effect tree parsing, group cascade logic, match scoring) are already functional — these tickets focus on **surfacing that intelligence to users** through better UI feedback and interaction patterns.

**Tech Stack** (assumed): React, TypeScript, TailwindCSS  
**Key Data Structures**:
- Source layers (from parsed .xsq effect tree)
- User models/groups (from uploaded xlights_rgbeffects.xml)
- Mappings (source layer → user model/group links)
- Match scores (0-100% confidence for each potential pairing)

---

## P0: Critical Fixes (Do First)

### TICKET-001: Add Group Cascade Preview

**Problem**: When users see a group like "All - Mini Trees - GRP (8 members)", they can't see which child models would be auto-resolved by mapping this group. This hides the main value proposition of group mapping.

**Current Behavior**: Group rows show member count but no breakdown of what mapping accomplishes.

**Desired Behavior**: Group rows are expandable. When expanded, they show:
- Which children have NO individual effects → "✓ Will be covered by group"
- Which children HAVE individual effects → "⚡ Has solo effects — needs own mapping"
- A summary: "Mapping this group resolves 6 of 8 children"

**Acceptance Criteria**:
- [ ] Group rows have an expand/collapse chevron
- [ ] Expanded state shows child model list with coverage status
- [ ] Children without individual effects show green checkmark + "Covered by group"
- [ ] Children with individual effects show ⚡ icon + "Has individual effects"
- [ ] Summary line shows "Mapping resolves X of Y children"
- [ ] Collapse state persists during session (don't auto-collapse on scroll)

**Implementation Hints**:
```tsx
// The effect tree data should already have this info:
interface SourceGroup {
  name: string;
  members: string[];
  membersWithIndividualEffects: string[];  // Scenario B children
  membersWithoutIndividualEffects: string[]; // Scenario A children  
  scenario: 'A' | 'B' | 'C';
}

// Add expansion state to the component
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

// Render expanded content
{isExpanded && (
  <div className="pl-6 py-2 space-y-1 text-sm">
    <p className="text-zinc-400">
      Mapping resolves {group.membersWithoutIndividualEffects.length} of {group.members.length} children:
    </p>
    {group.membersWithoutIndividualEffects.map(child => (
      <div key={child} className="flex items-center gap-2 text-green-400">
        <CheckIcon className="w-4 h-4" />
        <span>{child}</span>
        <span className="text-zinc-500">— covered by group</span>
      </div>
    ))}
    {group.membersWithIndividualEffects.map(child => (
      <div key={child} className="flex items-center gap-2 text-amber-400">
        <ZapIcon className="w-4 h-4" />
        <span>{child}</span>
        <span className="text-zinc-500">— has solo effects, needs own mapping</span>
      </div>
    ))}
  </div>
)}
```

**Files to Modify**:
- `components/mapping/SourceLayerRow.tsx` (or equivalent)
- `components/mapping/SourceLayerList.tsx` (add expansion state management)

---

### TICKET-002: Add Skip Action to Unmapped Items

**Problem**: Items showing "No close matches" are dead ends. Users have no way to acknowledge "I don't have this prop" and remove it from their task list.

**Current Behavior**: Items with no matches just show grey "No close matches" text. User cannot act on them.

**Desired Behavior**: Every unmapped item has a "Skip" button. Skipping:
- Removes the item from "Needs Mapping" 
- Adds it to a collapsed "Skipped" section
- Removes it from the denominator (so 18/20 instead of 18/22)
- Is reversible (can un-skip from the Skipped section)

**Acceptance Criteria**:
- [ ] "Skip" button (or ⊘ icon) visible on every unmapped row
- [ ] Clicking Skip moves item to Skipped section
- [ ] Skipped section is collapsed by default, shows count
- [ ] Progress bar denominator updates (skipped items don't count against you)
- [ ] Skipped items can be restored via "Restore" action
- [ ] Export summary shows skip count

**Implementation Hints**:
```tsx
// Add to mapping state
const [skippedLayers, setSkippedLayers] = useState<Set<string>>(new Set());

// Skip handler
const handleSkip = (layerId: string) => {
  setSkippedLayers(prev => new Set([...prev, layerId]));
};

// Progress calculation
const totalLayers = sourceLayers.length;
const skippedCount = skippedLayers.size;
const mappedCount = mappings.length;
const effectiveDenominator = totalLayers - skippedCount;
const progress = mappedCount / effectiveDenominator;

// Skip button in row
<button 
  onClick={() => handleSkip(layer.id)}
  className="text-zinc-500 hover:text-zinc-300 text-sm"
>
  Skip ⊘
</button>
```

**Files to Modify**:
- `components/mapping/SourceLayerRow.tsx` — add Skip button
- `components/mapping/MappingInterface.tsx` — add skippedLayers state
- `components/mapping/SourceLayerList.tsx` — add Skipped section
- `components/mapping/ProgressBar.tsx` — update denominator logic

---

### TICKET-003: Celebrate Group Mapping with Cascade Feedback

**Problem**: When a user maps a group that resolves 12 children, the progress counter goes from 75 to 76. One tick. The "you just saved yourself 11 clicks" moment is invisible.

**Current Behavior**: Progress increments by 1 regardless of cascade impact.

**Desired Behavior**: When mapping a group:
1. Show a toast/notification: "✓ All Mini Trees mapped — 8 children resolved!"
2. Progress bar animates the full jump (not just +1)
3. Brief highlight on the resolved children in the Mapped section

**Acceptance Criteria**:
- [ ] Toast appears on group mapping showing cascade count
- [ ] Toast auto-dismisses after 3 seconds
- [ ] Progress bar shows the full increment (e.g., +9 not +1)
- [ ] Animation on progress bar is visible (not instant)

**Implementation Hints**:
```tsx
// Toast component or use existing toast library
const showCascadeToast = (groupName: string, resolvedCount: number) => {
  toast({
    title: `✓ ${groupName} mapped`,
    description: `${resolvedCount} children resolved automatically`,
    duration: 3000,
  });
};

// On successful group mapping
const handleMapping = (sourceId: string, targetId: string) => {
  const sourceLayer = getSourceLayer(sourceId);
  if (sourceLayer.type === 'group') {
    const resolvedCount = sourceLayer.membersWithoutIndividualEffects.length;
    if (resolvedCount > 0) {
      showCascadeToast(sourceLayer.name, resolvedCount);
    }
  }
  // ... rest of mapping logic
};

// Progress bar with animation
<div 
  className="h-2 bg-green-500 transition-all duration-500 ease-out"
  style={{ width: `${progress * 100}%` }}
/>
```

**Files to Modify**:
- `components/mapping/MappingInterface.tsx` — add toast on mapping
- `components/mapping/ProgressBar.tsx` — add transition animation
- `components/ui/Toast.tsx` — create if doesn't exist

---

### TICKET-004: Fix Export Button States

**Problem**: The Export button is red/orange and shows "(130 unmapped)" at 37% coverage. Users can't tell if exporting is allowed, discouraged, or what the consequences are.

**Current Behavior**: Export button always appears available with unmapped count in red.

**Desired Behavior**: Export button has clear states:
- **< 50% coverage**: Grey/disabled appearance, "Export Partial (X remaining)"
- **50-99% coverage**: Amber/yellow, "Export (X remaining)" 
- **100% coverage**: Green, "Export ✓" with celebratory styling
- All states are clickable (user can always export), but visual treatment differs

**Acceptance Criteria**:
- [ ] Button color changes based on coverage percentage
- [ ] Button label updates based on state
- [ ] 100% coverage has distinct "complete" styling
- [ ] Clicking at any coverage level works (no blocking)

**Implementation Hints**:
```tsx
const getExportButtonStyle = (coverage: number, unmappedCount: number) => {
  if (coverage >= 1) {
    return {
      className: 'bg-green-600 hover:bg-green-500 text-white',
      label: 'Export ✓',
    };
  } else if (coverage >= 0.5) {
    return {
      className: 'bg-amber-600 hover:bg-amber-500 text-white',
      label: `Export (${unmappedCount} remaining)`,
    };
  } else {
    return {
      className: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300',
      label: `Export Partial (${unmappedCount} remaining)`,
    };
  }
};
```

**Files to Modify**:
- `components/mapping/ExportButton.tsx` (or wherever export button lives)

---

## P1: Important Improvements (Do Second)

### TICKET-005: Make Right Panel Dynamic with Global Suggestions

**Problem**: When no source layer is selected, the right panel says "Click a source layer to see best matches" — it's passive and unhelpful.

**Current Behavior**: Right panel only shows contextual suggestions after clicking a source layer.

**Desired Behavior**: Right panel always shows useful content:
- **Default state (nothing selected)**: "Suggested next mappings" section showing top 3-5 unmapped user groups with their best source matches
- **Selected state**: Current behavior (best matches for selected source)

**Acceptance Criteria**:
- [ ] Default state shows "Suggested Next Steps" or similar header
- [ ] Shows top unmapped user groups that have good matches (>50% score)
- [ ] Each suggestion shows: user group name, best source match, score
- [ ] Clicking a suggestion selects that source layer (or creates the mapping directly)
- [ ] Section updates as mappings are made

**Implementation Hints**:
```tsx
// Compute global suggestions
const getGlobalSuggestions = () => {
  const unmappedUserGroups = userGroups.filter(g => !isAssigned(g.id));
  const suggestions = unmappedUserGroups
    .map(group => {
      const bestMatch = findBestSourceMatch(group);
      return { userGroup: group, sourceMatch: bestMatch };
    })
    .filter(s => s.sourceMatch && s.sourceMatch.score >= 50)
    .sort((a, b) => b.sourceMatch.score - a.sourceMatch.score)
    .slice(0, 5);
  return suggestions;
};

// Render in right panel when nothing selected
{!selectedSourceLayer && (
  <div className="space-y-2">
    <h3 className="text-sm font-medium text-zinc-400">Suggested Next Steps</h3>
    {globalSuggestions.map(suggestion => (
      <SuggestionCard 
        key={suggestion.userGroup.id}
        userGroup={suggestion.userGroup}
        sourceMatch={suggestion.sourceMatch}
        onSelect={() => handleSuggestionClick(suggestion)}
      />
    ))}
  </div>
)}
```

**Files to Modify**:
- `components/mapping/YourModelsPanel.tsx` (right panel)
- `hooks/useMatchSuggestions.ts` — add global suggestion logic

---

### TICKET-006: Add Match Reasoning to Suggestions

**Problem**: Suggestion pills show "GHOST 2 24%" but users don't know WHY it's a 24% match. Is that good? Bad? What's being compared?

**Current Behavior**: Just shows name and percentage.

**Desired Behavior**: Hovering or expanding a suggestion shows match reasoning:
- "Similar pixel count (485px vs 520px)"
- "Same member count (4 models)"
- "Compatible type (both flat props)"

**Acceptance Criteria**:
- [ ] Tooltip on hover shows 2-3 match factors
- [ ] Each factor shows the comparison values
- [ ] Low scores show what's NOT matching

**Implementation Hints**:
```tsx
interface MatchReasoning {
  factor: string;
  sourceValue: string;
  targetValue: string;
  score: number; // 0-100 for this factor
}

const getMatchReasoning = (source: SourceLayer, target: UserModel): MatchReasoning[] => {
  return [
    {
      factor: 'Pixel count',
      sourceValue: `${source.pixelCount}px`,
      targetValue: `${target.pixelCount}px`,
      score: calculatePixelProximityScore(source.pixelCount, target.pixelCount),
    },
    {
      factor: 'Member count',
      sourceValue: `${source.memberCount} models`,
      targetValue: `${target.memberCount} models`,
      score: calculateMemberCountScore(source.memberCount, target.memberCount),
    },
    // etc.
  ];
};

// Tooltip content
<Tooltip content={
  <div className="space-y-1 text-xs">
    {reasoning.map(r => (
      <div key={r.factor} className="flex justify-between gap-4">
        <span className="text-zinc-400">{r.factor}:</span>
        <span>{r.sourceValue} vs {r.targetValue}</span>
      </div>
    ))}
  </div>
}>
  <SuggestionPill ... />
</Tooltip>
```

**Files to Modify**:
- `components/mapping/SuggestionPill.tsx`
- `utils/matching.ts` — expose reasoning data

---

### TICKET-007: Add Mapped Section with Expansion

**Problem**: Users can't see what they've already mapped or review/edit those mappings.

**Current Behavior**: "Already Assigned" section exists on right panel but is just a flat list.

**Desired Behavior**: 
- Left panel has collapsible "Mapped" section showing all completed mappings
- Each mapped item shows: source name → target name
- Clicking expands to show details and "Remove mapping" option
- For groups, shows which children were resolved

**Acceptance Criteria**:
- [ ] "Mapped" section in left panel, collapsed by default
- [ ] Shows count: "MAPPED (75)"
- [ ] Each row shows source → target pairing
- [ ] Expandable to show details
- [ ] "Remove" action available on each mapping
- [ ] Removing a group mapping also un-resolves children

**Implementation Hints**:
```tsx
// Mapped section in left panel
<CollapsibleSection 
  title={`MAPPED (${mappedCount})`}
  defaultOpen={false}
>
  {mappedLayers.map(mapping => (
    <MappedItemRow
      key={mapping.sourceId}
      source={getSourceLayer(mapping.sourceId)}
      target={getUserModel(mapping.targetId)}
      onRemove={() => handleRemoveMapping(mapping.sourceId)}
      resolvedChildren={mapping.resolvedChildren}
    />
  ))}
</CollapsibleSection>
```

**Files to Modify**:
- `components/mapping/SourceLayerList.tsx` — add Mapped section
- `components/mapping/MappedItemRow.tsx` — create new component

---

### TICKET-008: Improve Drag and Drop Feedback

**Problem**: During drag, the drop target isn't clearly highlighted. Users can't tell exactly where they can drop or what will happen.

**Current Behavior**: Drag works but drop zones aren't visually distinct.

**Desired Behavior**:
- Valid drop targets highlight with green border/glow on drag over
- Invalid targets (already mapped) show red/disabled state
- Drop preview text: "Drop to map → [target name]"
- On successful drop, brief green flash confirmation

**Acceptance Criteria**:
- [ ] Drop zone highlights green on drag over
- [ ] Invalid zones show as disabled
- [ ] Preview text shows mapping that will be created
- [ ] Success animation on drop

**Implementation Hints**:
```tsx
// Using react-dnd or similar
const [{ isOver, canDrop }, dropRef] = useDrop({
  accept: 'USER_MODEL',
  canDrop: () => !isAlreadyMapped,
  drop: (item) => handleDrop(item),
  collect: (monitor) => ({
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
});

// Styling
<div 
  ref={dropRef}
  className={cn(
    'transition-all duration-150',
    isOver && canDrop && 'ring-2 ring-green-500 bg-green-500/10',
    isOver && !canDrop && 'ring-2 ring-red-500 bg-red-500/10',
  )}
>
  {isOver && canDrop && (
    <div className="text-green-400 text-sm">
      Drop to map → {draggedItem.name}
    </div>
  )}
</div>
```

**Files to Modify**:
- `components/mapping/SourceLayerRow.tsx` — add drop zone styling
- `components/mapping/DraggableModel.tsx` — improve drag preview

---

## P2: Nice to Have (Do If Time Permits)

### TICKET-009: Add Type Filter to Right Panel

**Problem**: User has 93 models but can only see ~10 at a time. No way to filter by type.

**Desired Behavior**: Dropdown filter: "All Types", "Groups", "Spinners", "Arches", "Trees", etc.

**Acceptance Criteria**:
- [ ] Filter dropdown in right panel header
- [ ] Filters both Groups and Models sections
- [ ] "All Types" shows everything (default)
- [ ] Filter persists during session

---

### TICKET-010: Add Keyboard Shortcuts

**Problem**: Power users want to work faster without mouse.

**Desired Behavior**:
- `↑/↓` — navigate source layers
- `Enter` — accept top suggestion for selected layer
- `S` — skip selected layer
- `Ctrl+Z` — undo last action
- `?` — show shortcuts help

**Acceptance Criteria**:
- [ ] Shortcuts work as specified
- [ ] Help modal shows all shortcuts
- [ ] No conflicts with browser shortcuts

---

### TICKET-011: Add Export Summary Stats

**Problem**: Export success screen doesn't show what was accomplished.

**Desired Behavior**: Show comprehensive stats:
- Sequence coverage: X/Y layers
- Groups mapped: X (resolved Y child models)
- Direct model maps: X
- Skipped: X
- Display coverage: X% (if implemented)

**Acceptance Criteria**:
- [ ] Stats section on export success screen
- [ ] All numbers accurate
- [ ] Visual hierarchy (main stat prominent, details secondary)

---

### TICKET-012: Implement Export-Time Coverage Boost

**Problem**: User might export at 100% sequence coverage but have unmapped groups in their layout that could receive duplicate effects.

**Desired Behavior**: Before final export, if unmapped user groups exist with good matches to already-mapped source groups, show prompt:
- "3 of your groups won't have any effects. Want to map them?"
- Checkboxes for each suggestion
- "Map Selected" / "Skip" buttons
- Shows display coverage improvement

**Acceptance Criteria**:
- [ ] Prompt appears between "Export" click and actual export
- [ ] Only shows groups with ≥70% match to mapped source groups
- [ ] Checkboxes for opt-in selection
- [ ] "Skip" proceeds without changes
- [ ] "Map Selected" creates many-to-one links then exports

**Note**: See `modiq-export-coverage-boost.md` for full spec.

---

## Testing Notes

For each ticket, verify:
1. Desktop viewport (1920x1080 and 1440x900)
2. Tablet viewport (768px width) if responsive design exists
3. Interaction with keyboard (tab order, focus states)
4. Edge cases:
   - 0 source layers (empty sequence)
   - 0 user models (empty layout)  
   - 100% auto-mapped (no manual work needed)
   - 0% auto-mapped (everything needs manual mapping)
   - Groups with 1 member
   - Groups with 50+ members

---

## Definition of Done

A ticket is complete when:
- [ ] Code implemented and working locally
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Matches acceptance criteria
- [ ] Tested on desktop viewport
- [ ] Code is reasonably clean (no obvious tech debt)

