# Ticket 15: Exclude Matched Items from Future Suggestions

## 🎯 Objective
Once an item is matched, remove it from appearing as a top suggestion for other items. Users can still manually search and re-use if needed.

## 📋 Problem Statement
From UX walkthrough:
- "Whenever I choose the best match, or any match for that matter, that match needs to be immediately excluded from future matches"
- "Say HouseCenter or HouseLeft is also the top match for the next one. No, you already used HouseLeft"
- "Now we gotta reshuffle and say, here's the next top match for this next item"
- "They can always search and add it a second time to something, but it needs to not become the top match ever again"

## 🔧 Implementation

### 1. Track Used Matches
```tsx
interface MappingState {
  // Set of sequence items already used
  usedMatches: Set<string>;
  
  // Map of user item -> sequence item
  mappings: Map<string, string>;
}

function handleMatch(userItem: string, sequenceItem: string) {
  setState(prev => ({
    ...prev,
    usedMatches: new Set([...prev.usedMatches, sequenceItem]),
    mappings: new Map([...prev.mappings, [userItem, sequenceItem]]),
  }));
}
```

### 2. Filter Suggestions
```tsx
function getSuggestionsForItem(
  userItem: string,
  allSequenceItems: string[],
  usedMatches: Set<string>
): Suggestion[] {
  // Get all potential matches with scores
  const allSuggestions = calculateSimilarityScores(userItem, allSequenceItems);
  
  // Filter out already-used items from AUTO-SUGGESTIONS
  const availableSuggestions = allSuggestions.filter(
    s => !usedMatches.has(s.sequenceItem)
  );
  
  // Return top N available suggestions
  return availableSuggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
```

### 3. Search Still Shows All (With Indicators)
```tsx
function SearchResults({ 
  query, 
  allItems, 
  usedMatches 
}: SearchProps) {
  const results = searchItems(query, allItems);
  
  return (
    <ul>
      {results.map(item => (
        <li key={item.name} className={usedMatches.has(item.name) ? 'opacity-50' : ''}>
          {item.name}
          {usedMatches.has(item.name) && (
            <Badge variant="outline" className="ml-2">
              Already used
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
```

### 4. Visual Feedback on Match
```tsx
// When user makes a match, show it being "consumed"
function MatchAnimation({ item }: { item: string }) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      ✓ {item} matched
    </motion.div>
  );
}
```

## 📐 Flow Diagram

```
User's Items          Suggestions (filtered)       All Sequence Items
─────────────         ─────────────────────        ──────────────────
                                                   
Arch 1         →      1. Arch Group (98%)          Arch Group ✓ (used)
                      2. Arches Left (85%)         Arches Left
                      3. Arches Right (82%)        Arches Right
                                                   Mini Trees
                      ↓ User picks "Arch Group"    House Center
                                                   House Left
Arch 2         →      1. Arches Left (85%)    ←── Arch Group REMOVED
                      2. Arches Right (82%)        from suggestions!
                      3. Mini Arches (70%)
                                                   
                      (Can still search and        
                       find "Arch Group" if        
                       really needed)              
```

## 🔧 State Management

```tsx
// Using Zustand or similar
interface MappingStore {
  // Core state
  usedMatches: Set<string>;
  mappings: Map<string, string>;
  
  // Actions
  addMapping: (userItem: string, seqItem: string) => void;
  removeMapping: (userItem: string) => void;
  isUsed: (seqItem: string) => boolean;
  
  // Computed
  getAvailableSuggestions: (userItem: string) => Suggestion[];
}

const useMappingStore = create<MappingStore>((set, get) => ({
  usedMatches: new Set(),
  mappings: new Map(),
  
  addMapping: (userItem, seqItem) => {
    set(state => ({
      usedMatches: new Set([...state.usedMatches, seqItem]),
      mappings: new Map([...state.mappings, [userItem, seqItem]]),
    }));
  },
  
  removeMapping: (userItem) => {
    const seqItem = get().mappings.get(userItem);
    if (!seqItem) return;
    
    set(state => {
      const newUsed = new Set(state.usedMatches);
      newUsed.delete(seqItem);
      const newMappings = new Map(state.mappings);
      newMappings.delete(userItem);
      return { usedMatches: newUsed, mappings: newMappings };
    });
  },
  
  isUsed: (seqItem) => get().usedMatches.has(seqItem),
  
  getAvailableSuggestions: (userItem) => {
    // ... filtering logic
  },
}));
```

## ✅ Acceptance Criteria

- [ ] Matched sequence items don't appear as top suggestions anymore
- [ ] Suggestions dynamically re-rank when items are used
- [ ] Search still shows all items (with "already used" indicator)
- [ ] Users CAN re-use an item if they explicitly search for it
- [ ] Undo/remove mapping makes item available again
- [ ] Works across all phases (Groups, Models, High Density)
- [ ] State persists during session (navigation doesn't reset)

## 🧪 Test Cases

1. **Basic exclusion**: Match A→X, verify X not suggested for B
2. **Re-ranking**: Match A→X (was #1 for B), verify B now shows Y as #1
3. **Search override**: Match A→X, search "X" for B, still appears (grayed)
4. **Undo**: Match A→X, undo, verify X appears in suggestions again
5. **Cross-phase**: Match in Groups, verify excluded in Models too (if same pool)
6. **Edge case**: All suggestions used, show "No suggestions - search to find matches"

## ⚠️ Edge Cases

### All Top Suggestions Used
```tsx
if (availableSuggestions.length === 0) {
  return (
    <EmptyState>
      <p>All top matches have been used.</p>
      <p>Search to find more options, or skip this item.</p>
      <SearchInput placeholder="Search sequence items..." />
    </EmptyState>
  );
}
```

### Many-to-One Mapping (Rare but Valid)
Some users might legitimately want to map multiple items to one sequence item:
```tsx
// In search results, allow re-use with confirmation
<Button 
  onClick={() => {
    if (isUsed(item)) {
      confirmDialog("This item is already mapped. Use it again?")
        .then(() => handleMatch(item));
    } else {
      handleMatch(item);
    }
  }}
>
  {isUsed(item) ? "Use Again" : "Select"}
</Button>
```

## 🏷️ Labels
- Priority: **HIGH**
- Type: Feature
- Phase: All mapping phases
- Effort: Medium (3-4 hours)
