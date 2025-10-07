"use client";

import { AddNoteForm } from '@/components/notes/add-note-form';
import { useNotesByFolderQuery, useReorderNotesMutation, useUpdateNoteMutation } from '@/lib/queries';
import { useDashboardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical, MoreHorizontal, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface NoteType {
    id: string;
    title: string;
    content?: string | null;
    created_at: string;
    updated_at: string;
    tags: string[];
    favorite: boolean;
    order_index: number | null;
    folder_name: string;
    version_count?: number;
    has_multiple_versions?: boolean;
    current_version_label?: string | null;
    current_version_description?: string | null;
}

function SortableNoteItem({ note, isActive, onSelect, editingId, setEditingId, editText, setEditText, onRename }: {
    note: NoteType;
    isActive: boolean;
    onSelect: () => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    editText: string;
    setEditText: (text: string) => void;
    onRename: (id: string, title: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-1 min-w-0">
            <div {...listeners} className="cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div
                className={cn(
                    "flex-1 p-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between min-w-0",
                    isActive
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "hover:bg-muted text-foreground"
                )}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {editingId === note.id ? (
                        <input
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onRename(note.id, editText)
                                    setEditingId(null)
                                }
                                if (e.key === 'Escape') setEditingId(null)
                            }}
                            onBlur={() => {
                                onRename(note.id, editText)
                                setEditingId(null)
                            }}
                            autoFocus
                        />
                    ) : (
                        <button
                            onClick={onSelect}
                            className="flex-1 text-left min-w-0"
                        >
                            <span
                                className="truncate block"
                                title={note.title}
                            >
                                {note.title}
                            </span>
                        </button>
                    )}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => {
                            setEditingId(note.id)
                            setEditText(note.title)
                        }}
                        className="gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function SortableNoteList({ folderId }: { folderId: string }) {
    const { data, isLoading } = useNotesByFolderQuery(folderId);
    const { activeNoteId, setActiveNoteId } = useDashboardStore();
    const reorderNotes = useReorderNotesMutation(folderId);
    const updateNote = useUpdateNoteMutation(folderId);
    const [localOrder, setLocalOrder] = useState<string[] | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const notes = useMemo(() => {
        if (!data) return [];
        
        if (!localOrder) return data;
        
        const noteMap = new Map(data.filter(n => n?.id).map(n => [n.id, n] as [string, NoteType]));
        return localOrder
            .map(id => noteMap.get(id))
            .filter((n): n is NoteType => Boolean(n));
    }, [data, localOrder]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = notes.findIndex((n) => n?.id === active.id);
            const newIndex = notes.findIndex((n) => n?.id === over.id);

            const newOrder = [...notes.map((n) => n?.id).filter(Boolean)];
            const [movedItem] = newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, movedItem);

            setLocalOrder(newOrder);
            reorderNotes.mutate({ orderedIds: newOrder });
        }
    };

    const handleRenameNote = (id: string, title: string) => {
        if (title.trim() && title !== notes.find(n => n.id === id)?.title) {
            updateNote.mutate({ id, title: title.trim() });
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Notes</h2>
                <div className="text-xs text-muted-foreground">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </div>
            </div>
            <div className="mb-4">
                <AddNoteForm folderId={folderId} />
            </div>
            {isLoading && <p className="text-sm text-muted-foreground">Loading notes...</p>}
            {!isLoading && notes.length === 0 && (
                <div className="text-center text-muted-foreground py-8 px-4">
                    <p className="text-sm leading-relaxed">No notes in this folder yet. Create your first note using the form above.</p>
                </div>
            )}
            {!isLoading && notes.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={notes.map(n => n?.id).filter(Boolean)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-1">
                            {notes.map((note) => note && (
                                <SortableNoteItem
                                    key={note.id}
                                    note={note}
                                    isActive={activeNoteId === note.id}
                                    onSelect={() => setActiveNoteId(note.id)}
                                    editingId={editingId}
                                    setEditingId={setEditingId}
                                    editText={editText}
                                    setEditText={setEditText}
                                    onRename={handleRenameNote}
                                />
                            )).filter(Boolean)}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}