"use client"

import { LazySearchBar } from '@/components/search/lazy-search-bar'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useQuickCaptureStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export function Header() {
  const router = useRouter()
  const { open } = useQuickCaptureStore()

  const onSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-[160px]">
          <Link href="/dashboard" className="font-semibold">
            Tidy Mind
          </Link>
          <nav className="hidden sm:flex items-center gap-3 text-sm text-gray-600" />
        </div>
        <div className="flex-1 flex justify-center">
          <LazySearchBar />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/favorites" className="text-sm text-gray-600 hover:underline">Favorites</Link>
          <Link href="/tags" className="text-sm text-gray-600 hover:underline">Tags</Link>
          <Button
            variant="outline"
            size="sm"
            onClick={open}
            className="flex items-center gap-1"
            title="Quick Capture (⌘K)"
          >
            <Plus className="h-4 w-4" />
            Quick Capture
          </Button>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </header>
  )
}


