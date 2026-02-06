"use client";

interface PhaseEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PhaseEmptyState({ icon, title, description, action }: PhaseEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-5">{icon}</div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-foreground/50 mt-2">{description}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 px-6 py-2.5 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-all duration-200"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
