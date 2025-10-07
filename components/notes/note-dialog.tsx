"use client"

import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNoteByIdQuery } from '@/lib/queries'
import { useEffect, useState } from 'react'
import { useQuestionDialog } from './note-dialog-context'

export function QuestionDialog() {
    const { isOpen, noteId, closeDialog } = useQuestionDialog()
    const { data: note } = useNoteByIdQuery(noteId || '')
    const [content, setContent] = useState('')

    useEffect(() => {
        if (note?.content) {
            setContent(note.content)
        } else if (!isOpen) {
            // Reset content when dialog closes
            setContent('')
        }
    }, [note?.content, isOpen])

    // Reset content when noteId changes
    useEffect(() => {
        if (noteId && note) {
            setContent(note.content || '')
        }
    }, [noteId, note])

    if (!noteId) return null

    return (
        <Dialog open={isOpen} onOpenChange={closeDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{note?.title || 'Loading...'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Write your note content..."
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={closeDialog}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
