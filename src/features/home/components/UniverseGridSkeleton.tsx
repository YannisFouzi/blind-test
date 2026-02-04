"use client";

const SKELETON_ITEMS = Array.from({ length: 6 }, (_, index) => `universe-skeleton-${index}`);

export function UniverseGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_minmax(0,6rem)] gap-4 md:gap-6 md:gap-8 max-w-6xl mx-auto">
      {SKELETON_ITEMS.map((key) => (
        <div
          key={key}
          className="h-[280px] flex flex-col items-center justify-center gap-3 p-5 md:p-6 rounded-3xl border-2 border-black bg-white/70 shadow-[4px_4px_0_#1B1B1B] animate-pulse"
          aria-hidden="true"
        >
          <div className="h-6 w-32 bg-black/10 rounded-md" />
          <div className="h-8 w-28 bg-black/10 rounded-full" />
          <div className="h-8 w-28 bg-black/10 rounded-full" />
        </div>
      ))}
    </div>
  );
}
