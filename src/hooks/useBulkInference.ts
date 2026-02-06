"use client";

import { useState, useCallback } from "react";
import { extractFamily } from "@/contexts/MappingPhaseContext";
import type { InteractiveMappingState, SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export interface BulkPair {
  sourceName: string;
  destName: string;
}

export interface BulkSuggestion {
  sourceFamily: string;
  destFamily: string;
  pairs: BulkPair[];
}

function extractNumber(name: string): number | null {
  const match = name.match(/\s*(\d+)\s*$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detects name-family patterns after each mapping and offers bulk-apply.
 *
 * Example: user maps "Mini Pumpkin 3" → "Mini Tree 3".
 * Hook detects 7 more Mini Pumpkins and 7 Mini Trees, offers to map them all.
 */
export function useBulkInference(
  interactive: InteractiveMappingState,
  phaseItems: SourceLayerMapping[],
) {
  const [suggestion, setSuggestion] = useState<BulkSuggestion | null>(null);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  const checkForPattern = useCallback(
    (sourceName: string, destName: string) => {
      const sourceFamily = extractFamily(sourceName);
      const destFamily = extractFamily(destName);
      const sourceNum = extractNumber(sourceName);
      const destNum = extractNumber(destName);

      // Only suggest when both items have matching trailing numbers
      if (sourceNum === null || destNum === null || sourceNum !== destNum) {
        setSuggestion(null);
        return;
      }

      const key = `${sourceFamily}→${destFamily}`;
      if (dismissedKeys.has(key)) {
        setSuggestion(null);
        return;
      }

      // Unmapped siblings in same source family (exclude the item just mapped)
      const siblings = phaseItems.filter(
        (item) =>
          !item.isMapped &&
          item.sourceModel.name !== sourceName &&
          extractFamily(item.sourceModel.name) === sourceFamily &&
          extractNumber(item.sourceModel.name) !== null,
      );

      if (siblings.length === 0) {
        setSuggestion(null);
        return;
      }

      // Available dest items in same dest family (exclude just-assigned + globally assigned)
      const availableDests = interactive.allDestModels.filter(
        (m) =>
          !interactive.assignedUserModelNames.has(m.name) &&
          m.name !== destName &&
          extractFamily(m.name) === destFamily &&
          extractNumber(m.name) !== null,
      );

      // Match by number
      const pairs: BulkPair[] = [];
      for (const sibling of siblings) {
        const num = extractNumber(sibling.sourceModel.name);
        const dest = availableDests.find((d) => extractNumber(d.name) === num);
        if (dest) {
          pairs.push({
            sourceName: sibling.sourceModel.name,
            destName: dest.name,
          });
        }
      }

      if (pairs.length === 0) {
        setSuggestion(null);
        return;
      }

      // Sort by number for clean preview
      pairs.sort((a, b) => {
        const numA = extractNumber(a.sourceName) ?? 0;
        const numB = extractNumber(b.sourceName) ?? 0;
        return numA - numB;
      });

      setSuggestion({ sourceFamily, destFamily, pairs });
    },
    [phaseItems, interactive.allDestModels, interactive.assignedUserModelNames, dismissedKeys],
  );

  const acceptAll = useCallback(() => {
    if (!suggestion) return;
    for (const pair of suggestion.pairs) {
      interactive.assignUserModelToLayer(pair.sourceName, pair.destName);
    }
    setSuggestion(null);
  }, [suggestion, interactive]);

  const dismiss = useCallback(() => {
    if (!suggestion) return;
    setDismissedKeys(
      (prev) => new Set([...prev, `${suggestion.sourceFamily}→${suggestion.destFamily}`]),
    );
    setSuggestion(null);
  }, [suggestion]);

  return { suggestion, checkForPattern, acceptAll, dismiss };
}
