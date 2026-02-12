# Ticket 18: Bulk Inference from User Patterns

## 🎯 Objective
Learn from user's mapping choices and offer to bulk-apply similar mappings, dramatically reducing manual work.

## 📋 Problem Statement
From UX walkthrough:
- "As soon as we start to understand their pattern of what they're saying equals what, we should be able to then bulk infer their next 20 actions"
- "If I said S Big Y from my Showstoppers spinner group, and I map it to Odyssey Triangle... we should immediately filter down and show you all the Showstoppers and all the other Odyssey stuff next to each other"
- "You mapped Showstopper to Odyssey once. I'm going to show you all the Showstoppers and all the Odyssey stuff"
- "Do you want me to take a stab at bulk mapping the Showstoppers? You can review when we're done"
- "We see 7 other Mini Trees. Do you want to apply the same logic to all the other Mini Pumpkins?"

## 🔧 Pattern Detection

### 1. Name Family Detection
```tsx
interface NameFamily {
  prefix: string;      // "Mini Pumpkin", "Showstopper", "S - "
  items: string[];     // All items with this prefix
  numbers: number[];   // Extracted numbers [1, 2, 3, ...]
}

function detectFamilies(items: string[]): NameFamily[] {
  const familyMap = new Map<string, NameFamily>();
  
  for (const item of items) {
    const { prefix, number } = parseItemName(item);
    
    if (!familyMap.has(prefix)) {
      familyMap.set(prefix, { prefix, items: [], numbers: [] });
    }
    
    const family = familyMap.get(prefix)!;
    family.items.push(item);
    if (number !== null) family.numbers.push(number);
  }
  
  return Array.from(familyMap.values())
    .filter(f => f.items.length > 1); // Only families with multiple items
}

function parseItemName(name: string): { prefix: string; number: number | null } {
  // "Mini Pumpkin 8" → { prefix: "Mini Pumpkin", number: 8 }
  // "S - Big Y" → { prefix: "S - Big Y", number: null }
  const match = name.match(/^(.+?)\s*(\d+)?\s*$/);
  return {
    prefix: match?.[1]?.trim() || name,
    number: match?.[2] ? parseInt(match[2]) : null,
  };
}
```

### 2. Mapping Pattern Detection
```tsx
interface MappingPattern {
  userFamily: string;      // "Mini Pumpkin"
  sequenceFamily: string;  // "Mini Tree"
  confidence: number;      // How sure we are
  examples: Array<{        // Evidence
    userItem: string;
    sequenceItem: string;
  }>;
}

function detectMappingPattern(
  userItem: string,
  sequenceItem: string,
  existingPatterns: MappingPattern[]
): MappingPattern | null {
  const userFamily = parseItemName(userItem).prefix;
  const seqFamily = parseItemName(sequenceItem).prefix;
  
  // Check if this confirms an existing pattern
  const existing = existingPatterns.find(p => 
    p.userFamily === userFamily && p.sequenceFamily === seqFamily
  );
  
  if (existing) {
    // Strengthen the pattern
    existing.examples.push({ userItem, sequenceItem });
    existing.confidence = Math.min(100, existing.confidence + 20);
    return existing;
  }
  
  // Create new potential pattern
  return {
    userFamily,
    sequenceFamily,
    confidence: 60, // Initial confidence
    examples: [{ userItem, sequenceItem }],
  };
}
```

### 3. Bulk Suggestion UI
```tsx
function BulkMappingSuggestion({ 
  pattern, 
  unmappedUserItems, 
  availableSeqItems,
  onAccept,
  onDismiss 
}: Props) {
  // Find matching pairs
  const suggestedMappings = unmappedUserItems
    .filter(item => parseItemName(item).prefix === pattern.userFamily)
    .map(userItem => {
      const userNum = parseItemName(userItem).number;
      const seqItem = availableSeqItems.find(s => {
        const seqParsed = parseItemName(s);
        return seqParsed.prefix === pattern.sequenceFamily && 
               seqParsed.number === userNum;
      });
      return { userItem, sequenceItem: seqItem };
    })
    .filter(m => m.sequenceItem); // Only where we found a match
  
  if (suggestedMappings.length === 0) return null;
  
  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Sparkles className="h-4 w-4" />
      <AlertTitle>Bulk Mapping Detected!</AlertTitle>
      <AlertDescription>
        <p>
          You mapped <strong>{pattern.userFamily}</strong> → 
          <strong>{pattern.sequenceFamily}</strong>
        </p>
        <p className="mt-2">
          Found {suggestedMappings.length} more similar items. 
          Apply the same pattern?
        </p>
        
        {/* Preview */}
        <div className="mt-3 max-h-32 overflow-auto text-sm">
          {suggestedMappings.slice(0, 5).map(m => (
            <div key={m.userItem} className="flex justify-between">
              <span>{m.userItem}</span>
              <span>→</span>
              <span>{m.sequenceItem}</span>
            </div>
          ))}
          {suggestedMappings.length > 5 && (
            <div className="text-muted-foreground">
              ...and {suggestedMappings.length - 5} more
            </div>
          )}
        </div>
        
        <div className="mt-4 flex gap-2">
          <Button onClick={() => onAccept(suggestedMappings)}>
            Apply All ({suggestedMappings.length})
          </Button>
          <Button variant="outline" onClick={onDismiss}>
            No, I'll do it manually
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
```

## 📐 Flow Diagram

```
User Action                          System Response
───────────────────────────────────────────────────────────────────

1. User maps "Mini Pumpkin 8"    →   Record mapping
   to "Mini Tree 8"                  Detect pattern: "Mini Pumpkin" → "Mini Tree"
                                     
2. System detects 7 more         →   Show bulk suggestion:
   Mini Pumpkins unmapped            ┌────────────────────────────────────┐
   AND 7 more Mini Trees             │ 🎯 Bulk Mapping Detected!          │
   available                         │                                    │
                                     │ You mapped Mini Pumpkin → Mini Tree│
                                     │                                    │
                                     │ Found 7 more similar items:        │
                                     │ • Mini Pumpkin 1 → Mini Tree 1     │
                                     │ • Mini Pumpkin 2 → Mini Tree 2     │
                                     │ • ...                              │
                                     │                                    │
                                     │ [Apply All (7)] [No thanks]        │
                                     └────────────────────────────────────┘

3. User clicks "Apply All"       →   Bulk apply mappings
                                     Update counters
                                     Auto-advance to next family
```

## 🔧 Advanced Pattern: Parent Model Matching

For High Density (submodel groups), detect parent model patterns:

```tsx
// "S - Big Y" comes from "Spinner - Showstopper 1"
// If user maps to "Odyssey Triangle", offer:
// "Map all Showstopper submodel groups to Odyssey?"

function detectParentPattern(
  userSubmodelGroup: string,
  sequenceItem: string,
  userLayout: ParsedLayout
): ParentPattern | null {
  // Find which model this submodel group references
  const parentModels = findParentModels(userSubmodelGroup, userLayout);
  
  if (parentModels.length === 0) return null;
  
  // "S - Big Y" references "Spinner - Showstopper 1, 2, 3"
  // User mapped to "Odyssey Triangle"
  // Pattern: Showstopper → Odyssey
  
  return {
    userParentFamily: extractFamily(parentModels[0]), // "Showstopper"
    sequenceFamily: extractFamily(sequenceItem),       // "Odyssey"
    affectedGroups: findAllGroupsForParent(parentModels, userLayout),
  };
}
```

## ✅ Acceptance Criteria

- [ ] Detects name family patterns (prefix + number)
- [ ] After first mapping, checks for bulk opportunity
- [ ] Shows preview of suggested bulk mappings
- [ ] "Apply All" creates all mappings at once
- [ ] "No thanks" dismisses and continues manual flow
- [ ] Updates counters correctly after bulk apply
- [ ] Works for numbered items (Mini Pumpkin 1-8)
- [ ] Works for High Density parent model patterns
- [ ] Doesn't suggest if no clear pattern exists
- [ ] Respects already-used items (doesn't double-map)

## 🧪 Test Cases

1. **Basic pattern**: Map "Arch 1" → "Arches 1", verify suggestion for Arch 2-8
2. **Apply all**: Accept bulk, verify all mappings created
3. **Decline**: Decline bulk, verify manual flow continues
4. **Partial match**: 5 user items, only 3 sequence items available, suggest 3
5. **No pattern**: Map "Arch 1" → "Random Thing", no bulk suggestion
6. **Already used**: Some sequence items already used, exclude from suggestion
7. **High Density**: Map Showstopper subgroup to Odyssey, suggest parent pattern

## ⚠️ Edge Cases

### Ambiguous Patterns
```tsx
// User maps "Tree 1" → "Mini Tree 1"
// But there's also "Big Tree 1" in sequence
// Don't auto-suggest, or show with lower confidence

if (multipleMatchingFamilies) {
  pattern.confidence = Math.min(pattern.confidence, 40);
  // Only show if user confirms
}
```

### User Corrects Mistake
```tsx
// User applied bulk, then undoes one
// Don't re-suggest the same pattern immediately

const recentlyDeclined = new Set<string>();

function shouldSuggestPattern(pattern: MappingPattern): boolean {
  const key = `${pattern.userFamily}:${pattern.sequenceFamily}`;
  return !recentlyDeclined.has(key);
}
```

## 🏷️ Labels
- Priority: **HIGH**
- Type: Feature
- Phase: All mapping phases
- Effort: High (4-6 hours)
- Dependencies: Ticket 15 (exclude matched items)
