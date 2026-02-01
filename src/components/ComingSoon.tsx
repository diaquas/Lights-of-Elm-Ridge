interface ComingSoonProps {
  category: 'Halloween' | 'Christmas';
  backgroundImage?: string; // Optional thumbnail to show underneath with transparency
}

export default function ComingSoon({ category, backgroundImage }: ComingSoonProps) {
  const isHalloween = category === 'Halloween';

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Background image layer (if provided) */}
      {backgroundImage && (
        <img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${
        backgroundImage
          ? isHalloween
            ? 'bg-gradient-to-br from-orange-900/70 via-purple-900/60 to-black/80'
            : 'bg-gradient-to-br from-red-900/70 via-green-900/60 to-black/80'
          : isHalloween
            ? 'bg-gradient-to-br from-orange-900/40 via-purple-900/30 to-black/50'
            : 'bg-gradient-to-br from-red-900/40 via-green-900/30 to-black/50'
      }`}>
        {/* Spooky/Festive border effect */}
        <div className={`absolute inset-4 border-2 border-dashed ${
          isHalloween ? 'border-orange-500/30' : 'border-red-500/30'
        } rounded-lg`} />

        {/* Main content */}
        <div className="relative text-center px-4">
          {/* Icon */}
          <div className="text-5xl mb-2">
            {isHalloween ? '👻' : '🎅'}
          </div>

          {/* Coming Soon text with glow effect */}
          <div className={`font-bold text-lg tracking-wider ${
            isHalloween
              ? 'text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]'
              : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'
          }`}>
            COMING SOON
          </div>

          {/* Subtitle */}
          <div className="text-xs text-white/70 mt-1">
            Preview in the works
          </div>
        </div>

        {/* Decorative elements */}
        {isHalloween && (
          <>
            <div className="absolute top-3 left-3 text-lg opacity-40">🕸️</div>
            <div className="absolute bottom-3 right-3 text-lg opacity-40">🦇</div>
          </>
        )}
        {!isHalloween && (
          <>
            <div className="absolute top-3 left-3 text-lg opacity-40">❄️</div>
            <div className="absolute bottom-3 right-3 text-lg opacity-40">🎄</div>
          </>
        )}
      </div>
    </div>
  );
}
