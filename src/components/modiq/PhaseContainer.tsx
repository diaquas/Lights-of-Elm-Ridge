"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { AutoAcceptPhase } from "./phases/AutoAcceptPhase";
import { GroupsPhase } from "./phases/GroupsPhase";
import { IndividualsPhase } from "./phases/IndividualsPhase";
import { SpinnersPhase } from "./phases/SpinnersPhase";
import { FinalizePhase } from "./phases/FinalizePhase";
import { ReviewPhase, type ReviewPhaseProps } from "./phases/ReviewPhase";

interface PhaseContainerProps {
  /** Props forwarded to ReviewPhase (export handlers, titles, etc.) */
  reviewProps: ReviewPhaseProps;
}

export function PhaseContainer({ reviewProps }: PhaseContainerProps) {
  const { currentPhase } = useMappingPhase();

  let content: React.ReactNode;
  switch (currentPhase) {
    case "auto-accept":
      content = <AutoAcceptPhase />;
      break;
    case "groups":
      content = <GroupsPhase />;
      break;
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

  return <div className="h-full overflow-hidden">{content}</div>;
}
