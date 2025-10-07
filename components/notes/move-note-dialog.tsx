"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useFoldersQuery, useMoveNoteMutation } from '@/lib/queries'
import { useState } from 'react'

export function MoveNoteDialog({ noteId, currentFolderId }: { noteId: string; currentFolderId: string }) {
    const { data: folders, isLoading } = useFoldersQuery()
    const move = useMoveNoteMutation(currentFolderId)
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<string>(currentFolderId)

    const onConfirm = () => {
        if (!selected || selected === currentFolderId) {
            setOpen(false)
            return
        }
        move.mutate({ id: noteId, toFolderId: selected })
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <span>Move</span>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move note to…</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 max-h-80 overflow-auto">
                    {isLoading ? (
                        <div className="text-sm text-gray-600">Loading folders…</div>
                    ) : (
                        <ul className="space-y-2">
                            {folders?.map((f) => (
                                <li key={f.id} className="flex items-center gap-2">
                                    <input
                                        id={`folder-${f.id}`}
                                        type="radio"
                                        name="move-folder"
                                        checked={selected === f.id}
                                        onChange={() => setSelected(f.id)}
                                    />
                                    <label htmlFor={`folder-${f.id}`} className="text-sm cursor-pointer">{f.name}</label>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button size="sm" onClick={onConfirm} disabled={move.isPending || selected === currentFolderId}>
                        {move.isPending ? 'Moving…' : 'Move'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}


