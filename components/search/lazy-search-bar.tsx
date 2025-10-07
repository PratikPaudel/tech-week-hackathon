"use client"

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load the search bar component
const SearchBar = dynamic(() => import('./search-bar').then(mod => ({ default: mod.SearchBar })), {
    loading: () => <SearchBarSkeleton />,
    ssr: false, // Disable SSR for the search component since it uses Web Workers
})

// Skeleton component for loading state
function SearchBarSkeleton() {
    return (
        <div className="relative w-full max-w-xl">
            <div className="relative flex items-center gap-2">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 bg-gray-300 rounded animate-pulse" />
                <div className="w-full h-11 bg-gray-200 rounded-full animate-pulse" />
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
        </div>
    )
}

export function LazySearchBar() {
    return (
        <Suspense fallback={<SearchBarSkeleton />}>
            <SearchBar />
        </Suspense>
    )
}
