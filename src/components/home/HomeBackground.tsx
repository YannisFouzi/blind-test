const PARTICLES = [
  { top: 8, left: 12, size: 6, opacity: 0.35 },
  { top: 22, left: 78, size: 8, opacity: 0.25 },
  { top: 35, left: 28, size: 5, opacity: 0.3 },
  { top: 48, left: 62, size: 7, opacity: 0.28 },
  { top: 66, left: 18, size: 6, opacity: 0.32 },
  { top: 82, left: 74, size: 5, opacity: 0.22 },
  { top: 15, left: 52, size: 9, opacity: 0.26 },
  { top: 58, left: 86, size: 6, opacity: 0.24 },
  { top: 72, left: 42, size: 7, opacity: 0.3 },
  { top: 90, left: 58, size: 5, opacity: 0.2 },
  { top: 32, left: 6, size: 6, opacity: 0.28 },
  { top: 12, left: 92, size: 8, opacity: 0.18 },
] as const;

export const HomeBackground = () => (
  <>
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.top}-${particle.left}-${index}`}
          className="absolute rounded-full bg-white/30 blur-[1px] transition-transform duration-700 will-change-transform"
          style={{
            top: `${particle.top}%`,
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.opacity,
          }}
        />
      ))}
    </div>

    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-[120px]" />
      <div className="absolute top-3/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-1/3 w-56 h-56 bg-pink-500/10 rounded-full blur-[120px]" />
    </div>

    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_60%)] opacity-40" />
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/40 backdrop-blur-[1px]" />
  </>
);
