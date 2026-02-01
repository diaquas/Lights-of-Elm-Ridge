interface ColorChipsProps {
  colors: string[];
  size?: 'sm' | 'md';
}

export default function ColorChips({ colors, size = 'sm' }: ColorChipsProps) {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex gap-1">
      {colors.slice(0, 3).map((color, index) => (
        <div
          key={index}
          className={`${sizeClasses} rounded-full border border-white/20 shadow-sm`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
