"use client";

import { CreateFolderDialog } from '@/components/folders/create-folder-dialog';
import { useFoldersQuery, useReorderFoldersMutation, useDeleteFolderMutation, useUpdateFolderMutation } from '@/lib/queries';
import { useDashboardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, GripVertical, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';

interface FolderType {
    id: string;
    name: string;
    question_count: number;
    parent_folder_id?: string | null;
}

function SortableFolderItem({ folder, isActive, onSelect, onDelete, editingId, setEditingId, editText, setEditText, onRename }: {
    folder: FolderType;
    isActive: boolean;
    onSelect: () => void;
    onDelete: (folder: FolderType) => void;
    editingId: string | null;
    setEditingId: (id: string | null) => void;
    editText: string;
    setEditText: (text: string) => void;
    onRename: (id: string, name: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-1">
            <div {...listeners} className="cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div
                onClick={editingId === folder.id ? undefined : onSelect}
                className={cn(
                    "flex-1 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 min-w-0 cursor-pointer",
                    isActive
                        ? "bg-primary/10 border border-primary/20 text-primary"
                        : "hover:bg-muted text-foreground"
                )}
            >
                <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                {editingId === folder.id ? (
                    <input
                        className="flex-1 border rounded px-2 py-1 text-sm"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onRename(folder.id, editText)
                                setEditingId(null)
                            }
                            if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => {
                            onRename(folder.id, editText)
                            setEditingId(null)
                        }}
                        autoFocus
                    />
                ) : (
                    <>
                        <span className="truncate flex-1" title={folder.name}>{folder.name}</span>
                        {folder.question_count > 0 && (
                            <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                                {folder.question_count}
                            </span>
                        )}
                    </>
                )}
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
                            setEditingId(folder.id)
                            setEditText(folder.name)
                        }}
                        className="gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onDelete(folder)}
                        className="gap-2 text-red-600 focus:text-red-600"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Folder
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function SortableFolderList() {
    const { data, isLoading } = useFoldersQuery();
    const { activeFolderId, setActiveFolderId } = useDashboardStore();
    const reorderFolders = useReorderFoldersMutation();
    const deleteFolder = useDeleteFolderMutation();
    const updateFolder = useUpdateFolderMutation();
    const [localOrder, setLocalOrder] = useState<string[] | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10,
                delay: 100,
                tolerance: 5,
            },
        })
    );

    const folders = useMemo(() => {
        if (!data) return [];
        const topLevelFolders = data.filter(f => !f?.parent_folder_id);
        
        if (!localOrder) return topLevelFolders;
        
        const folderMap = new Map(topLevelFolders.filter(f => f?.id).map(f => [f.id, f] as [string, FolderType]));
        return localOrder
            .map(id => folderMap.get(id))
            .filter((f): f is FolderType => Boolean(f));
    }, [data, localOrder]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = folders.findIndex((f) => f?.id === active.id);
            const newIndex = folders.findIndex((f) => f?.id === over.id);

            const newOrder = [...folders.map((f) => f?.id).filter(Boolean)];
            const [movedItem] = newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, movedItem);

            setLocalOrder(newOrder);
            reorderFolders.mutate({ orderedIds: newOrder });
        }
    };

    const handleDeleteFolder = (folder: FolderType) => {
        setFolderToDelete(folder);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!folderToDelete?.id) return;

        try {
            await deleteFolder.mutateAsync(folderToDelete.id);
            if (activeFolderId === folderToDelete?.id) {
                setActiveFolderId(null);
            }
            setDeleteDialogOpen(false);
            setFolderToDelete(null);
        } catch (error) {
            console.error('Delete folder error:', error);
        }
    };

    const handleRenameFolder = (id: string, name: string) => {
        if (name.trim() && name !== folders.find(f => f.id === id)?.name) {
            updateFolder.mutate({ id, name: name.trim() });
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Folders</h2>
                    <div className="text-xs text-muted-foreground">
                        {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
                    </div>
                </div>
                <CreateFolderDialog />
            </div>
            {isLoading && <p>Loading folders...</p>}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={folders.map(f => f?.id).filter(Boolean)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1">
                        {folders.map((folder) => folder && (
                            <SortableFolderItem
                                key={folder.id}
                                folder={folder}
                                isActive={activeFolderId === folder.id}
                                onSelect={() => setActiveFolderId(folder.id)}
                                onDelete={handleDeleteFolder}
                                editingId={editingId}
                                setEditingId={setEditingId}
                                editText={editText}
                                setEditText={setEditText}
                                onRename={handleRenameFolder}
                            />
                        )).filter(Boolean)}
                    </div>
                </SortableContext>
            </DndContext>
            
            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setFolderToDelete(null);
                    // Force focus back to document body to prevent modal overlay issues
                    setTimeout(() => {
                        document.body.focus()
                    }, 100)
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Folder"
                description={`Are you sure you want to delete this folder? This will permanently delete the folder and all ${folderToDelete?.question_count || 0} note(s) with all their versions.`}
                itemName={folderToDelete?.name || 'Untitled Folder'}
                isLoading={deleteFolder.isPending}
            />
        </div>
    );
}