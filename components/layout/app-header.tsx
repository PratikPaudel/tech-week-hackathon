"use client"

import { LazySearchBar } from '@/components/search/lazy-search-bar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useQuickCaptureStore } from '@/lib/store'
import { Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function AppHeader() {
    const { open } = useQuickCaptureStore()

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 transition-colors duration-200">
            <div className="h-full px-4 flex items-center gap-4">
                {/* Logo - Left Side */}
                <div className="flex items-center gap-2 min-w-[200px]">
                    <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                        <Image
                            src="/tidy-mind-logo.png"
                            alt="Tidy Mind"
                            width={150}
                            height={150}
                            className="rounded"
                        />
                    </Link>
                </div>

                {/* Search Bar with integrated Filter - Center */}
                <div className="flex-1 flex justify-center max-w-3xl mx-auto">
                    <div className="w-full max-w-xl">
                        <LazySearchBar />
                    </div>
                </div>

                {/* Action Buttons - Right Side */}
                <div className="flex items-center gap-2 min-w-[200px] justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={open}
                        className="flex items-center gap-1"
                        title="Quick Capture (⌘K)"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Quick Capture</span>
                    </Button>
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}