"use client"

import { Button } from '@/components/ui/button'
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { useDeleteNoteMutation, useNoteByIdQuery, useUpdateNoteMutation } from '@/lib/queries'
import { useDashboardStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { ArrowLeft, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AllVersionsDisplay } from './all-versions-display'
import { Backlinks } from './backlinks'

export function NoteContent({ folderId, noteId }: { folderId: string; noteId: string }) {
    const { data: note, isLoading, isError, error } = useNoteByIdQuery(noteId)
    const { mutateAsync, isPending } = useUpdateNoteMutation(folderId)
    const deleteNote = useDeleteNoteMutation(folderId)
    const { setActiveNoteId } = useDashboardStore()
    const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false)

    if (!noteId) {
        return (
            <div className="p-6 flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                    <p className="text-lg">Select a note from the left or create a new one.</p>
                </div>
            </div>
        )
    }

    if (isLoading) return <div className="p-6">Loading…</div>
    if (isError) return <div className="p-6 text-red-600">{(error as Error).message ?? 'Failed to load note'}</div>
    if (!note) return <div className="p-6">Not found</div>

    const toggleFavorite = async () => {
        await mutateAsync({ id: noteId, favorite: !note?.favorite })
    }

    const handleDeleteNote = async () => {
        try {
            await deleteNote.mutateAsync(noteId)
            setDeleteNoteDialogOpen(false)
            setActiveNoteId(null)
        } catch (error) {
            toast.error('Failed to delete note')
            console.error('Delete note error:', error)
        }
    }


    return (
        <div className="p-6 space-y-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Back button for mobile/tablet */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveNoteId(null)}
                        className="md:hidden"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-xl font-semibold truncate min-w-0" title={note.title}>{note.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteNoteDialogOpen(true)}
                        className="gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleFavorite}
                        disabled={isPending}
                        title={note?.favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                        <Star className={cn("h-5 w-5", note?.favorite ? "text-yellow-500 fill-current" : "text-gray-400")} />
                    </Button>
                </div>
            </div>

            <AllVersionsDisplay
                noteId={noteId}
                noteTitle={note.title}
            />
            <Backlinks noteId={noteId} />

            <DeleteConfirmationDialog
                isOpen={deleteNoteDialogOpen}
                onClose={() => {
                    setDeleteNoteDialogOpen(false)
                    // Force focus back to document body to prevent modal overlay issues
                    setTimeout(() => {
                        document.body.focus()
                    }, 100)
                }}
                onConfirm={handleDeleteNote}
                title="Delete Note"
                description="Are you sure you want to delete this entire note? This will permanently delete the note and all its versions."
                itemName={note.title}
                isLoading={deleteNote.isPending}
            />
        </div>
    )
}
