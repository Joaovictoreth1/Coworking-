interface SkeletonProps {
    className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return <div className={`animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded-lg ${className}`} />
}

export function SpaceCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm flex flex-col">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-9 w-20 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function BookingCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
        </div>
    )
}
