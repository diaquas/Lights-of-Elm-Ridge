interface SequenceCardOverlayProps {
  category: 'Halloween' | 'Christmas';
  backgroundImage?: string;
  yearAdded: number;
  hasVideo: boolean; // true = ready sequence, false = coming soon
}

export default function SequenceCardOverlay({
  category,
  backgroundImage,
  yearAdded,
  hasVideo
}: SequenceCardOverlayProps) {
  const isHalloween = category === 'Halloween';
  const isNew = yearAdded === 2026;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background image layer */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay - stronger for coming soon, lighter for ready */}
      <div className={`absolute inset-0 ${
        hasVideo
          ? // Ready sequence - subtle gradient at bottom for text legibility
            'bg-gradient-to-t from-black/70 via-black/20 to-transparent'
          : // Coming soon - stronger overlay
            isHalloween
              ? 'bg-gradient-to-br from-orange-900/70 via-purple-900/60 to-black/80'
              : 'bg-gradient-to-br from-red-900/70 via-green-900/60 to-black/80'
      }`} />

      {hasVideo ? (
        // Ready sequence overlay - year badge in corner
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-end justify-between">
            {/* Year badge */}
            <div className={`px-3 py-1.5 rounded-lg backdrop-blur-sm ${
              isHalloween
                ? 'bg-orange-500/30 border border-orange-400/40'
                : 'bg-green-500/30 border border-green-400/40'
            }`}>
              <span className={`text-xs font-bold tracking-wide ${
                isHalloween ? 'text-orange-300' : 'text-green-300'
              }`}>
                {isNew ? '✨ NEW 2026' : `SINCE ${yearAdded}`}
              </span>
            </div>

            {/* Play indicator */}
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:bg-white/40 transition-colors">
              <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        // Coming soon overlay
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Dashed border */}
          <div className={`absolute inset-4 border-2 border-dashed ${
            isHalloween ? 'border-orange-500/30' : 'border-red-500/30'
          } rounded-lg`} />

          {/* Main content */}
          <div className="relative text-center px-4">
            <div className="text-5xl mb-2">
              {isHalloween ? '👻' : '🎅'}
            </div>

            <div className={`font-bold text-lg tracking-wider ${
              isHalloween
                ? 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]'
                : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'
            }`}>
              COMING SOON
            </div>

            <div className="text-xs text-white/70 mt-1">
              Preview in the works
            </div>
          </div>

          {/* Decorative elements */}
          {isHalloween ? (
            <>
              <div className="absolute top-3 left-3 text-lg opacity-40">🕸️</div>
              <div className="absolute bottom-3 right-3 text-lg opacity-40">🦇</div>
            </>
          ) : (
            <>
              <div className="absolute top-3 left-3 text-lg opacity-40">❄️</div>
              <div className="absolute bottom-3 right-3 text-lg opacity-40">🎄</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
