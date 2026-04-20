// smartProduct/ResultSkeleton.tsx
// Grid de 8 tarjetas esqueleto durante `searching`. El shimmer se consigue
// con la utilidad animate-pulse de Tailwind — no hace falta CSS custom.

export function ResultSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white"
        >
          <div className="h-32 bg-gray-100" />
          <div className="flex flex-1 flex-col gap-2 p-3">
            <div className="flex gap-1.5">
              <div className="h-4 w-14 rounded-full bg-gray-100" />
              <div className="h-4 w-12 rounded-full bg-gray-100" />
            </div>
            <div className="h-3.5 w-4/5 rounded bg-gray-200" />
            <div className="h-3 w-3/5 rounded bg-gray-100" />
            <div className="mt-auto flex gap-1">
              <div className="h-3 w-10 rounded bg-gray-100" />
              <div className="h-3 w-8 rounded bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
