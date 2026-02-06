"use client";

import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { AutoAcceptPhase } from "./phases/AutoAcceptPhase";
import { GroupsPhase } from "./phases/GroupsPhase";
import { IndividualsPhase } from "./phases/IndividualsPhase";
import { SpinnersPhase } from "./phases/SpinnersPhase";
import { ReviewPhase, type ReviewPhaseProps } from "./phases/ReviewPhase";

interface PhaseContainerProps {
  /** Props forwarded to ReviewPhase (export handlers, titles, etc.) */
  reviewProps: ReviewPhaseProps;
}

export function PhaseContainer({ reviewProps }: PhaseContainerProps) {
  const { currentPhase } = useMappingPhase();

  switch (currentPhase) {
    case "auto-accept":
      return <AutoAcceptPhase />;
    case "groups":
      return <GroupsPhase />;
    case "individuals":
      return <IndividualsPhase />;
    case "spinners":
      return <SpinnersPhase />;
    case "review":
      return <ReviewPhase {...reviewProps} />;
  }
}
