"use client"

import { BackToFolders } from '@/components/layout/back-to-folders'
import { useNotesByTagQuery } from '@/lib/queries'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function TagNotesPage() {
    const params = useParams()
    const tag = params.tag as string
    const decodedTag = decodeURIComponent(tag)
    const { data: notes, isLoading, isError, error } = useNotesByTagQuery(decodedTag)

    if (isLoading) return <div className="p-6">Loading notes…</div>
    if (isError) return <div className="p-6 text-red-600">{(error as Error).message ?? 'Failed to load notes'}</div>

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <BackToFolders />
                <div>
                    <h1 className="text-2xl font-semibold">Notes tagged &quot;{decodedTag}&quot;</h1>
                    <p className="text-muted-foreground">
                        {notes?.length ?? 0} note{notes?.length === 1 ? '' : 's'} found
                    </p>
                </div>
            </div>

            {!notes || notes.length === 0 ? (
                <div className="text-sm text-gray-600">No notes found with this tag.</div>
            ) : (
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div key={note.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <Link href={`/folder/${note.folder_id}?note=${note.id}`} className="block">
                                <div className="font-medium mb-1">{note.title}</div>
                                <div className="text-sm text-muted-foreground">in {note.folder_name}</div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
