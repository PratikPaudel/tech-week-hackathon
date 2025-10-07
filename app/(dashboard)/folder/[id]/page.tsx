"use client"

import { FolderActions } from '@/components/folders/folder-actions'
import { BackToFolders } from '@/components/layout/back-to-folders'
import { AddNoteForm } from '@/components/notes/add-note-form'
import { NoteContent } from '@/components/notes/note-content'
import { NoteList } from '@/components/notes/note-list'
import { useFolderByIdQuery, useNotesByFolderQuery } from '@/lib/queries'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, use as usePromise } from 'react'

export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: folderId } = usePromise(params)
    const { data: folder, isLoading, isError, error } = useFolderByIdQuery(folderId)
    const { data: notes } = useNotesByFolderQuery(folderId)
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()

    const activeNoteId = searchParams.get('note')

    // Auto-select first note if no note is selected but notes exist
    useEffect(() => {
        if (notes && notes.length > 0 && !activeNoteId) {
            router.replace(`${pathname}?note=${notes[0].id}`)
        }
    }, [notes, activeNoteId, router, pathname])

    if (isLoading) return <div className="p-6">Loading…</div>
    if (isError) return <div className="p-6 text-red-600">{(error as Error).message ?? 'Failed to load folder'}</div>
    if (!folder) return <div className="p-6">Not found</div>

    return (
        <div className="flex h-[calc(100vh-3.5rem)]">
            {/* Left Pane - The Index */}
            <div className="w-1/3 border-r overflow-y-auto">
                <div className="p-6 space-y-4">
                    <BackToFolders />
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold">{folder.name}</h1>
                            {folder.description ? (
                                <p className="text-sm text-gray-600 mt-1">{folder.description}</p>
                            ) : null}
                        </div>
                        <FolderActions folderId={folderId} archivedAt={(folder as { archived_at?: string | null }).archived_at ?? null} />
                    </div>
                    <AddNoteForm folderId={folderId} />
                    <NoteList folderId={folderId} activeNoteId={activeNoteId} />
                </div>
            </div>

            {/* Right Pane - The Content */}
            <div className="flex-1 overflow-y-auto">
                {activeNoteId ? (
                    <NoteContent folderId={folderId} noteId={activeNoteId} />
                ) : (
                    <div className="grid h-full place-items-center">
                        <p className="text-muted-foreground">Select a note to view its content.</p>
                    </div>
                )}
            </div>
        </div>
    )
}


