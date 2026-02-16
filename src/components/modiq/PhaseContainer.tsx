"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { IndividualsPhase } from "./phases/IndividualsPhase";
import { SpinnersPhase } from "./phases/SpinnersPhase";
import { FinalizePhase } from "./phases/FinalizePhase";
import { ReviewPhase, type ReviewPhaseProps } from "./phases/ReviewPhase";
import { CoachMarkOverlay } from "./CoachMarkOverlay";
import { KeyboardShortcutBar } from "./KeyboardShortcutBar";

interface PhaseContainerProps {
  /** Props forwarded to ReviewPhase (export handlers, titles, etc.) */
  reviewProps: ReviewPhaseProps;
}

export function PhaseContainer({ reviewProps }: PhaseContainerProps) {
  const { currentPhase } = useMappingPhase();

  const isMappingPhase = currentPhase !== "review";

  let content: React.ReactNode;
  switch (currentPhase) {
    case "individuals":
      content = <IndividualsPhase />;
      break;
    case "spinners":
      content = <SpinnersPhase />;
      break;
    case "finalize":
      content = <FinalizePhase />;
      break;
    case "review":
      content = <ReviewPhase {...reviewProps} />;
      break;
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">{content}</div>
      {isMappingPhase && <KeyboardShortcutBar />}
      {isMappingPhase && <CoachMarkOverlay />}
    </div>
  );
}
