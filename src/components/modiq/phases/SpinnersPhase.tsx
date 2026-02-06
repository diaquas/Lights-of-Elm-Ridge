"use client";

import { useState, useMemo } from "react";
import { useMappingPhase } from "@/contexts/MappingPhaseContext";
import { ConfidenceBadge } from "../ConfidenceBadge";
import { PhaseEmptyState } from "../PhaseEmptyState";
import { generateMatchReasoning } from "@/lib/modiq/generateReasoning";
import type { SourceLayerMapping } from "@/hooks/useInteractiveMapping";

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  spokes: { label: "Spokes / Arms", icon: "&#128312;" },
  rings: { label: "Rings / Circles", icon: "&#11093;" },
  florals: { label: "Florals / Petals", icon: "&#127800;" },
  scallops: { label: "Scallops / Ribbons", icon: "&#127754;" },
  spirals: { label: "Spirals / Swirls", icon: "&#127744;" },
  triangles: { label: "Triangles / Wedges", icon: "&#128314;" },
  effects: { label: "Effects / Bursts", icon: "&#10024;" },
  outline: { label: "Outlines", icon: "&#128280;" },
};

type SpinnerWizardStep = "intro" | "category" | "complete";

export function SpinnersPhase() {
  const { phaseItems, goToNextPhase, interactive } = useMappingPhase();

  const [wizardStep, setWizardStep] = useState<SpinnerWizardStep>("intro");
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Group items by semantic category
  const categorizedItems = useMemo(() => {
    const groups: Record<string, SourceLayerMapping[]> = {};

    for (const item of phaseItems) {
      const cat = item.sourceModel.semanticCategory ?? "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    return Object.entries(groups)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([category, items]) => ({
        category,
        label: CATEGORY_LABELS[category]?.label ?? category,
        icon: CATEGORY_LABELS[category]?.icon ?? "&#10067;",
        items,
        mappedCount: items.filter((i) => i.isMapped).length,
      }));
  }, [phaseItems]);

  const totalSpinners = phaseItems.length;
  const mappedSpinners = phaseItems.filter((i) => i.isMapped).length;

  if (phaseItems.length === 0) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#127921;</span>}
        title="No Spinner Submodel Groups"
        description="No spinner submodel groups detected. Continue to review."
        action={{ label: "Continue to Review", onClick: goToNextPhase }}
      />
    );
  }

  // Intro screen
  if (wizardStep === "intro") {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">&#127921;</div>
            <h2 className="text-2xl font-bold text-foreground">
              Spinner Submodel Matching
            </h2>
            <p className="text-foreground/50 mt-2">
              We detected{" "}
              <span className="text-foreground font-semibold">{totalSpinners}</span>{" "}
              spinner submodel groups that need semantic matching.
            </p>
          </div>

          {/* Category Overview */}
          <div className="bg-surface rounded-xl border border-border p-6 mb-8">
            <h3 className="text-sm font-semibold text-foreground/40 uppercase tracking-wide mb-4">
              Detected Categories
            </h3>
            <div className="space-y-3">
              {categorizedItems.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between p-3 bg-foreground/3 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-2xl"
                      dangerouslySetInnerHTML={{ __html: cat.icon }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{cat.label}</div>
                      <div className="text-sm text-foreground/40">
                        {cat.items.length} groups to match
                      </div>
                    </div>
                  </div>
                  {cat.mappedCount > 0 && (
                    <span className="text-sm text-green-400">
                      {cat.mappedCount} already mapped
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-blue-400 mb-2">
              Why Semantic Matching?
            </h3>
            <p className="text-sm text-foreground/60">
              Spinner submodels use different names across vendors, but mean the
              same thing. &ldquo;Ribbons&rdquo; = &ldquo;Scallops&rdquo; = &ldquo;Petals&rdquo;. We match by
              category, not just name.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goToNextPhase}
              className="px-6 py-3 text-foreground/40 hover:text-foreground/60 transition-colors"
            >
              Skip Spinners
            </button>
            <button
              type="button"
              onClick={() => setWizardStep("category")}
              className="flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-all duration-200"
            >
              Start Matching
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All categories complete
  if (
    currentCategoryIndex >= categorizedItems.length ||
    wizardStep === "complete"
  ) {
    return (
      <PhaseEmptyState
        icon={<span className="text-5xl">&#10024;</span>}
        title="Spinner Matching Complete!"
        description={`${mappedSpinners} of ${totalSpinners} spinner submodel groups matched.`}
        action={{ label: "Continue to Review", onClick: goToNextPhase }}
      />
    );
  }

  const currentCategory = categorizedItems[currentCategoryIndex];

  const handleCategoryComplete = () => {
    if (currentCategoryIndex < categorizedItems.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    } else {
      setWizardStep("complete");
    }
  };

  const handleBack = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    } else {
      setWizardStep("intro");
    }
  };

  return (
    <SpinnerCategoryStep
      category={currentCategory}
      categoryIndex={currentCategoryIndex}
      totalCategories={categorizedItems.length}
      overallProgress={{ mapped: mappedSpinners, total: totalSpinners }}
      interactive={interactive}
      onComplete={handleCategoryComplete}
      onBack={handleBack}
      onSkipCategory={handleCategoryComplete}
    />
  );
}

// ─── Category Step ────────────────────────────────────

function SpinnerCategoryStep({
  category,
  categoryIndex,
  totalCategories,
  overallProgress,
  interactive,
  onComplete,
  onBack,
  onSkipCategory,
}: {
  category: {
    category: string;
    label: string;
    icon: string;
    items: SourceLayerMapping[];
    mappedCount: number;
  };
  categoryIndex: number;
  totalCategories: number;
  overallProgress: { mapped: number; total: number };
  interactive: ReturnType<typeof useMappingPhase>["interactive"];
  onComplete: () => void;
  onBack: () => void;
  onSkipCategory: () => void;
}) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const unmappedItems = category.items.filter((item) => !item.isMapped);

  if (unmappedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">&#9989;</div>
          <h3 className="text-xl font-semibold text-foreground">
            {category.label} Complete!
          </h3>
          <p className="text-foreground/50 mt-2">
            All {category.items.length} items in this category are mapped.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-6 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all duration-200"
          >
            Continue to Next Category
          </button>
        </div>
      </div>
    );
  }

  const currentItem = unmappedItems[currentItemIndex] ?? unmappedItems[0];

  const handleAcceptMatch = (userModelName: string) => {
    interactive.assignUserModelToLayer(currentItem.sourceModel.name, userModelName);
    if (currentItemIndex < unmappedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkipItem = () => {
    interactive.skipSourceLayer(currentItem.sourceModel.name);
    if (currentItemIndex < unmappedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      onComplete();
    }
  };

  const suggestions = interactive
    .getSuggestionsForLayer(currentItem.sourceModel)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      {/* Category Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-3xl"
              dangerouslySetInnerHTML={{ __html: category.icon }}
            />
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Matching: {category.label}
              </h2>
              <p className="text-sm text-foreground/40">
                Category {categoryIndex + 1} of {totalCategories}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-foreground/40">
            {category.items.length - unmappedItems.length} of{" "}
            {category.items.length} matched
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{
                width: `${((category.items.length - unmappedItems.length) / category.items.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-sm text-foreground/40">
            {unmappedItems.length} remaining
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Current Item */}
        <div className="w-1/2 p-6 border-r border-border flex flex-col">
          <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-4">
            Source Spinner Group
          </h3>

          <div className="bg-surface rounded-xl border border-border p-6 flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/15 text-purple-400 rounded">
                SUBMODEL_GRP
              </span>
              <span className="text-xs text-foreground/40">
                Category: {category.label}
              </span>
            </div>
            <h4 className="text-xl font-semibold text-foreground mb-2">
              {currentItem.sourceModel.name}
            </h4>
            {currentItem.memberNames.length > 0 && (
              <p className="text-sm text-foreground/40">
                {currentItem.memberNames.length} members
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSkipItem}
            className="mt-4 w-full py-3 text-foreground/40 hover:text-foreground/60 border border-border hover:border-foreground/20 rounded-lg transition-colors"
          >
            Skip This Item
          </button>
        </div>

        {/* Right: Semantic Matches */}
        <div className="w-1/2 p-6 flex flex-col">
          <h3 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wide mb-4">
            Best Semantic Matches
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3">
            {suggestions.length === 0 ? (
              <div className="text-center py-8 text-foreground/30">
                <p className="text-sm">No semantic matches found.</p>
                <button
                  type="button"
                  onClick={handleSkipItem}
                  className="mt-4 text-accent hover:text-accent/80"
                >
                  Skip or manually match later
                </button>
              </div>
            ) : (
              suggestions.map((match, index) => {
                const reasoning = generateMatchReasoning(
                  match.factors,
                  match.score,
                );
                return (
                  <button
                    key={match.model.name}
                    type="button"
                    onClick={() => handleAcceptMatch(match.model.name)}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all duration-200
                      ${index === 0
                        ? "bg-green-500/8 border-2 border-green-500/25 hover:border-green-500/40"
                        : "bg-surface border border-border hover:border-foreground/20"}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/15 text-green-400 rounded">
                            BEST MATCH
                          </span>
                        )}
                        <span className="font-medium text-foreground">
                          {match.model.name}
                        </span>
                      </div>
                      <ConfidenceBadge
                        score={match.score}
                        reasoning={reasoning}
                        size="sm"
                      />
                    </div>
                    <div className="text-sm text-foreground/40">
                      {reasoning.summary}
                    </div>
                    <div className="mt-2 text-xs text-foreground/25 flex items-center gap-1">
                      Click to accept this match
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-3 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="text-sm text-foreground/40">
          Overall: {overallProgress.mapped}/{overallProgress.total} spinners
          matched
        </div>

        <button
          type="button"
          onClick={onSkipCategory}
          className="px-4 py-2 text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          Skip Entire Category &rarr;
        </button>
      </div>
    </div>
  );
}
