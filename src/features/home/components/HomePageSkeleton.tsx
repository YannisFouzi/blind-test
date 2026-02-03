"use client";

/**
 * Skeleton pour la HomePage.
 * Conserve la structure du layout final pour limiter le CLS.
 */
const SKELETON_CARD_KEYS = [
  "skeleton-1",
  "skeleton-2",
  "skeleton-3",
  "skeleton-4",
  "skeleton-5",
  "skeleton-6",
];

export function HomePageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="text-center mb-16 animate-pulse">
        <div className="h-20 w-96 bg-black/10 rounded-lg mx-auto mb-6" />
        <div className="h-6 w-[500px] bg-black/10 rounded mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full px-4">
        {SKELETON_CARD_KEYS.map((key) => (
          <div
            key={key}
            className="relative p-8 rounded-2xl bg-white border-2 border-black shadow-[4px_4px_0_#1B1B1B] animate-pulse"
          >
            <div className="w-16 h-16 bg-black/10 rounded-full mx-auto mb-4" />
            <div className="h-8 bg-black/10 rounded mb-2 w-3/4 mx-auto" />
            <div className="space-y-2 mb-6">
              <div className="h-4 bg-black/10 rounded w-full" />
              <div className="h-4 bg-black/10 rounded w-2/3 mx-auto" />
            </div>
            <div className="h-12 bg-black/10 rounded-full w-32 mx-auto" />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
