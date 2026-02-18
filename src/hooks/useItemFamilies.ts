"use client";

import { useMemo, useState } from "react";
import { extractFamily } from "@/contexts/MappingPhaseContext";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

export interface ItemFamily {
  prefix: string;
  items: SourceLayerMapping[];
}

/**
 * Groups items by name family prefix and manages accordion expand/collapse.
 *
 * "Mini Pumpkin 1", "Mini Pumpkin 2", "Mini Pumpkin 3" → single family "Mini Pumpkin" (3)
 * "Window - Avery" → single-item family, rendered flat (no accordion header)
 */
export function useItemFamilies(
  items: SourceLayerMapping[],
  selectedId: string | null,
) {
  const families = useMemo(() => {
    const map = new Map<string, SourceLayerMapping[]>();
    for (const item of items) {
      const prefix = extractFamily(item.sourceModel.name);
      const existing = map.get(prefix);
      if (existing) {
        existing.push(item);
      } else {
        map.set(prefix, [item]);
      }
    }
    return Array.from(map.entries()).map(([prefix, familyItems]) => ({
      prefix,
      items: familyItems,
    }));
  }, [items]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand family containing selected item (derived state, not effect)
  const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
  if (prevSelectedId !== selectedId) {
    setPrevSelectedId(selectedId);
    if (selectedId) {
      const family = families.find((f) =>
        f.items.some((i) => i.sourceModel.name === selectedId),
      );
      if (family && family.items.length > 1 && !expanded.has(family.prefix)) {
        setExpanded((prev) => new Set([...prev, family.prefix]));
      }
    }
  }

  const toggle = (prefix: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  };

  const isExpanded = (prefix: string) => expanded.has(prefix);

  return { families, toggle, isExpanded };
}
