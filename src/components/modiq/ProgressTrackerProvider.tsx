"use client";

import { useState, useCallback } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { useProgressTracker } from "@/hooks/useProgressTracker";
import { PhaseStepper } from "./PhaseStepper";
import { ProgressDetailsModal } from "./ProgressDetailsModal";

/**
 * Renders PhaseStepper + ProgressDetailsModal with the progress tracker state
 * wired up from MappingPhaseContext. Must be rendered inside MappingPhaseProvider.
 */
export function ProgressTrackerProvider() {
  const { interactive, currentPhase, getPhaseItems } = useMappingPhase();
  const progressState = useProgressTracker(interactive, currentPhase, getPhaseItems);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  return (
    <>
      <PhaseStepper
        progressState={progressState}
        onOpenProgressModal={openModal}
      />
      <ProgressDetailsModal
        state={progressState}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
}
