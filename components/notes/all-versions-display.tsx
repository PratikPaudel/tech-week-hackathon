"use client";

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNoteVersionsQuery, useDeleteVersionMutation, useArchiveVersionMutation, useUpdateVersionMutation } from '@/lib/queries';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Copy, Star, Edit, Trash2, MoreHorizontal, Archive, StarIcon } from 'lucide-react';
import { AddVersionForm } from './add-version-form';
import { EditVersionForm } from './edit-version-form';
import { EnhancedTagsInput } from './enhanced-tags-input';
import { DeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { toast } from 'sonner';
import { useState } from 'react';

interface AllVersionsDisplayProps {
    noteId: string;
    noteTitle: string;
}

export function AllVersionsDisplay({ noteId, noteTitle }: AllVersionsDisplayProps) {
    const { data: versions, isLoading, refetch } = useNoteVersionsQuery(noteId);
    const deleteVersion = useDeleteVersionMutation(noteId);
    const archiveVersion = useArchiveVersionMutation(noteId);
    const updateVersion = useUpdateVersionMutation(noteId);
    const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [versionToDelete, setVersionToDelete] = useState<{id: string; label?: string} | null>(null);

    const copyToClipboard = async (content: string, versionLabel?: string) => {
        try {
            await navigator.clipboard.writeText(content.replace(/<[^>]*>/g, ''));
            toast.success(`Copied ${versionLabel || 'content'} to clipboard`);
        } catch {
            toast.error('Failed to copy to clipboard');
        }
    };

    const openDeleteDialog = (versionId: string, versionLabel?: string) => {
        setVersionToDelete({ id: versionId, label: versionLabel });
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!versionToDelete) return;

        try {
            await deleteVersion.mutateAsync({ id: versionToDelete.id });
            toast.success('Version deleted successfully');
            setDeleteDialogOpen(false);
            setVersionToDelete(null);
            refetch();
        } catch (_error) {
            toast.error('Failed to delete version');
            console.error('Delete version error:', _error);
        }
    };

    const handleEditSuccess = () => {
        setEditingVersionId(null);
        refetch();
    };

    const handleArchiveVersion = async (versionId: string) => {
        try {
            await archiveVersion.mutateAsync({ id: versionId, archived: true });
            refetch();
        } catch (_error) {
            console.error('Archive version error:', _error);
        }
    };

    const handleMakeDefault = async (versionId: string) => {
        try {
            await updateVersion.mutateAsync({ id: versionId, is_default: true });
            toast.success('Version set as default');
            refetch();
        } catch (_error) {
            toast.error('Failed to set as default version');
            console.error('Set default version error:', _error);
        }
    };


    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading versions...</div>;
    }

    if (!versions) {
        return (
            <div className="space-y-4">
                <AddVersionForm
                    noteId={noteId}
                    onSuccess={() => refetch()}
                />
            </div>
        );
    }

    // Sort versions: default first, then current, then by newest
    const sortedVersions = [...versions].sort((a, b) => {
        if (a.is_default) return -1;
        if (b.is_default) return 1;
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="space-y-6">
            <div>
                <AddVersionForm
                    noteId={noteId}
                    onSuccess={() => refetch()}
                />
            </div>
            
            {sortedVersions.map((version) => (
                <div 
                    key={version.id}
                    className={`rounded-lg border p-4 ${
                        version.is_current 
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                            : 'bg-card'
                    }`}
                >
                    {/* Version Header - Just actions and default indicator */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                            {/* Show version label only if it exists, is not empty, and is different from note title */}
                            {version.version_label &&
                             version.version_label.trim() &&
                             version.version_label !== noteTitle &&
                             version.version_label !== 'Quick Capture' &&
                             version.version_label !== version.version_description && (
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    {version.version_label}
                                </h4>
                            )}
                            {version.version_description &&
                             version.version_description.trim() &&
                             version.version_description !== 'Created via Quick Capture' &&
                             version.version_description !== noteTitle && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {version.version_description}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                            {/* Default indicator in top right */}
                            {version.is_default && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-xs text-amber-700 dark:text-amber-500 mr-2">
                                    <Star className="h-3 w-3 fill-amber-600 dark:fill-amber-500" />
                                    Default
                                </span>
                            )}
                            
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingVersionId(version.id)}
                                title="Edit Version"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            
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
                                        onClick={() => openDeleteDialog(version.id, version.version_label)}
                                        className="gap-2 text-red-600 focus:text-red-600"
                                        disabled={deleteVersion.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete Version
                                    </DropdownMenuItem>
                                    {!version.is_default && (
                                        <DropdownMenuItem
                                            onClick={() => handleMakeDefault(version.id)}
                                            className="gap-2"
                                        >
                                            <StarIcon className="h-4 w-4" />
                                            Make this the default version
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => handleArchiveVersion(version.id)}
                                        className="gap-2"
                                        disabled={archiveVersion.isPending}
                                    >
                                        <Archive className="h-4 w-4" />
                                        Archive Version
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    
                    {/* Version Content or Edit Form */}
                    {editingVersionId === version.id ? (
                        <EditVersionForm
                            version={version}
                            noteId={noteId}
                            onCancel={() => setEditingVersionId(null)}
                            onSuccess={handleEditSuccess}
                        />
                    ) : (
                        <div className="space-y-3">
                            {/* Answer Content */}
                            <div className="prose prose-sm max-w-none">
                                <div className="relative group">
                                    <div 
                                        className="text-sm leading-relaxed bg-background/50 rounded p-3 border min-h-[60px]"
                                        dangerouslySetInnerHTML={{ __html: version.content }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(version.content, version.version_label)}
                                        className="absolute top-2 right-2 gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Tags below content - smaller */}
                            <div className="mt-2">
                                <div className="scale-90 origin-left">
                                    <EnhancedTagsInput
                                        value={version.version_tags || []}
                                        onChange={async (newTags) => {
                                            try {
                                                await updateVersion.mutateAsync({ 
                                                    id: version.id, 
                                                    version_tags: newTags 
                                                });
                                                toast.success('Tags updated');
                                                refetch();
                                            } catch {
                                                toast.error('Failed to update tags');
                                            }
                                        }}
                                        editable={true}
                                        placeholder="Add tag"
                                    />
                                </div>
                            </div>
                            
                            {/* Simple metadata at bottom */}
                            <div className="flex items-center justify-end text-xs text-muted-foreground pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                    </span>
                                    <span>
                                        {version.content_length ? `${version.content_length.toLocaleString()} chars` : 'No content'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            
            <DeleteConfirmationDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setVersionToDelete(null);
                    // Force focus back to document body to prevent modal overlay issues
                    setTimeout(() => {
                        document.body.focus()
                    }, 100)
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Version"
                description="Are you sure you want to delete this version?"
                itemName={versionToDelete?.label || 'Untitled'}
                isLoading={deleteVersion.isPending}
            />
            
        </div>
    );
}