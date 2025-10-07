"use client"

import { MoveNoteDialog } from '@/components/notes/move-note-dialog'
import { TagsInput } from '@/components/notes/tags-input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useBumpNoteMutation, useMoveNoteMutation, useNotesByFolderQuery, useReorderNotesMutation, useUpdateNoteMutation } from '@/lib/queries'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MoreHorizontal } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SortableItem({ id, children }: { id: string; children: (listeners: any) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            {children(listeners)}
        </div>
    )
}

export function NoteList({ folderId, activeNoteId }: { folderId: string; activeNoteId?: string | null }) {
    const { data, isLoading, isError, error } = useNotesByFolderQuery(folderId)
    const update = useUpdateNoteMutation(folderId)
    // Prepare move mutation via dialog; keep instance for types
    useMoveNoteMutation(folderId)
    const bump = useBumpNoteMutation(folderId)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState('')
    // tags input handled by TagsInput component
    const reorder = useReorderNotesMutation(folderId)
    const [localOrder, setLocalOrder] = useState<string[] | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    const sensors = useSensors(useSensor(PointerSensor))

    const handleSelectNote = (noteId: string) => {
        router.push(`${pathname}?note=${noteId}`)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = ordered.findIndex((n) => n.id === active.id)
            const newIndex = ordered.findIndex((n) => n.id === over.id)

            const newOrder = [...ordered.map((n) => n.id)]
            const [movedItem] = newOrder.splice(oldIndex, 1)
            newOrder.splice(newIndex, 0, movedItem)

            setLocalOrder(newOrder)
            reorder.mutate({ orderedIds: newOrder })
        }
    }

    type NoteItem = {
        id: string
        folder_id: string
        title: string
        content: string | null
        created_at: string
        updated_at: string
        tags: string[]
        favorite: boolean
        order_index: number | null
    }

    const ordered = useMemo((): NoteItem[] => {
        if (!data) return []
        if (!localOrder) return data as NoteItem[]
        const map = new Map(data.map((n) => [n.id, n as NoteItem]))
        return localOrder
            .map((id) => map.get(id))
            .filter((x): x is NoteItem => Boolean(x))
    }, [data, localOrder])

    if (isLoading) return <div>Loading…</div>
    if (isError) return <div className="text-red-600">{(error as Error).message ?? 'Failed to load notes'}</div>
    if (!data || data.length === 0) return <div className="text-sm text-gray-600">No notes yet.</div>

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={ordered.map(n => n.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                    {ordered.map((n) => (
                        <SortableItem key={n.id} id={n.id}>
                            {(listeners) => (
                                <li
                                    className={`p-3 border rounded cursor-pointer transition-colors ${n.id === activeNoteId ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                                    onClick={(e) => {
                                        // Don't select if clicking on interactive elements
                                        if (
                                            editingId === n.id ||
                                            (e.target as HTMLElement).closest('button') ||
                                            (e.target as HTMLElement).closest('input') ||
                                            (e.target as HTMLElement).closest('[role="combobox"]')
                                        ) {
                                            return;
                                        }
                                        handleSelectNote(n.id);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            <div {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
                                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                {editingId === n.id ? (
                                                    <input
                                                        className="w-full border rounded px-2 py-1 text-sm"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                update.mutate({ id: n.id, title: editText })
                                                                setEditingId(null)
                                                            }
                                                            if (e.key === 'Escape') setEditingId(null)
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="block font-medium truncate" title={n.title}>
                                                        {n.title}
                                                    </div>
                                                )}
                                                <div className="mt-1">
                                                    <TagsInput
                                                        value={n.tags ?? []}
                                                        onChange={(next) => update.mutate({ id: n.id, tags: next })}
                                                    />
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {n.content ? 'Has content' : 'No content yet'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={n.favorite ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    update.mutate({ id: n.id, favorite: !(n.favorite ?? false) });
                                                }}
                                            >
                                                {n.favorite ? '★' : '☆'}
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-8 h-8 p-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingId(n.id)
                                                            setEditText(n.title)
                                                        }}
                                                    >
                                                        Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => bump.mutate({ id: n.id })}>
                                                        Bump
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <MoveNoteDialog noteId={n.id} currentFolderId={folderId} />
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </li>
                            )}
                        </SortableItem>
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    )
}


