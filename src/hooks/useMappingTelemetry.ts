"use client";

import { useCallback, useEffect, useRef } from "react";

export type MappingAction =
  | "drag_map"
  | "click_map"
  | "remap"
  | "swap"
  | "skip"
  | "unskip"
  | "submodel_remap"
  | "accept_suggestion"
  | "export";

export type MappingMethod =
  | "drag_drop"
  | "dropdown_pick"
  | "suggestion_click"
  | "swap_gesture";

export interface MappingEvent {
  event: "mapping_action";
  session: string;
  sequenceSlug: string;
  timestamp: string;
  action: MappingAction;
  sourceModel?: {
    name: string;
    type: string;
    pixels: number;
  };
  targetModel?: {
    name: string;
    displayAs: string;
    pixels: number;
  };
  previousMapping: string | null;
  aiConfidence: number | null;
  aiSuggested: string | null;
  method: MappingMethod;
}

export interface TelemetryAggregate {
  totalActions: number;
  autoMapsAccepted: number;
  autoMapsChanged: number;
  remapCorrections: number;
  swapCorrections: number;
  skippedModels: number;
  dragActions: number;
  clickActions: number;
  suggestionActions: number;
  startTime: number;
  exportTime: number | null;
}

export interface MappingTelemetry {
  trackAction: (
    event: Omit<MappingEvent, "event" | "session" | "timestamp">,
  ) => void;
  getAggregate: () => TelemetryAggregate;
  getSessionId: () => string;
}

export function useMappingTelemetry(sequenceSlug: string): MappingTelemetry {
  const sessionId = useRef(crypto.randomUUID());
  const events = useRef<MappingEvent[]>([]);
  const aggregate = useRef<TelemetryAggregate>({
    totalActions: 0,
    autoMapsAccepted: 0,
    autoMapsChanged: 0,
    remapCorrections: 0,
    swapCorrections: 0,
    skippedModels: 0,
    dragActions: 0,
    clickActions: 0,
    suggestionActions: 0,
    startTime: 0,
    exportTime: null,
  });
  useEffect(() => {
    aggregate.current.startTime = Date.now();
  }, []);

  const trackAction = useCallback(
    (partial: Omit<MappingEvent, "event" | "session" | "timestamp">) => {
      const fullEvent: MappingEvent = {
        event: "mapping_action",
        session: sessionId.current,
        timestamp: new Date().toISOString(),
        ...partial,
      };
      events.current.push(fullEvent);

      // Update aggregates
      const agg = aggregate.current;
      agg.totalActions++;

      switch (partial.action) {
        case "drag_map":
          agg.dragActions++;
          break;
        case "click_map":
          agg.clickActions++;
          break;
        case "accept_suggestion":
          agg.suggestionActions++;
          break;
        case "remap":
          agg.remapCorrections++;
          agg.autoMapsChanged++;
          break;
        case "swap":
          agg.swapCorrections++;
          break;
        case "skip":
          agg.skippedModels++;
          break;
        case "export":
          agg.exportTime = Date.now();
          break;
      }
    },
    [],
  );

  const getAggregate = useCallback(() => {
    return { ...aggregate.current };
  }, []);

  const getSessionId = useCallback(() => sessionId.current, []);

  return { trackAction, getAggregate, getSessionId };
}
