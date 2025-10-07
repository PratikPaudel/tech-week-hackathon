"use client"

import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export function BackToFolders() {
    return (
        <div className="mb-4">
            <Button asChild variant="ghost" size="sm" className="pl-2">
                <Link href="/dashboard" aria-label="Back to folders">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Folders
                </Link>
            </Button>
        </div>
    )
}


