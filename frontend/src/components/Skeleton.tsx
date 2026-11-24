interface SkeletonProps {
    className?: string
}

/** Bloco base com shimmer. Use para montar placeholders que espelham o conteúdo real. */
export function Skeleton({ className = '' }: SkeletonProps) {
    return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
}

/** Placeholder fiel ao SpaceCard: mesma moldura, proporção de imagem e blocos de texto. */
export function SpaceCardSkeleton() {
    return (
        <div className="flex w-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-1 flex-col p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-24" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <div className="mt-3 flex gap-1.5">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="mt-auto h-5 w-28 pt-4" />
            </div>
        </div>
    )
}

/** Placeholder fiel ao card de reserva em MyBookings. */
export function BookingCardSkeleton() {
    return (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
        </div>
    )
}
