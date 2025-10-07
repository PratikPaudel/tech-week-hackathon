"use client"

import { useAuth } from '@/components/auth/auth-provider'
import { AppHeader } from '@/components/layout/app-header'
import { TidyMindSidebar } from '@/components/layout/tidy-mind-sidebar'
import { EnhancedQuickCaptureModal } from '@/components/quick-add/enhanced-quick-add-modal'
import { useQuickCaptureStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth()
    const router = useRouter()
    const { open } = useQuickCaptureStore()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    // Keyboard shortcut for Quick Capture (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault()
                open()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open])

    if (loading) return <div className="p-6">Loading…</div>
    if (!user) return null

    return (
        <div className="h-screen bg-background transition-colors duration-200">
            <AppHeader />
            <div className="flex h-full pt-16">
                <TidyMindSidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
            <EnhancedQuickCaptureModal />
        </div>
    )
}


