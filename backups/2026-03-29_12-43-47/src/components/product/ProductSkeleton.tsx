export function ProductSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-[3/4] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-6 bg-gray-200 rounded w-1/4 mt-2" />
      </div>
      <div className="px-3 pb-3">
        <div className="h-10 bg-gray-200 rounded-xl w-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
